import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowLeft,
  DollarSign,
  ArrowUpDown,
  BarChart3,
  Receipt,
  Camera,
  Building,
  TrendingUp,
  Target,
  Search,
  X,
  Lightbulb,
} from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { KpiCard, GlassCard, Badge, CompanyLogo, SimpleChart } from '@/components/ui'
import { DEMO_DATA, getMerchantDomain, createRandomTransactions, buildChartData } from '@/demo/demoData'
import type { DemoTransaction, DemoHolding, DemoRecommendation, ReceiptSubItem } from '@/demo/demoData'
import { DemoReceiptModal } from '@/demo/DemoReceiptModal'
import { getDemoSession } from '@/demo/demoSession'
import { logDemoVisit } from '@/demo/demoApi'
import { formatCurrency, formatDate, formatPercent, formatNumber, formatDateGroup } from '@/utils/format'

type DemoTab = 'home' | 'portfolio' | 'activity' | 'insights'

export default function DemoDashboardScreen() {
  const { type } = useLocalSearchParams<{ type: string }>()
  const router = useRouter()
  const { colors, status: statusColors, brand, gradientColors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()

  const data = DEMO_DATA[type ?? 'individual']
  const [activeTab, setActiveTab] = useState<DemoTab>('home')
  const [selectedTx, setSelectedTx] = useState<DemoTransaction | null>(null)
  const [selectedHolding, setSelectedHolding] = useState<DemoHolding | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [extraTx, setExtraTx] = useState<DemoTransaction[]>([])
  const [syncing, setSyncing] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const allTransactions = useMemo(
    () => [...extraTx, ...data.transactions],
    [extraTx, data.transactions],
  )

  const enrichedData = useMemo(
    () => ({ ...data, transactions: allTransactions }),
    [data, allTransactions],
  )

  const handleSync = useCallback(() => {
    setSyncing(true)
    setTimeout(() => {
      const count = 3 + Math.floor(Math.random() * 5)
      const newTxs = createRandomTransactions(
        (type ?? 'individual') as 'individual' | 'family' | 'business',
        count,
        data.roundUpAmount,
      )
      setExtraTx(prev => [...newTxs, ...prev])
      setSyncing(false)
    }, 1500)
  }, [type, data.roundUpAmount])

  const handleReceiptComplete = useCallback(() => {
    const subItems: ReceiptSubItem[] = [
      { name: 'Coca-Cola Classic 12pk', brand: 'Coca-Cola', amount: 6.98, ticker: 'KO', stockName: 'The Coca-Cola Co.' },
      { name: 'Tide Pods Original 42ct', brand: 'Tide', amount: 12.97, ticker: 'PG', stockName: 'Procter & Gamble' },
      { name: "Lay's Classic Potato Chips", brand: "Lay's", amount: 4.28, ticker: 'PEP', stockName: 'PepsiCo Inc.' },
    ]
    const receiptTx: DemoTransaction = {
      id: Date.now(),
      merchant: 'Walmart',
      category: 'Groceries',
      amount: 55.42,
      round_up: data.roundUpAmount,
      fee: 0,
      ticker: 'WMT',
      shares: 0.012,
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
      subItems,
    }
    setExtraTx(prev => [receiptTx, ...prev])
  }, [data.roundUpAmount])

  useEffect(() => {
    getDemoSession().then(session => {
      if (session) {
        logDemoVisit(session.session_token, session.email, type ?? 'individual')
      }
    })
  }, [type])

  if (!data) return null

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = data.userName.split(' ')[0]
  const initials = data.userName.substring(0, 2).toUpperCase()

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {activeTab === 'home' && (
        <HomeTab
          data={enrichedData}
          type={type ?? 'individual'}
          greeting={greeting}
          firstName={firstName}
          initials={initials}
          colors={colors}
          statusColors={statusColors}
          brand={brand}
          gradientColors={gradientColors}
          insets={insets}
          screenWidth={screenWidth}
          router={router}
          onSelectTx={setSelectedTx}
          syncing={syncing}
          onSync={handleSync}
          onUploadReceipt={() => setReceiptOpen(true)}
        />
      )}

      {activeTab === 'portfolio' && (
        <PortfolioTab
          data={enrichedData}
          colors={colors}
          statusColors={statusColors}
          brand={brand}
          insets={insets}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectHolding={setSelectedHolding}
        />
      )}

      {activeTab === 'activity' && (
        <ActivityTab
          data={enrichedData}
          type={type ?? 'individual'}
          colors={colors}
          statusColors={statusColors}
          brand={brand}
          gradientColors={gradientColors}
          insets={insets}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onSelectTx={setSelectedTx}
        />
      )}

      {activeTab === 'insights' && (
        <InsightsTab
          data={enrichedData}
          colors={colors}
          brand={brand}
          gradientColors={gradientColors}
          insets={insets}
        />
      )}

      {/* Bottom Tab Bar — matches real app */}
      <View style={[styles.tabBar, { backgroundColor: colors.base, borderTopColor: colors.borderSubtle }]}>
        {([
          { key: 'home' as DemoTab, label: 'Home', Icon: DollarSign },
          { key: 'portfolio' as DemoTab, label: 'Portfolio', Icon: TrendingUp },
          { key: 'activity' as DemoTab, label: 'Activity', Icon: Receipt },
          { key: 'insights' as DemoTab, label: 'Insights', Icon: Lightbulb },
        ]).map(tab => {
          const isActive = activeTab === tab.key
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => {
                setActiveTab(tab.key)
                setSearchQuery('')
                setActiveFilter('all')
              }}
            >
              {isActive && (
                <LinearGradient
                  colors={gradientColors as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabIndicator}
                />
              )}
              <tab.Icon size={20} color={isActive ? brand.purple : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: isActive ? brand.purple : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Transaction Detail Modal — same as real app */}
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
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.detailMerchantRow}>
                  <CompanyLogo domain={getMerchantDomain(selectedTx.merchant)} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.detailMerchantName, { color: colors.textPrimary }]}>
                      {selectedTx.merchant}
                    </Text>
                    <Text style={[styles.detailTicker, { color: brand.purple }]}>
                      {selectedTx.ticker}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRows}>
                  <DetailRow label="Date" value={formatDate(selectedTx.date)} colors={colors} />
                  <DetailRow label="Merchant" value={selectedTx.merchant} colors={colors} />
                  {selectedTx.memberName && (
                    <DetailRow
                      label={type === 'business' ? 'Department' : 'Member'}
                      value={selectedTx.memberName}
                      colors={colors}
                    />
                  )}
                  <DetailRow label="Category" value={selectedTx.category} colors={colors} />
                  <LinearGradient
                    colors={gradientColors as readonly [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.detailDivider}
                  />
                  <DetailRow label="Amount" value={formatCurrency(selectedTx.amount)} colors={colors} highlight={brand.purple} />
                  <DetailRow label="Round-Up" value={formatCurrency(selectedTx.round_up)} colors={colors} highlight="#06B6D4" />
                  <DetailRow
                    label="Status"
                    value={selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1)}
                    colors={colors}
                  />
                  <DetailRow label="Ticker" value={selectedTx.ticker} colors={colors} highlight={brand.purple} />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Stock Detail Modal — same as real app portfolio.tsx */}
      {selectedHolding && (() => {
        const h = selectedHolding
        const changePercent = h.day_change_pct
        const isPositive = changePercent >= 0
        const changeColor = isPositive ? statusColors.success : statusColors.error
        const costBasis = h.shares * h.avg_price
        const totalGain = h.total_value - costBasis
        const gainIsPositive = totalGain >= 0

        return (
          <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedHolding(null)}>
            <View style={styles.overlay}>
              <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.modalHeaderLeft}>
                    <CompanyLogo domain={h.domain} size={40} />
                    <View>
                      <Text style={[styles.modalTicker, { color: colors.textPrimary }]}>{h.ticker}</Text>
                      <Text style={[styles.modalCompany, { color: colors.textSecondary }]}>{h.companyName}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setSelectedHolding(null)} hitSlop={8}>
                    <X size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.priceSection}>
                    <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                      {formatCurrency(h.current_price)}
                    </Text>
                    <Text style={[styles.priceChange, { color: changeColor }]}>
                      {formatPercent(changePercent)} today
                    </Text>
                  </View>
                  <View style={styles.statsGrid}>
                    {[
                      { label: 'Shares', value: h.shares.toFixed(2) },
                      { label: 'Avg Cost', value: formatCurrency(h.avg_price) },
                      { label: 'Total Value', value: formatCurrency(h.total_value) },
                      {
                        label: 'Total Gain',
                        value: `${gainIsPositive ? '+' : ''}${formatCurrency(totalGain)}`,
                        color: gainIsPositive ? statusColors.success : statusColors.error,
                      },
                    ].map((s) => (
                      <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                        <Text style={[styles.statValue, { color: s.color ?? colors.textPrimary }]}>{s.value}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cost Basis</Text>
                      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatCurrency(costBasis)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Market Value</Text>
                      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatCurrency(h.total_value)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Return</Text>
                      <Text style={[styles.infoValue, { color: gainIsPositive ? statusColors.success : statusColors.error }]}>
                        {formatPercent(costBasis > 0 ? ((h.total_value - costBasis) / costBasis) * 100 : 0)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )
      })()}

      <DemoReceiptModal
        visible={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        roundUpAmount={data.roundUpAmount}
        onComplete={handleReceiptComplete}
      />
    </View>
  )
}

/* ====================
   HOME TAB — mirrors mobile/app/(app)/(user)/index.tsx
   ==================== */

function HomeTab({
  data, type, greeting, firstName, initials,
  colors, statusColors, brand, gradientColors, insets, screenWidth, router, onSelectTx,
  syncing, onSync, onUploadReceipt,
}: {
  data: any; type: string; greeting: string; firstName: string; initials: string
  colors: any; statusColors: any; brand: any; gradientColors: any
  insets: any; screenWidth: number; router: any
  onSelectTx: (tx: DemoTransaction) => void
  syncing: boolean; onSync: () => void; onUploadReceipt: () => void
}) {
  const quickActions = [
    { label: 'Upload Receipt', Icon: Camera, onPress: onUploadReceipt },
    { label: syncing ? 'Syncing...' : 'Sync Bank', Icon: Building, onPress: onSync, disabled: syncing },
    { label: 'View Portfolio', Icon: TrendingUp },
    { label: 'Add Goal', Icon: Target },
  ]

  // Compute KPIs from actual data
  const kpis = useMemo(() => {
    const txs = data.transactions as DemoTransaction[]
    const holdings = data.holdings as DemoHolding[]

    const portfolioValue = holdings.reduce((s: number, h: DemoHolding) => s + h.total_value, 0)
    const portfolioChange = holdings.reduce((s: number, h: DemoHolding) => s + h.day_change * h.shares, 0)
    const roundUpTotal = txs.reduce((s: number, tx: DemoTransaction) => s + tx.round_up, 0)

    const now = new Date()
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthlyRoundUps = txs
      .filter(tx => tx.date.startsWith(thisMonthStr))
      .reduce((s: number, tx: DemoTransaction) => s + tx.round_up, 0)

    const uniqueStocks = holdings.length
    const totalTransactions = txs.length

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    const weeklyTransactions = txs.filter(tx => tx.date >= weekAgoStr).length

    return { portfolioValue, portfolioChange, roundUpTotal, monthlyRoundUps, uniqueStocks, totalTransactions, weeklyTransactions }
  }, [data.transactions, data.holdings])

  const chartData = useMemo(() => buildChartData(data.transactions), [data.transactions])

  return (
    <>
      {/* Header — same as real app */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 54) }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>
              {greeting}, {firstName}
            </Text>
            <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
              Your portfolio is up today
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Badge variant="info">Demo</Badge>
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

      {/* Quick Actions — same horizontal scroll as real app */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContainer}
        style={styles.quickActionsScroll}
      >
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            style={[styles.quickActionBtn, action.disabled && { opacity: 0.5 }]}
            onPress={action.onPress}
            disabled={action.disabled}
          >
            {action.disabled ? (
              <ActivityIndicator size={12} color={colors.textPrimary} />
            ) : (
              <action.Icon size={14} color={colors.textPrimary} />
            )}
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
      >
        {/* KPI Grid — 2x2 same as real app */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<DollarSign size={14} color={colors.textSecondary} />}
              label="Portfolio Value"
              value={formatCurrency(kpis.portfolioValue, 0)}
              trend={`+${formatCurrency(kpis.portfolioChange)} today`}
              trendDirection="up"
            />
          </View>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<ArrowUpDown size={14} color={colors.textSecondary} />}
              label="Round-Ups"
              value={formatCurrency(kpis.roundUpTotal, 0)}
              trend={`+${formatCurrency(kpis.monthlyRoundUps)} this month`}
              trendDirection="up"
            />
          </View>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<BarChart3 size={14} color={colors.textSecondary} />}
              label="Stocks"
              value={formatNumber(kpis.uniqueStocks)}
              trend="Unique holdings"
              trendDirection="neutral"
            />
          </View>
          <View style={styles.kpiCol}>
            <KpiCard
              icon={<Receipt size={14} color={colors.textSecondary} />}
              label="Transactions"
              value={formatNumber(kpis.totalTransactions)}
              trend={`+${kpis.weeklyTransactions} this week`}
              trendDirection="up"
            />
          </View>
        </View>

        {/* Portfolio Growth section — same as real app */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Portfolio Growth
          </Text>
          <Text style={[styles.sectionLink, { color: brand.purple }]}>See All</Text>
        </View>

        <View
          style={[
            styles.chartCard,
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
            <SimpleChart data={chartData} width={screenWidth - 80} height={120} />
          </View>
        </View>

        {/* Recent Transactions section — same as real app */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Transactions
          </Text>
          <Text style={[styles.sectionLink, { color: brand.purple }]}>See All</Text>
        </View>

        <View style={styles.txList}>
          {data.transactions.slice(0, 5).map((tx: DemoTransaction) => (
            <Pressable
              key={tx.id}
              onPress={() => onSelectTx(tx)}
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
                  {tx.memberName ? `${tx.memberName} · ` : ''}{formatDate(tx.date)}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(tx.amount)}
                </Text>
                {tx.round_up > 0 && (
                  <Text style={[styles.txRoundup, { color: statusColors.success }]}>
                    +{formatCurrency(tx.round_up)} {tx.ticker}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.footerLink, { color: brand.purple }]}>
              Back to Demo Selector
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  )
}

/* ====================
   PORTFOLIO TAB — mirrors mobile/app/(app)/(user)/portfolio.tsx
   ==================== */

function PortfolioTab({
  data, colors, statusColors, brand, insets, searchQuery, setSearchQuery, onSelectHolding,
}: {
  data: any; colors: any; statusColors: any; brand: any; insets: any
  searchQuery: string; setSearchQuery: (q: string) => void
  onSelectHolding: (h: DemoHolding) => void
}) {
  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return data.holdings
    const q = searchQuery.toLowerCase()
    return data.holdings.filter(
      (h: DemoHolding) =>
        h.ticker.toLowerCase().includes(q) ||
        h.companyName.toLowerCase().includes(q)
    )
  }, [data.holdings, searchQuery])

  const totalValue = data.holdings.reduce((sum: number, h: DemoHolding) => sum + h.total_value, 0)
  const holdingCount = data.holdings.length

  return (
    <>
      {/* Header — same as real app portfolio screen */}
      <View style={[styles.portfolioHeader, { paddingTop: Math.max(insets.top, 54) }]}>
        <Text style={[styles.portfolioTitle, { color: colors.textPrimary }]}>Portfolio</Text>
        <Text style={[styles.portfolioSubtitle, { color: colors.textSecondary }]}>
          {holdingCount} holding{holdingCount !== 1 ? 's' : ''} · {formatCurrency(totalValue)}
        </Text>
      </View>

      {/* Search bar — same as real app */}
      <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceInput,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search holdings..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Holdings list — GlassCard style same as real app */}
      <ScrollView
        style={{ flex: 1, marginTop: 8 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredHoldings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? 'No holdings match your search' : 'No holdings yet'}
            </Text>
          </View>
        ) : (
          filteredHoldings.map((h: DemoHolding) => {
            const changePercent = h.day_change_pct
            const isPositive = changePercent >= 0
            const changeColor = isPositive ? statusColors.success : statusColors.error

            return (
              <Pressable key={h.ticker} onPress={() => onSelectHolding(h)}>
                <GlassCard padding={16} borderRadius={12} style={styles.holdingCard}>
                  <View style={styles.holdingRow}>
                    <CompanyLogo domain={h.domain} size={40} />
                    <View style={styles.holdingInfo}>
                      <Text style={[styles.holdingTicker, { color: colors.textPrimary }]}>
                        {h.ticker}
                      </Text>
                      <Text
                        style={[styles.holdingName, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {h.companyName}
                      </Text>
                    </View>
                    <View style={styles.holdingRight}>
                      <Text style={[styles.holdingValue, { color: colors.textPrimary }]}>
                        {formatCurrency(h.total_value)}
                      </Text>
                      <Text style={[styles.holdingChange, { color: changeColor }]}>
                        {formatPercent(changePercent)}
                      </Text>
                      <Text style={[styles.holdingShares, { color: colors.textMuted }]}>
                        {h.shares.toFixed(1)} shares
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </>
  )
}

/* ====================
   ACTIVITY TAB — mirrors mobile/app/(app)/(user)/transactions.tsx
   ==================== */

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
]

const statusVariantMap: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
  completed: 'success',
  mapped: 'info',
  pending: 'warning',
  failed: 'error',
}

function ActivityTab({
  data, type, colors, statusColors, brand, gradientColors, insets,
  searchQuery, setSearchQuery, activeFilter, setActiveFilter, onSelectTx,
}: {
  data: any; type: string; colors: any; statusColors: any; brand: any; gradientColors: any; insets: any
  searchQuery: string; setSearchQuery: (q: string) => void
  activeFilter: string; setActiveFilter: (f: string) => void
  onSelectTx: (tx: DemoTransaction) => void
}) {
  const filtered = useMemo(() => {
    let txs = data.transactions as DemoTransaction[]
    if (activeFilter === 'completed') txs = txs.filter(tx => tx.status === 'completed')
    if (activeFilter === 'pending') txs = txs.filter(tx => tx.status === 'pending')
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      txs = txs.filter(tx =>
        tx.merchant.toLowerCase().includes(q) ||
        tx.ticker.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q)
      )
    }
    return txs
  }, [data.transactions, activeFilter, searchQuery])

  // Group by date
  const sections = useMemo(() => {
    const groups: Record<string, DemoTransaction[]> = {}
    for (const tx of filtered) {
      const key = formatDateGroup(tx.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
    }
    return Object.entries(groups).map(([title, txs]) => ({ title, data: txs }))
  }, [filtered])

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* Header — same as real app Activity screen */}
      <View style={styles.activityHeader}>
        <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>Activity</Text>
        <Text style={[styles.activityCount, { color: colors.textSecondary }]}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar — same as real app */}
      <View style={[styles.activitySearchBar, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
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

      {/* Filter Chips — same as real app */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {FILTERS.map(({ key, label }) => {
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
        })}
      </ScrollView>

      {/* Transaction List grouped by date — same as real app */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No transactions found
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              {/* Section header — same as real app */}
              <View style={[styles.sectionDateHeader, { backgroundColor: colors.base }]}>
                <Text style={[styles.sectionDateTitle, { color: colors.textMuted }]}>
                  {section.title}
                </Text>
              </View>
              {section.data.map((tx) => {
                const variant = statusVariantMap[tx.status] ?? 'info'
                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => onSelectTx(tx)}
                    style={[styles.activityTxRow, { borderBottomColor: colors.borderSubtle }]}
                  >
                    <CompanyLogo domain={getMerchantDomain(tx.merchant)} size={40} />
                    <View style={styles.activityTxInfo}>
                      <Text style={[styles.txMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
                        {tx.merchant}
                      </Text>
                      <View style={styles.activityTxMeta}>
                        <Text style={[styles.txDate, { color: colors.textMuted }]}>
                          {tx.memberName ? `${tx.memberName} · ` : ''}{formatDate(tx.date)}
                        </Text>
                        <Badge variant={variant}>{tx.status}</Badge>
                      </View>
                    </View>
                    <View style={styles.activityTxAmounts}>
                      <Text style={[styles.txAmount, { color: colors.textPrimary }]}>
                        {formatCurrency(tx.amount)}
                      </Text>
                      {tx.round_up > 0 && (
                        <Text style={styles.activityTxRoundup}>
                          +{formatCurrency(tx.round_up)}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

/* ====================
   INSIGHTS TAB — mirrors mobile/app/(app)/(user)/insights.tsx
   ==================== */

const TYPE_COLORS: Record<string, string> = {
  saving: '#7C3AED',
  investing: '#3B82F6',
  spending: '#06B6D4',
  default: '#EC4899',
}

function InsightsTab({
  data, colors, brand, gradientColors, insets,
}: {
  data: any; colors: any; brand: any; gradientColors: any; insets: any
}) {
  // Round-up stats computed from demo transactions
  const roundUpStats = useMemo(() => {
    const txs = data.transactions as DemoTransaction[]
    const roundUps = txs.filter(tx => tx.round_up > 0)
    const total = roundUps.reduce((s: number, tx: DemoTransaction) => s + tx.round_up, 0)
    const avg = roundUps.length > 0 ? total / roundUps.length : 0
    const projectedAnnual = avg * roundUps.length * 12
    return { total, avg, projectedAnnual }
  }, [data.transactions])

  // Spending by category computed from demo transactions
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of data.transactions as DemoTransaction[]) {
      map[tx.category] = (map[tx.category] || 0) + tx.amount
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [data.transactions])

  const maxCategorySpend = categorySpending.length > 0 ? categorySpending[0][1] : 1
  const recommendations = data.recommendations as DemoRecommendation[]

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* Header — same as real app Insights screen */}
      <View style={styles.insightsHeader}>
        <Text style={[styles.insightsTitle, { color: colors.textPrimary }]}>AI Insights</Text>
        <Text style={[styles.insightsSubtitle, { color: colors.textSecondary }]}>
          Personalized insights powered by AI
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Recommendations — InsightCard style */}
        <InsightCard
          icon={<Lightbulb size={20} color="#EC4899" />}
          iconBg="rgba(236, 72, 153, 0.15)"
          title="AI Recommendations"
          subtitle={`${recommendations.length} personalized recommendations`}
          colors={colors}
          accentColor="#EC4899"
        >
          <View style={{ gap: 12 }}>
            {recommendations.map((rec, idx) => {
              const typeColor = TYPE_COLORS[rec.type] || TYPE_COLORS.default
              const confidencePercent = Math.round(rec.confidence * 100)
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
        </InsightCard>

        {/* Round-Up Impact — 3 stat cards */}
        <InsightCard
          icon={<ArrowUpDown size={20} color="#06B6D4" />}
          iconBg="rgba(6, 182, 212, 0.15)"
          title="Round-Up Impact"
          colors={colors}
          accentColor="#06B6D4"
        >
          <View style={styles.insightStatsGrid}>
            <View style={[styles.insightStatCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.insightStatLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total Round-Ups</Text>
              <Text style={[styles.insightStatValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(roundUpStats.total)}</Text>
            </View>
            <View style={[styles.insightStatCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.insightStatLabel, { color: colors.textSecondary }]} numberOfLines={1}>Avg per Txn</Text>
              <Text style={[styles.insightStatValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(roundUpStats.avg)}</Text>
            </View>
            <View style={[styles.insightStatCard, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.insightStatLabel, { color: colors.textSecondary }]} numberOfLines={1}>Projected Annual</Text>
              <Text style={[styles.insightStatValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(roundUpStats.projectedAnnual)}</Text>
            </View>
          </View>
        </InsightCard>

        {/* Spending by Category — gradient bars */}
        {categorySpending.length > 0 && (
          <InsightCard
            icon={<TrendingUp size={20} color={brand.purple} />}
            iconBg={`${brand.purple}1A`}
            title="Spending by Category"
            subtitle={`Top ${categorySpending.length} categories`}
            colors={colors}
            accentColor={brand.purple}
          >
            <View style={{ gap: 12 }}>
              {categorySpending.map(([category, amount]) => {
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
      </ScrollView>
    </View>
  )
}

/* ---- InsightCard — matches real app insights.tsx ---- */

function InsightCard({ icon, iconBg, title, subtitle, children, colors, accentColor }: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle?: string
  children: React.ReactNode
  colors: any
  accentColor: string
}) {
  return (
    <GlassCard borderRadius={16} padding={0} style={styles.insightCardWrap}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.insightInner}>
        <View style={styles.insightHeaderRow}>
          <View style={[styles.insightIconCircle, { backgroundColor: iconBg }]}>
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.insightCardTitle, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.insightCardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
        </View>
        {children}
      </View>
    </GlassCard>
  )
}

/* ---- Shared sub-component ---- */

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

/* ---- Styles ---- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header (Home tab) — matches real app index.tsx
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 20, fontWeight: '700' },
  greetingSub: { fontSize: 13, marginTop: 2 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Quick Actions — matches real app
  quickActionsScroll: { flexGrow: 0 },
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
  quickActionLabel: { fontSize: 12, fontWeight: '600' },

  // Main scroll
  dashScroll: { flex: 1 },
  dashScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },

  // KPI Grid — matches real app
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCol: { width: '48%', flexGrow: 1 },

  // Section headers — matches real app
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionLink: { fontSize: 13, fontWeight: '600' },

  // Chart — matches real app
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    height: 180,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  chartLabel: { fontSize: 13, marginBottom: 8 },
  chartArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Transaction list — matches real app
  txList: { gap: 2 },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txMerchant: { fontSize: 14, fontWeight: '600' },
  txDate: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '600' },
  txRoundup: { fontSize: 12, marginTop: 2 },

  // Portfolio tab — matches real app portfolio.tsx
  portfolioHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  portfolioTitle: { fontSize: 20, fontWeight: '700' },
  portfolioSubtitle: { fontSize: 13, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  holdingCard: { marginBottom: 10 },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  holdingInfo: { flex: 1, minWidth: 0 },
  holdingTicker: { fontSize: 15, fontWeight: '700' },
  holdingName: { fontSize: 12, marginTop: 2 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 15, fontWeight: '700' },
  holdingChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  holdingShares: { fontSize: 11, marginTop: 2 },

  // Activity tab — matches real app transactions.tsx
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  activityTitle: { fontSize: 20, fontWeight: '700' },
  activityCount: { fontSize: 13 },
  activitySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  chipScroll: { flexGrow: 0, marginTop: 12, marginBottom: 8 },
  chipRow: { paddingLeft: 20, paddingRight: 40, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  sectionDateHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDateTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activityTxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityTxInfo: { flex: 1, gap: 4 },
  activityTxMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityTxAmounts: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 70,
  },
  activityTxRoundup: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },

  // Empty state
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14 },

  // Footer
  footer: { alignItems: 'center', marginTop: 24 },
  footerLink: { fontSize: 14, fontWeight: '600' },

  // Insights tab — matches real app insights.tsx
  insightsHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  insightsTitle: { fontSize: 20, fontWeight: '700' },
  insightsSubtitle: { fontSize: 13, marginTop: 2 },
  insightCardWrap: { marginBottom: 20, overflow: 'hidden' },
  accentBar: { height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  insightInner: { padding: 20 },
  insightHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  insightIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  insightCardTitle: { fontSize: 16, fontWeight: '700' },
  insightCardSubtitle: { fontSize: 12, marginTop: 2 },
  recCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  recTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  recDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  recFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confidenceBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 2 },
  confidenceText: { fontSize: 11, fontWeight: '500', minWidth: 90 },
  insightStatsGrid: { flexDirection: 'row', gap: 10 },
  insightStatCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  insightStatLabel: { fontSize: 11 },
  insightStatValue: { fontSize: 16, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryName: { fontSize: 13, fontWeight: '500', width: 90 },
  categoryBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 4 },
  categoryAmount: { fontSize: 12, fontWeight: '600', minWidth: 60, textAlign: 'right' },

  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },

  // Modals — same as real app
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTicker: { fontSize: 18, fontWeight: '800' },
  modalCompany: { fontSize: 13, marginTop: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  detailMerchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  detailMerchantName: { fontSize: 18, fontWeight: '700' },
  detailTicker: { fontSize: 14, fontWeight: '600' },
  detailRows: { gap: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14 },
  detailDivider: { height: 1, borderRadius: 1, marginVertical: 4 },
  priceSection: { alignItems: 'center', marginBottom: 20 },
  priceValue: { fontSize: 32, fontWeight: '800' },
  priceChange: { fontSize: 15, fontWeight: '600', marginTop: 4 },
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
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: 12, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600' },
})
