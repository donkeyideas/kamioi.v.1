import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  RefreshControl,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Search, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePortfolio, type EnrichedHolding } from '@/hooks/usePortfolio'
import { GlassCard, CompanyLogo, LoadingSpinner } from '@/components/ui'
import { formatCurrency, formatPercent } from '@/utils/format'

export default function PortfolioScreen() {
  const { colors, brand, status: statusColors } = useTheme()
  const { profile } = useAuth()
  const insets = useSafeAreaInsets()

  const userId = profile?.id
  const { data: holdings, isLoading, refetch } = usePortfolio(userId)

  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedHolding, setSelectedHolding] = useState<EnrichedHolding | null>(null)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  // Client-side search filter by ticker or company name
  const filteredHoldings = useMemo(() => {
    if (!holdings) return []
    if (!search.trim()) return holdings
    const q = search.toLowerCase().trim()
    return holdings.filter(
      (h) =>
        h.ticker.toLowerCase().includes(q) ||
        (h.companyName && h.companyName.toLowerCase().includes(q))
    )
  }, [holdings, search])

  // Compute totals from live data
  const totalValue = useMemo(
    () => (holdings || []).reduce((sum, h) => sum + (h.liveValue ?? h.total_value ?? 0), 0),
    [holdings]
  )
  const holdingCount = holdings?.length ?? 0

  const renderHolding = useCallback(
    ({ item }: { item: EnrichedHolding }) => {
      const changePercent = item.liveChangePercent ?? 0
      const isPositive = changePercent >= 0
      const changeColor = isPositive ? statusColors.success : statusColors.error

      return (
        <Pressable onPress={() => setSelectedHolding(item)}>
          <GlassCard padding={16} borderRadius={12} style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              {/* Logo */}
              {item.domain ? (
                <CompanyLogo domain={item.domain} size={40} />
              ) : (
                <View
                  style={[
                    styles.tickerFallback,
                    { backgroundColor: colors.surfaceInput },
                  ]}
                >
                  <Text style={[styles.tickerFallbackText, { color: colors.textPrimary }]}>
                    {item.ticker.substring(0, 2)}
                  </Text>
                </View>
              )}

              {/* Ticker + company name */}
              <View style={styles.holdingInfo}>
                <Text style={[styles.holdingTicker, { color: colors.textPrimary }]}>
                  {item.ticker}
                </Text>
                <Text
                  style={[styles.holdingName, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.companyName || item.ticker}
                </Text>
              </View>

              {/* Value + change + shares */}
              <View style={styles.holdingRight}>
                <Text style={[styles.holdingValue, { color: colors.textPrimary }]}>
                  {formatCurrency(item.liveValue ?? item.total_value ?? 0)}
                </Text>
                <Text style={[styles.holdingChange, { color: changeColor }]}>
                  {formatPercent(changePercent)}
                </Text>
                <Text style={[styles.holdingShares, { color: colors.textMuted }]}>
                  {item.shares.toFixed(1)} shares
                </Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>
      )
    },
    [colors, statusColors]
  )

  const keyExtractor = useCallback((item: EnrichedHolding) => `${item.id}`, [])

  if (isLoading && !holdings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.base }]}>
        <LoadingSpinner size={40} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 54) }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Portfolio</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {holdingCount} holding{holdingCount !== 1 ? 's' : ''} &middot;{' '}
          {formatCurrency(totalValue)}
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBarContainer, { paddingHorizontal: 20 }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceInput,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search holdings..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Holdings list */}
      <View style={styles.listContainer}>
        <FlashList
          data={filteredHoldings}
          renderItem={renderHolding}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textPrimary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {search ? 'No holdings match your search' : 'No holdings yet'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Stock Detail Modal */}
      {selectedHolding && (() => {
        const h = selectedHolding
        const changePercent = h.liveChangePercent ?? 0
        const isPositive = changePercent >= 0
        const changeColor = isPositive ? statusColors.success : statusColors.error
        const liveValue = h.liveValue ?? h.total_value ?? 0
        const avgCost = h.shares > 0 ? (h.total_value ?? 0) / h.shares : 0
        const livePrice = h.livePrice ?? avgCost
        const totalGain = liveValue - (h.total_value ?? 0)
        const gainIsPositive = totalGain >= 0

        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedHolding(null)}
          >
            <View style={styles.overlay}>
              <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.modalHeaderLeft}>
                    {h.domain ? (
                      <CompanyLogo domain={h.domain} size={40} />
                    ) : (
                      <View style={[styles.tickerFallback, { backgroundColor: colors.surfaceInput }]}>
                        <Text style={[styles.tickerFallbackText, { color: colors.textPrimary }]}>
                          {h.ticker.substring(0, 2)}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={[styles.modalTicker, { color: colors.textPrimary }]}>{h.ticker}</Text>
                      <Text style={[styles.modalCompany, { color: colors.textSecondary }]}>
                        {h.companyName || h.ticker}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setSelectedHolding(null)} hitSlop={8}>
                    <X size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalContent}>
                  {/* Price */}
                  <View style={styles.priceSection}>
                    <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                      {formatCurrency(livePrice)}
                    </Text>
                    <Text style={[styles.priceChange, { color: changeColor }]}>
                      {formatPercent(changePercent)} today
                    </Text>
                  </View>

                  {/* Stats grid */}
                  <View style={styles.statsGrid}>
                    {[
                      { label: 'Shares', value: h.shares.toFixed(2) },
                      { label: 'Avg Cost', value: formatCurrency(avgCost) },
                      { label: 'Total Value', value: formatCurrency(liveValue) },
                      {
                        label: 'Total Gain',
                        value: `${gainIsPositive ? '+' : ''}${formatCurrency(totalGain)}`,
                        color: gainIsPositive ? statusColors.success : statusColors.error,
                      },
                    ].map((stat) => (
                      <View
                        key={stat.label}
                        style={[styles.statCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}
                      >
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                        <Text style={[styles.statValue, { color: stat.color ?? colors.textPrimary }]}>
                          {stat.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Cost Basis Info */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cost Basis</Text>
                      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                        {formatCurrency(h.total_value ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Market Value</Text>
                      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                        {formatCurrency(liveValue)}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Return</Text>
                      <Text style={[styles.infoValue, { color: gainIsPositive ? statusColors.success : statusColors.error }]}>
                        {formatPercent(h.total_value && h.total_value > 0 ? ((liveValue - h.total_value) / h.total_value) * 100 : 0)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )
      })()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  // Search bar
  searchBarContainer: {
    marginTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  // List
  listContainer: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    paddingTop: 4,
  },
  // Holding card
  holdingCard: {
    marginBottom: 10,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tickerFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerFallbackText: {
    fontSize: 14,
    fontWeight: '700',
  },
  holdingInfo: {
    flex: 1,
    minWidth: 0,
  },
  holdingTicker: {
    fontSize: 15,
    fontWeight: '700',
  },
  holdingName: {
    fontSize: 12,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  holdingChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  holdingShares: {
    fontSize: 11,
    marginTop: 2,
  },
  // Empty
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTicker: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCompany: {
    fontSize: 13,
    marginTop: 1,
  },
  modalContent: {
    padding: 20,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  priceChange: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    borderRadius: 10,
    borderWidth: 1,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0,
    paddingTop: 4,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
})
