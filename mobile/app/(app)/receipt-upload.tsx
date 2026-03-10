import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Camera, Image as ImageIcon, Check, X, Upload, ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useUserSettings } from '@/hooks/useUserSettings'
import { uploadReceipt, invokeEdge } from '@/services/api'
import { GlassCard, Button, Badge, LoadingSpinner, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'
import { formatCurrency } from '@/utils/format'

type Step = 'capture' | 'processing' | 'review' | 'confirmed'

interface ReceiptItem {
  name: string
  brand?: string
  amount: number
  quantity?: number
}

interface StockAllocation {
  ticker: string
  company_name?: string
  weight: number
  amount: number
}

interface ProcessResult {
  receipt_id: number
  store_name?: string
  total?: number
  items: ReceiptItem[]
  allocations: StockAllocation[]
}

export default function ReceiptUploadScreen() {
  const { colors, brand, status: statusColors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const { data: settings = {} } = useUserSettings(profile?.id)

  const [step, setStep] = useState<Step>('capture')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })
  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }, [])

  const aiProvider = settings['ai_vision_provider'] || undefined
  const apiKey = settings['ai_vision_api_key'] || undefined

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      setError(null)
      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          showAlert('Permission Required', 'Camera access is needed to take receipt photos.')
          return
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
        })
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
          showAlert('Permission Required', 'Photo library access is needed to select receipt images.')
          return
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
        })
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        setImageUri(asset.uri)
        processReceipt(asset.uri)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pick image')
    }
  }, [])

  const processReceipt = useCallback(async (uri: string) => {
    if (!profile?.id) {
      setError('Not authenticated')
      return
    }

    setStep('processing')
    setError(null)

    try {
      // Step 1: Upload to Supabase Storage
      const fileName = `receipt_${Date.now()}.jpg`
      const uploadResult = await uploadReceipt(
        uri,
        fileName,
        profile.id,
        aiProvider,
        apiKey,
      ) as { receipt_id: number }

      const id = uploadResult.receipt_id
      setReceiptId(id)

      // Step 2: Process with AI vision
      const processData = await invokeEdge<ProcessResult>('receipt-process', {
        receipt_id: id,
        ai_provider: aiProvider,
      })

      setProcessResult({
        receipt_id: id,
        store_name: processData.store_name,
        total: processData.total,
        items: processData.items || [],
        allocations: processData.allocations || [],
      })

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setStep('review')
    } catch (err: any) {
      setError(err.message || 'Failed to process receipt')
      setStep('capture')
    }
  }, [profile?.id, aiProvider, apiKey])

  const handleConfirm = useCallback(async () => {
    if (!receiptId) return

    setConfirming(true)
    setError(null)

    try {
      await invokeEdge('receipt-confirm', { receipt_id: receiptId })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setStep('confirmed')
    } catch (err: any) {
      setError(err.message || 'Failed to confirm receipt')
    } finally {
      setConfirming(false)
    }
  }, [receiptId])

  const handleCancel = useCallback(() => {
    showAlert(
      'Cancel Upload',
      'Are you sure you want to discard this receipt?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setStep('capture')
            setImageUri(null)
            setReceiptId(null)
            setProcessResult(null)
            setError(null)
          },
        },
      ],
    )
  }, [showAlert])

  const handleReset = useCallback(() => {
    setStep('capture')
    setImageUri(null)
    setReceiptId(null)
    setProcessResult(null)
    setError(null)
  }, [])

  // --- Render Helpers ---

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
      <Pressable
        style={styles.backBtn}
        onPress={() => {
          if (step === 'review') {
            handleCancel()
          } else {
            router.back()
          }
        }}
      >
        <ArrowLeft size={20} color={colors.textSecondary} />
        <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
        Upload Receipt
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  )

  const renderCapture = () => (
    <View style={styles.captureContainer}>
      <View style={styles.captureIllustration}>
        <View style={[styles.captureIconCircle, { backgroundColor: `${brand.purple}1A` }]}>
          <Upload size={48} color={brand.purple} />
        </View>
        <Text style={[styles.captureTitle, { color: colors.textPrimary }]}>
          Scan Your Receipt
        </Text>
        <Text style={[styles.captureSubtitle, { color: colors.textSecondary }]}>
          Take a photo or choose from your gallery.{'\n'}AI will extract items and map them to stocks.
        </Text>
      </View>

      <View style={styles.captureButtons}>
        <Pressable
          style={[
            styles.captureBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            },
          ]}
          onPress={() => pickImage('camera')}
        >
          <View style={[styles.captureBtnIcon, { backgroundColor: `${brand.purple}1A` }]}>
            <Camera size={28} color={brand.purple} />
          </View>
          <Text style={[styles.captureBtnLabel, { color: colors.textPrimary }]}>
            Take Photo
          </Text>
          <Text style={[styles.captureBtnHint, { color: colors.textMuted }]}>
            Use your camera
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.captureBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            },
          ]}
          onPress={() => pickImage('gallery')}
        >
          <View style={[styles.captureBtnIcon, { backgroundColor: `${brand.blue}1A` }]}>
            <ImageIcon size={28} color={brand.blue} />
          </View>
          <Text style={[styles.captureBtnLabel, { color: colors.textPrimary }]}>
            Choose from Gallery
          </Text>
          <Text style={[styles.captureBtnHint, { color: colors.textMuted }]}>
            Select an existing photo
          </Text>
        </Pressable>
      </View>

      {aiProvider && (
        <View style={styles.providerInfo}>
          <Badge variant="purple">{`AI: ${aiProvider}`}</Badge>
        </View>
      )}
    </View>
  )

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      {imageUri && (
        <View style={[styles.thumbnailContainer, { borderColor: colors.borderSubtle }]}>
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
        </View>
      )}
      <LoadingSpinner size={48} />
      <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
        Processing Receipt...
      </Text>
      <Text style={[styles.processingSubtitle, { color: colors.textSecondary }]}>
        AI is extracting items and mapping brands to stocks
      </Text>
    </View>
  )

  const renderReview = () => {
    if (!processResult) return null

    return (
      <ScrollView
        style={styles.reviewScroll}
        contentContainerStyle={styles.reviewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt thumbnail */}
        {imageUri && (
          <View style={[styles.reviewThumbnailWrap, { borderColor: colors.borderSubtle }]}>
            <Image source={{ uri: imageUri }} style={styles.reviewThumbnail} resizeMode="cover" />
          </View>
        )}

        {/* Store info */}
        {processResult.store_name && (
          <GlassCard padding={16} borderRadius={12} style={styles.storeCard}>
            <Text style={[styles.storeLabel, { color: colors.textSecondary }]}>Store</Text>
            <Text style={[styles.storeName, { color: colors.textPrimary }]}>
              {processResult.store_name}
            </Text>
            {processResult.total != null && (
              <Text style={[styles.storeTotal, { color: brand.purple }]}>
                Total: {formatCurrency(processResult.total)}
              </Text>
            )}
          </GlassCard>
        )}

        {/* Extracted Items */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Extracted Items ({processResult.items.length})
        </Text>
        <GlassCard padding={0} borderRadius={12} style={styles.itemsCard}>
          {processResult.items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No items extracted
              </Text>
            </View>
          ) : (
            processResult.items.map((item, idx) => {
              const isLast = idx === processResult.items.length - 1
              return (
                <View
                  key={`${item.name}-${idx}`}
                  style={[
                    styles.itemRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.brand && (
                      <Text style={[styles.itemBrand, { color: colors.textMuted }]}>
                        {item.brand}
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemRight}>
                    {item.quantity != null && item.quantity > 1 && (
                      <Text style={[styles.itemQty, { color: colors.textMuted }]}>
                        x{item.quantity}
                      </Text>
                    )}
                    <Text style={[styles.itemAmount, { color: colors.textPrimary }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                </View>
              )
            })
          )}
        </GlassCard>

        {/* Stock Allocations */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Stock Allocations ({processResult.allocations.length})
        </Text>
        <GlassCard padding={0} borderRadius={12} style={styles.allocationsCard}>
          {processResult.allocations.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No allocations generated
              </Text>
            </View>
          ) : (
            processResult.allocations.map((alloc, idx) => {
              const isLast = idx === processResult.allocations.length - 1
              const weightPercent = (alloc.weight * 100).toFixed(1)
              return (
                <View
                  key={`${alloc.ticker}-${idx}`}
                  style={[
                    styles.allocRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={[styles.allocTickerBox, { backgroundColor: `${brand.purple}1A` }]}>
                    <Text style={[styles.allocTickerText, { color: brand.purple }]}>
                      {alloc.ticker}
                    </Text>
                  </View>
                  <View style={styles.allocInfo}>
                    <Text style={[styles.allocCompany, { color: colors.textPrimary }]} numberOfLines={1}>
                      {alloc.company_name || alloc.ticker}
                    </Text>
                    <View style={styles.allocWeightRow}>
                      <View
                        style={[
                          styles.allocWeightBar,
                          { backgroundColor: colors.surfaceInput },
                        ]}
                      >
                        <View
                          style={[
                            styles.allocWeightFill,
                            {
                              width: `${Math.min(alloc.weight * 100, 100)}%`,
                              backgroundColor: brand.purple,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.allocWeightText, { color: colors.textMuted }]}>
                        {weightPercent}%
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.allocAmount, { color: statusColors.success }]}>
                    {formatCurrency(alloc.amount)}
                  </Text>
                </View>
              )
            })
          )}
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.reviewActions}>
          <Button
            onPress={handleConfirm}
            loading={confirming}
            icon={<Check size={18} color="white" />}
          >
            Confirm & Allocate
          </Button>
          <Button variant="ghost" onPress={handleCancel} icon={<X size={18} color={colors.textSecondary} />}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    )
  }

  const renderConfirmed = () => (
    <View style={styles.confirmedContainer}>
      <View style={[styles.successCircle, { backgroundColor: `${statusColors.success}1A` }]}>
        <Check size={48} color={statusColors.success} />
      </View>
      <Text style={[styles.confirmedTitle, { color: colors.textPrimary }]}>
        Receipt Confirmed!
      </Text>
      <Text style={[styles.confirmedSubtitle, { color: colors.textSecondary }]}>
        Your round-ups have been allocated to the matched stocks based on the items in your receipt.
      </Text>
      {processResult && processResult.allocations.length > 0 && (
        <View style={styles.confirmedSummary}>
          {processResult.allocations.map((alloc) => (
            <Badge key={alloc.ticker} variant="success">
              {`${alloc.ticker}: ${formatCurrency(alloc.amount)}`}
            </Badge>
          ))}
        </View>
      )}
      <View style={styles.confirmedActions}>
        <Button onPress={() => router.back()}>Done</Button>
        <Button variant="secondary" onPress={handleReset}>
          Upload Another
        </Button>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {renderHeader()}

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <X size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={14} color="#EF4444" />
          </Pressable>
        </View>
      )}

      {step === 'capture' && renderCapture()}
      {step === 'processing' && renderProcessing()}
      {step === 'review' && renderReview()}
      {step === 'confirmed' && renderConfirmed()}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 70,
  },
  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  // Step 1: Capture
  captureContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  captureIllustration: {
    alignItems: 'center',
    marginBottom: 40,
  },
  captureIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  captureTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  captureSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  captureButtons: {
    gap: 16,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  captureBtnIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  captureBtnHint: {
    fontSize: 12,
    position: 'absolute',
    bottom: 12,
    left: 92,
  },
  providerInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  // Step 2: Processing
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  thumbnailContainer: {
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  processingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Step 3: Review
  reviewScroll: {
    flex: 1,
  },
  reviewContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  reviewThumbnailWrap: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 16,
  },
  reviewThumbnail: {
    width: '100%',
    height: '100%',
  },
  storeCard: {
    marginBottom: 20,
  },
  storeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
  },
  storeTotal: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  itemsCard: {
    marginBottom: 24,
  },
  emptyItems: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemBrand: {
    fontSize: 12,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemQty: {
    fontSize: 11,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Allocations
  allocationsCard: {
    marginBottom: 28,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  allocTickerBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocTickerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  allocInfo: {
    flex: 1,
    gap: 6,
  },
  allocCompany: {
    fontSize: 14,
    fontWeight: '600',
  },
  allocWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocWeightBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  allocWeightFill: {
    height: '100%',
    borderRadius: 2,
  },
  allocWeightText: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },
  allocAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Review actions
  reviewActions: {
    gap: 12,
  },
  // Step 4: Confirmed
  confirmedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  confirmedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmedSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  confirmedActions: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
})
