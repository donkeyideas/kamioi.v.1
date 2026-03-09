import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  FlatList,
  Modal,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import {
  Bell,
  Camera,
  Building,
  TrendingUp,
  Target,
  DollarSign,
  ArrowUpDown,
  BarChart3,
  Receipt,
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useTransactions } from '@/hooks/useTransactions'
import { useUnreadCount } from '@/hooks/useNotifications'
import { KpiCard, CompanyLogo, LoadingSpinner, SimpleChart, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'
import { invokeEdge } from '@/services/api'
import { formatCurrency, formatDate, formatNumber } from '@/utils/format'

// Map common merchants to domains for CompanyLogo
const merchantDomainMap: Record<string, string> = {
  apple: 'apple.com',
  starbucks: 'starbucks.com',
  amazon: 'amazon.com',
  mcdonalds: 'mcdonalds.com',
  "mcdonald's": 'mcdonalds.com',
  shell: 'shell.com',
  netflix: 'netflix.com',
  walmart: 'walmart.com',
  target: 'target.com',
  costco: 'costco.com',
  nike: 'nike.com',
  uber: 'uber.com',
  lyft: 'lyft.com',
  google: 'google.com',
  microsoft: 'microsoft.com',
  meta: 'meta.com',
  disney: 'disney.com',
}

function getMerchantDomain(merchant: string): string {
  const lower = merchant.toLowerCase().trim()
  for (const [key, domain] of Object.entries(merchantDomainMap)) {
    if (lower.includes(key)) return domain
  }
  // Fallback: try constructing a domain from the merchant name
  const cleaned = lower.replace(/[^a-z0-9]/g, '')
  return `${cleaned}.com`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function DashboardScreen() {
  const { width: screenWidth } = useWindowDimensions()
  const { colors, status: statusColors, brand, gradientColors } = useTheme()
  const { profile } = useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const userId = profile?.id
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useDashboardStats(userId)
  const {
    data: transactions,
    isLoading: txLoading,
    refetch: refetchTx,
  } = useTransactions(userId, { limit: 10 })
  const unreadCount = useUnreadCount(userId)

  const [refreshing, setRefreshing] = React.useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })
  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchStats(), refetchTx()])
    setRefreshing(false)
  }, [refetchStats, refetchTx])

  const handleBankSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      // Try real bank sync first
      const result = await invokeEdge<{ synced: number; mapped: number; failed: number }>('teller-sync-transactions')
      showAlert('Sync Complete', `${result.synced} transactions synced.\n${result.mapped} mapped to investments, ${result.failed} unmatched.`)
      refetchStats()
      refetchTx()
    } catch {
      // No linked accounts — fall back to demo sync
      try {
        const result = await invokeEdge<{ synced: number; mapped: number; failed: number }>('bank-sync-demo')
        showAlert('Demo Sync Complete', `${result.synced} transactions synced.\n${result.mapped} mapped to investments, ${result.failed} unmatched.`)
        refetchStats()
        refetchTx()
      } catch (err: any) {
        showAlert('Sync Failed', err?.message || 'Failed to sync transactions.')
      }
    } finally {
      setSyncing(false)
    }
  }, [syncing, showAlert, refetchStats, refetchTx])

  const quickActions = useMemo(
    () => [
      { label: 'Upload Receipt', Icon: Camera, onPress: () => router.push('/(app)/receipt-upload') },
      { label: syncing ? 'Syncing...' : 'Sync Bank', Icon: Building, onPress: handleBankSync },
      { label: 'View Portfolio', Icon: TrendingUp, onPress: () => router.push('/(app)/(user)/portfolio') },
      { label: 'Add Goal', Icon: Target, onPress: () => router.push('/(app)/(user)/goals') },
    ],
    [router, syncing, handleBankSync]
  )

  const firstName = profile?.name?.split(' ')[0] || 'there'
  const initials = profile?.name ? getInitials(profile.name) : '?'

  const isLoading = statsLoading && !stats

  if (isLoading) {
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
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {getGreeting()}, {firstName}
          </Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            Your portfolio is up today
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Bell icon with notification badge */}
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: colors.surfaceInput,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Bell size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Avatar circle with initials */}
          <LinearGradient
            colors={gradientColors as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Quick Actions horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContainer}
        style={styles.quickActionsScroll}
      >
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            style={styles.quickActionBtn}
            onPress={action.onPress}
          >
            <action.Icon size={14} color={colors.textPrimary} />
            <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Main scrollable content */}
      <ScrollView
        style={styles.dashScroll}
        contentContainerStyle={styles.dashScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        {/* KPI Grid - 2 columns */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<DollarSign size={14} color={colors.textSecondary} />}
              label="Portfolio Value"
              value={formatCurrency(stats?.portfolioTotal ?? 0, 0)}
              trend={stats?.portfolioChange
                ? `+${formatCurrency(stats.portfolioChange)} (+${((stats.portfolioChange / (stats.portfolioTotal - stats.portfolioChange)) * 100).toFixed(1)}%)`
                : undefined
              }
              trendDirection={stats?.portfolioChange && stats.portfolioChange > 0 ? 'up' : 'neutral'}
            />
          </View>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<ArrowUpDown size={14} color={colors.textSecondary} />}
              label="Round-Ups"
              value={formatCurrency(stats?.roundUpTotal ?? 0, 0)}
              trend={stats?.roundUpMonthly
                ? `+${formatCurrency(stats.roundUpMonthly)} this month`
                : undefined
              }
              trendDirection={stats?.roundUpMonthly && stats.roundUpMonthly > 0 ? 'up' : 'neutral'}
            />
          </View>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<BarChart3 size={14} color={colors.textSecondary} />}
              label="Stocks"
              value={formatNumber(stats?.stockCount ?? 0)}
              trend="Unique holdings"
              trendDirection="neutral"
            />
          </View>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<Receipt size={14} color={colors.textSecondary} />}
              label="Transactions"
              value={formatNumber(stats?.transactionCount ?? 0)}
              trend={stats?.transactionWeekly
                ? `+${stats.transactionWeekly} this week`
                : undefined
              }
              trendDirection={stats?.transactionWeekly && stats.transactionWeekly > 0 ? 'up' : 'neutral'}
            />
          </View>
        </View>

        {/* Portfolio Growth section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Portfolio Growth
          </Text>
          <Pressable onPress={() => router.push('/(app)/(user)/portfolio')}>
            <Text style={[styles.sectionLink, { color: brand.purple }]}>See All</Text>
          </Pressable>
        </View>

        {/* Chart */}
        <View
          style={[
            styles.chartPlaceholder,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
            Last 6 months
          </Text>
          <View style={styles.chartArea}>
            {stats?.chartData && stats.chartData.length > 1 ? (
              <SimpleChart
                data={stats.chartData}
                width={screenWidth - 80}
                height={120}
              />
            ) : (
              <Text style={[styles.chartComingSoon, { color: colors.textMuted }]}>
                Not enough data yet
              </Text>
            )}
          </View>
        </View>

        {/* Recent Transactions section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Transactions
          </Text>
          <Pressable onPress={() => router.push('/(app)/(user)/transactions')}>
            <Text style={[styles.sectionLink, { color: brand.purple }]}>See All</Text>
          </Pressable>
        </View>

        {/* Transaction list */}
        {txLoading && !transactions ? (
          <View style={styles.txLoadingContainer}>
            <LoadingSpinner size={24} />
          </View>
        ) : transactions && transactions.length > 0 ? (
          <View style={styles.txList}>
            {transactions.map((tx) => (
              <Pressable
                key={tx.id}
                onPress={() => setSelectedTx(tx)}
                style={[styles.txItem, { borderBottomColor: colors.borderSubtle }]}
              >
                <CompanyLogo domain={getMerchantDomain(tx.merchant)} size={40} />
                <View style={styles.txInfo}>
                  <Text
                    style={[styles.txMerchant, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {tx.merchant}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {formatDate(tx.created_at)}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(tx.amount)}
                  </Text>
                  {tx.round_up > 0 && (
                    <Text style={[styles.txRoundup, { color: statusColors.success }]}>
                      +{formatCurrency(tx.round_up)} {tx.ticker || ''}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No transactions yet
            </Text>
          </View>
        )}
      </ScrollView>

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
                <View style={styles.detailMerchantRow}>
                  <CompanyLogo domain={getMerchantDomain(selectedTx.merchant)} size={48} />
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

                <View style={styles.detailRows}>
                  <DetailRow label="Date" value={formatDate(selectedTx.date || selectedTx.created_at)} colors={colors} />
                  <DetailRow label="Merchant" value={selectedTx.merchant} colors={colors} />
                  <DetailRow label="Category" value={selectedTx.category ?? '--'} colors={colors} />

                  <LinearGradient
                    colors={gradientColors as readonly [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.detailDivider}
                  />

                  <DetailRow label="Amount" value={formatCurrency(selectedTx.amount)} colors={colors} highlight={brand.purple} />
                  <DetailRow label="Round-Up" value={formatCurrency(selectedTx.round_up ?? 0)} colors={colors} highlight="#06B6D4" />
                  <DetailRow
                    label="Status"
                    value={selectedTx.status ? selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1) : '--'}
                    colors={colors}
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

function DetailRow({ label, value, colors, highlight }: {
  label: string
  value: string
  colors: any
  highlight?: string
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
  },
  greetingSub: {
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Quick Actions
  quickActionsScroll: {
    flexGrow: 0,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 99,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Main scroll
  dashScroll: {
    flex: 1,
  },
  dashScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCol: {
    width: '48%',
    flexGrow: 1,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Chart placeholder
  chartPlaceholder: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    height: 180,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  chartLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  chartArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartComingSoon: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Transaction list
  txLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  txList: {
    gap: 2,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
  },
  txMerchant: {
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 12,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txRoundup: {
    fontSize: 12,
    marginTop: 2,
  },
  // Empty state
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  // Transaction Detail Modal
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
