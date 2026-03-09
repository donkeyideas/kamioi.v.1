import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useTransactions } from '@/hooks/useTransactions'
import { CompanyLogo, Badge, LoadingSpinner } from '@/components/ui'
import { formatCurrency, formatDate, formatDateGroup } from '@/utils/format'

type FilterKey = 'all' | 'completed' | 'pending' | 'this_month' | 'last_month'

interface FilterChip {
  key: FilterKey
  label: string
}

const FILTERS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
]

function getDateRange(filterKey: FilterKey): { dateFrom?: string; dateTo?: string } {
  const now = new Date()
  if (filterKey === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dateFrom: start.toISOString().split('T')[0] }
  }
  if (filterKey === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      dateFrom: start.toISOString().split('T')[0],
      dateTo: end.toISOString().split('T')[0],
    }
  }
  return {}
}

function getStatusFilter(filterKey: FilterKey): string | undefined {
  if (filterKey === 'completed') return 'completed'
  if (filterKey === 'pending') return 'pending'
  return undefined
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
  completed: 'success',
  mapped: 'info',
  pending: 'warning',
  failed: 'error',
}

// Simple domain guessing for merchant names
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

export default function TransactionsScreen() {
  const { colors, brand, gradientColors } = useTheme()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTx, setSelectedTx] = useState<any>(null)

  const filters = useMemo(() => ({
    status: getStatusFilter(activeFilter),
    ...getDateRange(activeFilter),
  }), [activeFilter])

  const { data: transactions = [], isLoading } = useTransactions(profile?.id, filters)

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    const q = searchQuery.toLowerCase()
    return transactions.filter(tx =>
      tx.merchant.toLowerCase().includes(q) ||
      tx.ticker?.toLowerCase().includes(q) ||
      tx.category?.toLowerCase().includes(q)
    )
  }, [transactions, searchQuery])

  // Group transactions by date
  const sections = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    for (const tx of filtered) {
      const key = formatDateGroup(tx.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }))
  }, [filtered])

  const renderChip = useCallback(({ key, label }: FilterChip) => {
    const isActive = activeFilter === key
    return (
      <Pressable
        key={key}
        onPress={() => setActiveFilter(key)}
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? `${brand.purple}26` : colors.surfaceInput,
            borderColor: isActive ? `${brand.purple}4D` : colors.borderSubtle,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: isActive ? brand.purple : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    )
  }, [activeFilter, brand.purple, colors])

  const renderItem = useCallback(({ item: tx }: { item: typeof filtered[0] }) => {
    const domain = merchantToDomain(tx.merchant)
    const variant = statusVariantMap[tx.status] ?? 'info'
    return (
      <Pressable
        onPress={() => setSelectedTx(tx)}
        style={[
          styles.txRow,
          { borderBottomColor: colors.borderSubtle },
        ]}
      >
        <CompanyLogo domain={domain} size={40} />
        <View style={styles.txInfo}>
          <Text style={[styles.txMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
            {tx.merchant}
          </Text>
          <View style={styles.txMeta}>
            <Text style={[styles.txDate, { color: colors.textMuted }]}>
              {formatDate(tx.date)}
            </Text>
            <Badge variant={variant}>{tx.status}</Badge>
          </View>
        </View>
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
      </Pressable>
    )
  }, [colors])

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.base }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {section.title}
      </Text>
    </View>
  ), [colors])

  return (
    <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Activity</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {FILTERS.map(renderChip)}
      </ScrollView>

      {/* Transaction List */}
      {isLoading ? (
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No transactions found
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Transaction Detail Modal */}
      <Modal
        visible={selectedTx !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Transaction Detail</Text>
              <Pressable onPress={() => setSelectedTx(null)} hitSlop={8}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            {selectedTx && (
              <ScrollView contentContainerStyle={styles.modalContent}>
                {/* Merchant header */}
                <View style={styles.detailMerchantRow}>
                  <CompanyLogo domain={merchantToDomain(selectedTx.merchant)} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.detailMerchantName, { color: colors.textPrimary }]}>
                      {selectedTx.merchant}
                    </Text>
                    {selectedTx.ticker && (
                      <Text style={[styles.detailTicker, { color: brand.purple }]}>
                        {selectedTx.ticker}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailRows}>
                  <DetailRow label="Date" value={formatDate(selectedTx.date)} colors={colors} />
                  <DetailRow label="Merchant" value={selectedTx.merchant} colors={colors} />
                  <DetailRow label="Category" value={selectedTx.category ?? '--'} colors={colors} />

                  {/* Divider */}
                  <LinearGradient
                    colors={[...gradientColors] as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.detailDivider}
                  />

                  <DetailRow label="Amount" value={formatCurrency(selectedTx.amount)} colors={colors} highlight={brand.purple} />
                  <DetailRow label="Round-Up" value={formatCurrency(selectedTx.round_up ?? 0)} colors={colors} highlight="#06B6D4" />
                  <DetailRow
                    label="Status"
                    value={selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1)}
                    colors={colors}
                    badge={statusVariantMap[selectedTx.status] ?? 'info'}
                  />
                  {selectedTx.ticker && (
                    <DetailRow label="Ticker" value={selectedTx.ticker} colors={colors} highlight={brand.purple} />
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* Detail Row for transaction modal */
function DetailRow({ label, value, colors, highlight, badge }: {
  label: string
  value: string
  colors: any
  highlight?: string
  badge?: 'success' | 'warning' | 'info' | 'error'
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      {badge ? (
        <Badge variant={badge}>{value}</Badge>
      ) : (
        <Text style={[styles.detailValue, { color: highlight || colors.textPrimary, fontWeight: highlight ? '700' : '500' }]}>
          {value}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 12,
    marginBottom: 8,
  },
  chipRow: {
    paddingLeft: 20,
    paddingRight: 40,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    includeFontPadding: false,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txInfo: {
    flex: 1,
    gap: 4,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  listContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '85%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  detailMerchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  detailMerchantName: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailTicker: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailRows: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 14,
  },
  detailDivider: {
    height: 1,
    borderRadius: 1,
    marginVertical: 4,
  },
})
