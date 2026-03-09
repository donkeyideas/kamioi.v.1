import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Lightbulb,
  GitMerge,
  TrendingUp,
  ArrowUpDown,
  RefreshCw,
  ChevronRight,
  X,
} from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useTransactions } from '@/hooks/useTransactions'
import { invokeEdge } from '@/services/api'
import { supabase } from '@/lib/supabase'
import { GlassCard, Badge, LoadingSpinner, CompanyLogo } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils/format'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Recommendation {
  type: string
  title: string
  description: string
  confidence: number
}

interface SubmittedMapping {
  id: number
  merchant_name: string
  ticker: string | null
  company_name: string | null
  confidence: number | null
  status: string
  admin_approved: boolean | null
  ai_processed: boolean
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, string> = {
  saving: '#7C3AED',
  investing: '#3B82F6',
  spending: '#06B6D4',
  default: '#EC4899',
}

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.default
}

function formatMerchantName(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function merchantToDomain(merchant: string): string {
  const cleaned = merchant.toLowerCase().replace(/[^a-z0-9]/g, '')
  const domainMap: Record<string, string> = {
    apple: 'apple.com', amazon: 'amazon.com', starbucks: 'starbucks.com',
    walmart: 'walmart.com', target: 'target.com', mcdonalds: 'mcdonalds.com',
    nike: 'nike.com', costco: 'costco.com', netflix: 'netflix.com',
    uber: 'uber.com', lyft: 'lyft.com',
  }
  for (const [key, domain] of Object.entries(domainMap)) {
    if (cleaned.includes(key)) return domain
  }
  return `${cleaned.slice(0, 20)}.com`
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function InsightsScreen() {
  const { colors, brand, gradientColors } = useTheme()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const userId = profile?.id

  // Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recsLoading, setRecsLoading] = useState(true)
  const [recsError, setRecsError] = useState<string | null>(null)

  // Submitted mappings
  const [mappings, setMappings] = useState<SubmittedMapping[]>([])
  const [mappingsLoading, setMappingsLoading] = useState(true)

  // Selected mapping for detail
  const [selectedMapping, setSelectedMapping] = useState<SubmittedMapping | null>(null)

  // Transactions for spending analysis
  const { data: transactions = [] } = useTransactions(userId, { limit: 100 })

  const [refreshing, setRefreshing] = useState(false)

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    setRecsLoading(true)
    setRecsError(null)
    try {
      const data = await invokeEdge<{ recommendations: Recommendation[] }>('ai-recommendations', {})
      setRecommendations(data.recommendations || [])
    } catch (err: any) {
      setRecsError(err?.message || 'Failed to load recommendations')
    } finally {
      setRecsLoading(false)
    }
  }, [])

  // Fetch submitted mappings
  const fetchMappings = useCallback(async () => {
    if (!userId) return
    setMappingsLoading(true)
    try {
      const { data, error } = await supabase
        .from('llm_mappings')
        .select('id, merchant_name, ticker, company_name, confidence, status, admin_approved, ai_processed, created_at')
        .eq('category', 'user_submitted')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setMappings(data || [])
    } catch {
      setMappings([])
    } finally {
      setMappingsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRecommendations()
    fetchMappings()
  }, [fetchRecommendations, fetchMappings])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchRecommendations(), fetchMappings()])
    setRefreshing(false)
  }, [fetchRecommendations, fetchMappings])

  // Spending by category
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      const cat = tx.category || 'Other'
      map[cat] = (map[cat] || 0) + (tx.amount || 0)
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [transactions])

  // Round-up stats
  const roundUpStats = useMemo(() => {
    const roundUps = transactions.filter(tx => tx.round_up > 0)
    const total = roundUps.reduce((s, tx) => s + tx.round_up, 0)
    const avg = roundUps.length > 0 ? total / roundUps.length : 0
    const projectedAnnual = roundUps.length > 0 ? (total / Math.max(roundUps.length, 1)) * roundUps.length * 12 : 0
    return { total, avg, count: roundUps.length, projectedAnnual }
  }, [transactions])

  // Max spending for bar chart scaling
  const maxCategorySpend = categorySpending.length > 0 ? categorySpending[0][1] : 1

  return (
    <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>AI Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Personalized insights powered by AI
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
      >
        {/* ============================================================ */}
        {/*  AI Recommendations                                          */}
        {/* ============================================================ */}
        <InsightCard
          icon={<Lightbulb size={20} color="#EC4899" />}
          iconBg="rgba(236, 72, 153, 0.15)"
          title="AI Recommendations"
          subtitle={recsLoading ? 'Loading...' : `${recommendations.length} personalized recommendations`}
          colors={colors}
          accentColor="#EC4899"
          headerRight={
            <Pressable onPress={fetchRecommendations} hitSlop={8}>
              <RefreshCw size={16} color={colors.textSecondary} />
            </Pressable>
          }
        >
          {recsLoading ? (
            <View style={styles.centeredPad}>
              <LoadingSpinner />
            </View>
          ) : recsError ? (
            <View style={styles.centeredPad}>
              <Text style={[styles.errorText, { color: '#EF4444' }]}>{recsError}</Text>
              <Pressable onPress={fetchRecommendations} style={[styles.retryBtn, { backgroundColor: `${brand.purple}1A` }]}>
                <Text style={[styles.retryText, { color: brand.purple }]}>Retry</Text>
              </Pressable>
            </View>
          ) : recommendations.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No recommendations yet. Keep using the app to get personalized insights.
            </Text>
          ) : (
            <View style={styles.recsList}>
              {recommendations.map((rec, idx) => {
                const typeColor = getTypeColor(rec.type)
                const confidencePercent = Math.round((rec.confidence || 0) * 100)
                return (
                  <View
                    key={idx}
                    style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  >
                    <Text style={[styles.recTitle, { color: colors.textPrimary }]}>{rec.title}</Text>
                    <Text style={[styles.recDesc, { color: colors.textSecondary }]}>{rec.description}</Text>
                    <View style={styles.recFooter}>
                      <View style={[styles.confidenceBar, { backgroundColor: colors.surfaceInput }]}>
                        <View
                          style={[
                            styles.confidenceFill,
                            { width: `${Math.min(confidencePercent, 100)}%`, backgroundColor: typeColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.confidenceText, { color: colors.textMuted }]}>
                        {confidencePercent}% confidence
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </InsightCard>

        {/* ============================================================ */}
        {/*  Round-Up Impact                                              */}
        {/* ============================================================ */}
        <InsightCard
          icon={<ArrowUpDown size={20} color="#06B6D4" />}
          iconBg="rgba(6, 182, 212, 0.15)"
          title="Round-Up Impact"
          colors={colors}
          accentColor="#06B6D4"
        >
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total Round-Ups</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(roundUpStats.total)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Avg per Txn</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(roundUpStats.avg)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Projected Annual</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(roundUpStats.projectedAnnual)}</Text>
            </View>
          </View>
        </InsightCard>

        {/* ============================================================ */}
        {/*  Spending by Category                                         */}
        {/* ============================================================ */}
        {categorySpending.length > 0 && (
          <InsightCard
            icon={<TrendingUp size={20} color={brand.purple} />}
            iconBg={`${brand.purple}1A`}
            title="Spending by Category"
            subtitle={`Top ${categorySpending.length} categories`}
            colors={colors}
            accentColor={brand.purple}
          >
            <View style={styles.categoryList}>
              {categorySpending.map(([category, amount], idx) => {
                const barWidth = (amount / maxCategorySpend) * 100
                return (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {category}
                    </Text>
                    <View style={[styles.categoryBarBg, { backgroundColor: colors.surfaceInput }]}>
                      <LinearGradient
                        colors={[...gradientColors] as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.categoryBarFill, { width: `${barWidth}%` }]}
                      />
                    </View>
                    <Text style={[styles.categoryAmount, { color: colors.textSecondary }]}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </InsightCard>
        )}

        {/* ============================================================ */}
        {/*  My Submitted Mappings                                        */}
        {/* ============================================================ */}
        <InsightCard
          icon={<GitMerge size={20} color="#F59E0B" />}
          iconBg="rgba(245, 158, 11, 0.15)"
          title="My Submitted Mappings"
          subtitle={mappingsLoading ? 'Loading...' : `${mappings.length} mapping${mappings.length !== 1 ? 's' : ''}`}
          colors={colors}
          accentColor="#F59E0B"
        >
          {mappingsLoading ? (
            <View style={styles.centeredPad}>
              <LoadingSpinner />
            </View>
          ) : mappings.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No mappings submitted yet. When a transaction fails to match, use the "Map" button on the Transactions page to submit your own mapping.
            </Text>
          ) : (
            <View style={styles.mappingsList}>
              {mappings.slice(0, 10).map(m => {
                const statusVariant: 'success' | 'warning' | 'info' =
                  m.status === 'approved' ? 'success' : m.status === 'pending' ? 'warning' : 'info'
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedMapping(m)}
                    style={[styles.mappingRow, { borderBottomColor: colors.borderSubtle }]}
                  >
                    {m.ticker && (
                      <CompanyLogo domain={merchantToDomain(m.merchant_name)} size={36} />
                    )}
                    <View style={styles.mappingInfo}>
                      <Text style={[styles.mappingMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
                        {formatMerchantName(m.merchant_name)}
                      </Text>
                      <Text style={[styles.mappingTicker, { color: brand.purple }]}>
                        {m.ticker || 'No ticker'}
                      </Text>
                    </View>
                    <View style={styles.mappingRight}>
                      <Badge variant={statusVariant}>{m.status}</Badge>
                      {m.confidence != null && (
                        <Text style={[styles.mappingConf, {
                          color: m.confidence > 0.8 ? '#10B981' : m.confidence > 0.5 ? '#F59E0B' : '#EF4444'
                        }]}>
                          {Math.round(m.confidence * 100)}%
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )
              })}
              {mappings.length > 10 && (
                <Text style={[styles.moreText, { color: colors.textMuted }]}>
                  +{mappings.length - 10} more
                </Text>
              )}
            </View>
          )}
        </InsightCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mapping Detail Modal */}
      <Modal
        visible={selectedMapping !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMapping(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mapping Detail</Text>
              <Pressable onPress={() => setSelectedMapping(null)} hitSlop={8}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            {selectedMapping && (
              <View style={styles.modalContent}>
                <DetailRow label="Merchant" value={formatMerchantName(selectedMapping.merchant_name)} colors={colors} />
                <DetailRow label="Ticker" value={selectedMapping.ticker || '--'} colors={colors} highlight={brand.purple} />
                <DetailRow label="Company" value={selectedMapping.company_name || '--'} colors={colors} />

                <LinearGradient
                  colors={[...gradientColors] as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.detailDivider}
                />

                <DetailRow
                  label="Confidence"
                  value={selectedMapping.confidence != null ? `${Math.round(selectedMapping.confidence * 100)}%` : '--'}
                  colors={colors}
                  highlight={
                    selectedMapping.confidence != null
                      ? selectedMapping.confidence > 0.8 ? '#10B981' : selectedMapping.confidence > 0.5 ? '#F59E0B' : '#EF4444'
                      : undefined
                  }
                />
                <DetailRow label="Status" value={selectedMapping.status} colors={colors} />
                <DetailRow label="AI Processed" value={selectedMapping.ai_processed ? 'Yes' : 'No'} colors={colors} />
                <DetailRow
                  label="Admin Approved"
                  value={selectedMapping.admin_approved == null ? 'Pending' : selectedMapping.admin_approved ? 'Yes' : 'No'}
                  colors={colors}
                />
                <DetailRow label="Submitted" value={formatDate(selectedMapping.created_at)} colors={colors} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  InsightCard                                                         */
/* ------------------------------------------------------------------ */

function InsightCard({ icon, iconBg, title, subtitle, children, colors, accentColor, headerRight }: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle?: string
  children: React.ReactNode
  colors: any
  accentColor: string
  headerRight?: React.ReactNode
}) {
  return (
    <GlassCard borderRadius={16} padding={0} style={styles.insightCard}>
      {/* Accent top border */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.insightInner}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIconCircle, { backgroundColor: iconBg }]}>
            {icon}
          </View>
          <View style={styles.insightHeaderText}>
            <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.insightSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
          {headerRight}
        </View>
        {children}
      </View>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  DetailRow                                                           */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value, colors, highlight }: {
  label: string; value: string; colors: any; highlight?: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: highlight || colors.textPrimary, fontWeight: highlight ? '700' : '500' }]}>
        {value}
      </Text>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  // InsightCard
  insightCard: { marginBottom: 20, overflow: 'hidden' },
  accentBar: { height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  insightInner: { padding: 20 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  insightIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  insightHeaderText: { flex: 1 },
  insightTitle: { fontSize: 16, fontWeight: '700' },
  insightSubtitle: { fontSize: 12, marginTop: 2 },

  // Recommendations
  recsList: { gap: 12 },
  recCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  recTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  recDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  recFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confidenceBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 2 },
  confidenceText: { fontSize: 11, fontWeight: '500', minWidth: 90 },

  // Round-Up Impact
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 16, fontWeight: '800' },

  // Spending by category
  categoryList: { gap: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryName: { fontSize: 13, fontWeight: '500', width: 90 },
  categoryBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 4 },
  categoryAmount: { fontSize: 12, fontWeight: '600', minWidth: 60, textAlign: 'right' },

  // Submitted mappings
  mappingsList: { gap: 0 },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mappingInfo: { flex: 1, gap: 2 },
  mappingMerchant: { fontSize: 14, fontWeight: '600' },
  mappingTicker: { fontSize: 12, fontWeight: '600' },
  mappingRight: { alignItems: 'flex-end', gap: 4 },
  mappingConf: { fontSize: 11, fontWeight: '600' },
  moreText: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },

  // Shared
  centeredPad: { paddingVertical: 30, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, lineHeight: 19 },
  errorText: { fontSize: 13 },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryText: { fontSize: 13, fontWeight: '600' },

  // Modal
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popup: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { padding: 20, gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14 },
  detailDivider: { height: 1, borderRadius: 1, marginVertical: 4 },
})
