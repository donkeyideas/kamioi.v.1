import React, { useMemo, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePortfolio, type EnrichedHolding } from '@/hooks/usePortfolio'
import { useTransactions } from '@/hooks/useTransactions'
import { GlassCard, CompanyLogo, Badge, LoadingSpinner } from '@/components/ui'
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/format'

const statusVariantMap: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
  completed: 'success',
  mapped: 'info',
  pending: 'warning',
  failed: 'error',
}

function merchantToDomain(merchant: string): string {
  const cleaned = merchant.toLowerCase().replace(/[^a-z0-9]/g, '')
  const domainMap: Record<string, string> = {
    apple: 'apple.com', amazon: 'amazon.com', starbucks: 'starbucks.com',
    walmart: 'walmart.com', target: 'target.com', mcdonalds: 'mcdonalds.com',
    nike: 'nike.com', costco: 'costco.com', netflix: 'netflix.com',
    uber: 'uber.com', lyft: 'lyft.com', homedepot: 'homedepot.com',
    lowes: 'lowes.com', disney: 'disney.com', shell: 'shell.com',
    exxon: 'exxonmobil.com', visa: 'visa.com', paypal: 'paypal.com',
  }
  for (const [key, domain] of Object.entries(domainMap)) {
    if (cleaned.includes(key)) return domain
  }
  return `${cleaned.slice(0, 20)}.com`
}

export default function StockDetailScreen() {
  const { colors, brand, status: statusColors } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { ticker } = useLocalSearchParams<{ ticker: string }>()
  const { profile } = useAuth()

  const { data: portfolio = [], isLoading: portfolioLoading } = usePortfolio(profile?.id)
  const { data: transactions = [], isLoading: txLoading } = useTransactions(profile?.id, { ticker })

  const holding: EnrichedHolding | undefined = useMemo(
    () => portfolio.find(h => h.ticker === ticker),
    [portfolio, ticker]
  )

  const totalGain = useMemo(() => {
    if (!holding) return 0
    return (holding.liveValue ?? holding.total_value) - (holding.average_price * holding.shares)
  }, [holding])

  const totalGainPercent = useMemo(() => {
    if (!holding) return 0
    const cost = holding.average_price * holding.shares
    if (cost === 0) return 0
    return ((totalGain / cost) * 100)
  }, [holding, totalGain])

  const isLoading = portfolioLoading || txLoading

  const isPositiveChange = (holding?.liveChange ?? 0) >= 0
  const isPositiveGain = totalGain >= 0

  const stats = useMemo(() => {
    if (!holding) return []
    return [
      { label: 'Shares', value: formatNumber(holding.shares) },
      { label: 'Avg Cost', value: formatCurrency(holding.average_price) },
      { label: 'Total Value', value: formatCurrency(holding.liveValue ?? holding.total_value) },
      { label: 'Total Gain', value: formatCurrency(Math.abs(totalGain)), isGain: true },
    ]
  }, [holding, totalGain])

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.base, paddingTop: insets.top }]}>
        <LoadingSpinner />
      </View>
    )
  }

  if (!holding) {
    return (
      <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Portfolio</Text>
        </Pressable>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Holding not found for {ticker}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Portfolio</Text>
        </Pressable>

        {/* Hero */}
        <View style={styles.hero}>
          {holding.domain ? (
            <CompanyLogo domain={holding.domain} size={56} imageSize={40} />
          ) : (
            <View style={[styles.placeholderLogo, { backgroundColor: colors.surfaceInput }]}>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                {ticker?.slice(0, 2)}
              </Text>
            </View>
          )}
          <Text style={[styles.ticker, { color: colors.textPrimary }]}>{holding.ticker}</Text>
          <Text style={[styles.companyName, { color: colors.textSecondary }]}>
            {holding.companyName ?? holding.ticker}
          </Text>
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.textPrimary }]}>
            {formatCurrency(holding.livePrice ?? holding.current_price)}
          </Text>
          <Text
            style={[
              styles.change,
              { color: isPositiveChange ? statusColors.success : statusColors.error },
            ]}
          >
            {isPositiveChange ? '+' : ''}
            {formatCurrency(Math.abs(holding.liveChange ?? 0))}
            {' ('}
            {formatPercent(holding.liveChangePercent ?? 0)}
            {')'}
          </Text>
        </View>

        {/* Chart Placeholder */}
        <GlassCard borderRadius={16} padding={0} style={styles.chartCard}>
          <View style={styles.chartPlaceholder}>
            <Text style={[styles.chartText, { color: colors.textMuted }]}>
              Chart coming soon
            </Text>
          </View>
        </GlassCard>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map(stat => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: stat.isGain
                      ? isPositiveGain ? statusColors.success : statusColors.error
                      : colors.textPrimary,
                  },
                ]}
              >
                {stat.isGain && (isPositiveGain ? '+' : '-')}
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Recent Transactions
        </Text>

        {transactions.length === 0 ? (
          <Text style={[styles.noTxText, { color: colors.textMuted }]}>
            No transactions for {ticker}
          </Text>
        ) : (
          transactions.slice(0, 20).map(tx => {
            const domain = merchantToDomain(tx.merchant)
            const variant = statusVariantMap[tx.status] ?? 'info'
            return (
              <View
                key={tx.id}
                style={[styles.txRow, { borderBottomColor: colors.borderSubtle }]}
              >
                <CompanyLogo domain={domain} size={40} />
                <View style={styles.txInfo}>
                  <Text style={[styles.txMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
                    {tx.merchant}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {formatDate(tx.date)}
                  </Text>
                </View>
                <Badge variant={variant}>{tx.status}</Badge>
                <View style={styles.txAmounts}>
                  <Text style={[styles.txAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(tx.amount)}
                  </Text>
                  {tx.round_up > 0 && (
                    <Text style={styles.txRoundUp}>
                      +{formatCurrency(tx.round_up)}
                    </Text>
                  )}
                </View>
              </View>
            )
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Back
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
  },
  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  placeholderLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '700',
  },
  ticker: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  companyName: {
    fontSize: 14,
    marginTop: 2,
  },
  // Price
  priceRow: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
  },
  change: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  // Chart
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartText: {
    fontSize: 14,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  noTxText: {
    fontSize: 14,
    paddingHorizontal: 20,
  },
  // Transactions
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txMerchant: {
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 12,
  },
  txAmounts: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 70,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txRoundUp: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
  },
})
