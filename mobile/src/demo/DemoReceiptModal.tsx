import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { X, Upload, Check } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { CompanyLogo } from '@/components/ui'
import { RECEIPT_ITEMS, RECEIPT_TOTAL, buildReceiptAllocations } from '@/demo/demoData'
import { formatCurrency } from '@/utils/format'

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'completed'

const STEP_LABELS = ['Upload', 'Extract', 'Analyze', 'Complete']

export function DemoReceiptModal({
  visible,
  onClose,
  roundUpAmount,
  onComplete,
}: {
  visible: boolean
  onClose: () => void
  roundUpAmount: number
  onComplete: () => void
}) {
  const { colors, brand } = useTheme()
  const [step, setStep] = useState<ProcessingStep>('idle')

  useEffect(() => {
    if (!visible) setStep('idle')
  }, [visible])

  const startProcessing = useCallback(() => {
    setStep('uploading')
    setTimeout(() => {
      setStep('extracting')
      setTimeout(() => {
        setStep('analyzing')
        setTimeout(() => {
          setStep('completed')
        }, 1500)
      }, 2000)
    }, 1500)
  }, [])

  const handleConfirm = () => {
    onComplete()
    onClose()
  }

  const allocations = buildReceiptAllocations(roundUpAmount)
  const stepIdx = step === 'uploading' ? 0 : step === 'extracting' ? 1 : step === 'analyzing' ? 2 : 3

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Smart Receipt Processing
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* IDLE — Upload button */}
            {step === 'idle' && (
              <>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                  Upload your receipt and let AI invest your round-up across relevant stocks
                </Text>

                <Pressable
                  onPress={startProcessing}
                  style={[styles.dropzone, { borderColor: `${brand.purple}4D`, backgroundColor: `${brand.purple}0A` }]}
                >
                  <View style={[styles.uploadIcon, { backgroundColor: `${brand.purple}26` }]}>
                    <Upload size={24} color={brand.purple} />
                  </View>
                  <Text style={[styles.dropzoneTitle, { color: colors.textPrimary }]}>
                    Upload Receipt or Invoice
                  </Text>
                  <Text style={[styles.dropzoneHint, { color: colors.textMuted }]}>
                    Tap here to simulate a receipt upload
                  </Text>
                </Pressable>

                <View style={[styles.howItWorks, { backgroundColor: `${brand.purple}0F`, borderColor: `${brand.purple}1A` }]}>
                  <Text style={[styles.howTitle, { color: colors.textPrimary }]}>How it works:</Text>
                  {[
                    '1. Upload your receipt (PDF, JPG, PNG)',
                    '2. AI extracts items, brands, and amounts',
                    '3. System identifies relevant stocks',
                    '4. Round-up allocated across all relevant stocks',
                    '5. Confirm to execute the investment',
                  ].map(line => (
                    <Text key={line} style={[styles.howStep, { color: colors.textSecondary }]}>{line}</Text>
                  ))}
                </View>
              </>
            )}

            {/* PROCESSING */}
            {(step === 'uploading' || step === 'extracting' || step === 'analyzing') && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={brand.purple} />
                <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
                  {step === 'uploading' && 'Uploading receipt...'}
                  {step === 'extracting' && 'Extracting items with AI...'}
                  {step === 'analyzing' && 'Analyzing brands & allocation...'}
                </Text>
                <Text style={[styles.processingSub, { color: colors.textMuted }]}>
                  {step === 'uploading' && 'Saving your receipt securely'}
                  {step === 'extracting' && 'Reading your receipt and identifying items'}
                  {step === 'analyzing' && 'Mapping brands to stocks and calculating split'}
                </Text>

                {/* Step dots */}
                <View style={styles.stepDots}>
                  {STEP_LABELS.map((label, i) => {
                    const done = i < stepIdx
                    const active = i === stepIdx
                    return (
                      <View key={label} style={styles.stepDotItem}>
                        <View style={[
                          styles.dot,
                          {
                            backgroundColor: done ? '#34D399' : active ? brand.purple : 'rgba(255,255,255,0.15)',
                          },
                        ]}>
                          {done && <Check size={8} color="#fff" />}
                        </View>
                        <Text style={[styles.dotLabel, { color: active ? brand.purple : colors.textMuted }]}>
                          {label}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* COMPLETED — show results */}
            {step === 'completed' && (
              <>
                {/* Summary */}
                <View style={[styles.summaryCard, { borderColor: `${brand.purple}26`, backgroundColor: `${brand.purple}0A` }]}>
                  <View style={styles.summaryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TRANSACTION SUMMARY</Text>
                      <View style={styles.summaryMerchant}>
                        <CompanyLogo domain="walmart.com" size={24} />
                        <Text style={[styles.summaryName, { color: colors.textPrimary }]}>Walmart</Text>
                        <Text style={[styles.summaryTicker, { color: brand.purple }]}>(WMT)</Text>
                      </View>
                    </View>
                    <View style={[styles.aiBadge, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
                      <Text style={styles.aiBadgeText}>AI PROCESSED</Text>
                    </View>
                  </View>
                  <View style={styles.summaryAmounts}>
                    <View>
                      <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total Amount</Text>
                      <Text style={[styles.amountValue, { color: colors.textPrimary }]}>{formatCurrency(RECEIPT_TOTAL)}</Text>
                    </View>
                    <View>
                      <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Round-Up Investment</Text>
                      <Text style={[styles.amountValue, { color: '#34D399' }]}>{formatCurrency(roundUpAmount)}</Text>
                    </View>
                  </View>
                </View>

                {/* Items */}
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Items Purchased ({RECEIPT_ITEMS.length})
                </Text>
                <View style={[styles.itemsList, { borderColor: colors.borderSubtle }]}>
                  {RECEIPT_ITEMS.map((item, i) => (
                    <View
                      key={i}
                      style={[
                        styles.itemRow,
                        i < RECEIPT_ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
                      ]}
                    >
                      <View style={styles.itemLeft}>
                        {item.ticker ? (
                          <CompanyLogo domain={item.ticker.toLowerCase() + '.com'} size={18} />
                        ) : (
                          <View style={[styles.itemDot, { backgroundColor: colors.surfaceInput }]} />
                        )}
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.ticker ? (
                          <Text style={[styles.itemTicker, { color: brand.purple }]}>{item.ticker}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.itemAmount, { color: colors.textPrimary }]}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Allocations */}
                <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                  Investment Allocation
                </Text>
                {allocations.map(a => (
                  <View
                    key={a.ticker}
                    style={[styles.allocRow, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}
                  >
                    <CompanyLogo domain={a.ticker.toLowerCase() + '.com'} size={36} />
                    <View style={styles.allocInfo}>
                      <View style={styles.allocTopRow}>
                        <Text style={[styles.allocTicker, { color: brand.purple }]}>{a.ticker}</Text>
                        <Text style={[styles.allocStock, { color: colors.textMuted }]}>{a.stockName}</Text>
                      </View>
                      <View style={styles.allocTopRow}>
                        <Text style={[styles.allocConfidence, {
                          color: a.confidence >= 0.9 ? '#34D399' : '#FBBF24',
                          backgroundColor: a.confidence >= 0.9 ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                        }]}>
                          {a.confidence >= 0.9 ? 'High' : 'Medium'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.allocRight}>
                      <Text style={[styles.allocAmount, { color: '#34D399' }]}>{formatCurrency(a.amount)}</Text>
                      <Text style={[styles.allocPct, { color: colors.textMuted }]}>{a.percentage}%</Text>
                    </View>
                  </View>
                ))}

                {/* Confirm / New Receipt */}
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => setStep('idle')}
                    style={[styles.secondaryBtn, { borderColor: colors.borderSubtle }]}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>New Receipt</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirm}
                    style={[styles.primaryBtn, { backgroundColor: brand.purple }]}
                  >
                    <Text style={styles.primaryBtnText}>Confirm Investment</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popup: {
    width: '100%', maxWidth: 420, maxHeight: '90%',
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  body: { padding: 20 },
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center' },

  // Dropzone
  dropzone: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
    padding: 32, alignItems: 'center', marginBottom: 16,
  },
  uploadIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  dropzoneTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  dropzoneHint: { fontSize: 13 },

  // How it works
  howItWorks: { borderRadius: 12, padding: 16, borderWidth: 1 },
  howTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  howStep: { fontSize: 13, lineHeight: 20 },

  // Processing
  processingContainer: { alignItems: 'center', gap: 16, paddingVertical: 40 },
  processingTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  processingSub: { fontSize: 13, textAlign: 'center' },
  stepDots: { flexDirection: 'row', gap: 20, marginTop: 8 },
  stepDotItem: { alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dotLabel: { fontSize: 10 },

  // Summary
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  summaryMerchant: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryName: { fontSize: 16, fontWeight: '700' },
  summaryTicker: { fontSize: 13, fontWeight: '600' },
  aiBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: '#34D399', letterSpacing: 0.5 },
  summaryAmounts: { flexDirection: 'row', gap: 24 },
  amountLabel: { fontSize: 12, marginBottom: 2 },
  amountValue: { fontSize: 18, fontWeight: '700' },

  // Items
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  itemsList: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  itemDot: { width: 18, height: 18, borderRadius: 9 },
  itemName: { fontSize: 13, flex: 1 },
  itemTicker: { fontSize: 11, fontWeight: '600' },
  itemAmount: { fontSize: 13, fontWeight: '600', marginLeft: 8 },

  // Allocations
  allocRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  allocInfo: { flex: 1, gap: 2 },
  allocTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  allocTicker: { fontSize: 14, fontWeight: '700' },
  allocStock: { fontSize: 12 },
  allocConfidence: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  allocRight: { alignItems: 'flex-end' },
  allocAmount: { fontSize: 14, fontWeight: '700' },
  allocPct: { fontSize: 11 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
})
