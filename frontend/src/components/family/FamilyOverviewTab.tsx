import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { fetchStockPrices, type StockQuote } from '@/services/stockPrices'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import AreaChart from '@/components/charts/AreaChart'
import { COMPANY_LOOKUP, CompanyLogo, CompanyLink } from '@/components/common/CompanyLogo'

/* ---- Types ---- */

interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  role: string
  status: string
  joined_at: string
  users: {
    id: number
    name: string
    email: string
  } | null
}

interface Transaction {
  id: number
  user_id: number
  merchant: string | null
  amount: number
  round_up: number
  category: string | null
  status: string
  date: string
  created_at: string
}

interface Holding {
  id: number
  user_id: number
  ticker: string
  shares: number
  avg_price: number
  current_price: number
}

interface Goal {
  id: number
  user_id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  status: string
}

/* ---- Inline SVG Icons ---- */

function PortfolioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function RoundUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function MembersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function GoalsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

/* ---- Helpers ---- */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/* ---- Styles ---- */

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
}

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: '20px',
  marginTop: '20px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '16px',
}

const progressBarBgStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: 'var(--surface-input)',
  overflow: 'hidden',
}

/* ---- Table columns for recent transactions ---- */

interface FamilyTransaction extends Transaction {
  memberName: string
}

const recentTxColumns: Column<FamilyTransaction>[] = [
  {
    key: 'date',
    header: 'Date',
    width: '80px',
    render: (row) => (
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
        {formatDate(row.date)}
      </span>
    ),
  },
  {
    key: 'memberName',
    header: 'Member',
    render: (row) => (
      <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
        {row.memberName}
      </span>
    ),
  },
  {
    key: 'merchant',
    header: 'Merchant',
    render: (row) => {
      const content = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {row.merchant && <CompanyLogo name={row.merchant} size={20} />}
          <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
            {row.merchant ?? '--'}
          </span>
        </div>
      )
      if (row.merchant && COMPANY_LOOKUP[row.merchant]) {
        return <CompanyLink name={row.merchant}>{content}</CompanyLink>
      }
      return content
    },
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right' as const,
    render: (row) => (
      <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
        {formatCurrency(row.amount)}
      </span>
    ),
  },
  {
    key: 'round_up',
    header: 'Round-Up',
    align: 'right' as const,
    render: (row) => (
      <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: '13px' }}>
        {formatCurrency(row.round_up)}
      </span>
    ),
  },
]

/* ---- Component ---- */

export function FamilyOverviewTab() {
  const { userId, loading: userLoading } = useUserId()

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [prices, setPrices] = useState<Map<string, StockQuote>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      if (!userId) { setLoading(false); return }

      // First get the family for this user
      const { data: memberRecord } = await supabaseAdmin
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!memberRecord) { setLoading(false); return }

      const familyId = memberRecord.family_id

      // Get all family members with user info
      const { data: familyMembers } = await supabaseAdmin
        .from('family_members')
        .select('*, users(id, name, email)')
        .eq('family_id', familyId)
        .limit(200)

      const membersData = (familyMembers ?? []) as FamilyMember[]
      setMembers(membersData)

      const memberUserIds = membersData.map((m) => m.user_id)

      if (memberUserIds.length === 0) { setLoading(false); return }

      // Fetch transactions, holdings, goals for all family members
      const [txRes, holdRes, goalRes] = await Promise.all([
        supabaseAdmin
          .from('transactions')
          .select('*')
          .in('user_id', memberUserIds)
          .order('created_at', { ascending: false })
          .limit(50),
        supabaseAdmin
          .from('holdings')
          .select('*')
          .in('user_id', memberUserIds)
          .limit(200),
        supabaseAdmin
          .from('goals')
          .select('*')
          .in('user_id', memberUserIds)
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      // Map member names to transactions
      const memberNameMap = new Map<number, string>()
      for (const m of membersData) {
        memberNameMap.set(m.user_id, m.users?.name ?? 'Unknown')
      }

      const txData = (txRes.data ?? []).map((tx: Transaction) => ({
        ...tx,
        memberName: memberNameMap.get(tx.user_id) ?? 'Unknown',
      }))

      setTransactions(txData)
      const holdingsArr = (holdRes.data ?? []) as Holding[]
      setHoldings(holdingsArr)
      setGoals((goalRes.data ?? []) as Goal[])
      setLoading(false)

      // Fetch live stock prices
      if (holdingsArr.length > 0) {
        const tickers = [...new Set(holdingsArr.map(h => h.ticker))]
        const quotes = await fetchStockPrices(tickers)
        if (quotes.size > 0) setPrices(quotes)
      }
    }
    if (!userLoading) fetchAll()
  }, [userId, userLoading])

  /* ---- Live price helper ---- */

  const getPrice = useCallback(
    (h: Holding) => prices.get(h.ticker)?.price ?? h.current_price,
    [prices],
  )

  /* ---- Computed KPIs ---- */

  const portfolioValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * getPrice(h), 0),
    [holdings, getPrice],
  )

  const totalRoundUps = useMemo(
    () => transactions.reduce((sum, tx) => sum + (tx.round_up ?? 0), 0),
    [transactions],
  )

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active').length,
    [members],
  )

  const goalsProgress = useMemo(() => {
    if (goals.length === 0) return 0
    const totalProgress = goals.reduce((sum, g) => {
      const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
      return sum + Math.min(pct, 100)
    }, 0)
    return Math.round(totalProgress / goals.length)
  }, [goals])

  const recentTransactions = useMemo(
    () => transactions.slice(0, 10),
    [transactions],
  )

  /* ---- Chart data: cumulative round-ups by month ---- */

  const chartData = useMemo(() => {
    if (transactions.length === 0) return []

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const map = new Map<string, { sortKey: string; total: number }>()

    for (const tx of transactions) {
      const d = new Date(tx.date)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const existing = map.get(label)
      if (existing) {
        existing.total += tx.round_up
      } else {
        map.set(label, { sortKey, total: tx.round_up })
      }
    }

    const sorted = Array.from(map.entries())
      .map(([name, { sortKey, total }]) => ({ name, sortKey, total }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

    let cumulative = 0
    return sorted.map(({ name, total }) => {
      cumulative += total
      return { name, value: Math.round(cumulative * 100) / 100 }
    })
  }, [transactions])

  /* ---- Top holdings ---- */

  const topHoldings = useMemo(() => {
    // Aggregate by ticker
    const tickerMap = new Map<string, { shares: number; value: number }>()
    for (const h of holdings) {
      const existing = tickerMap.get(h.ticker) ?? { shares: 0, value: 0 }
      existing.shares += Number(h.shares)
      existing.value += Number(h.shares) * getPrice(h)
      tickerMap.set(h.ticker, existing)
    }
    return Array.from(tickerMap.entries())
      .map(([ticker, data]) => ({ ticker, shares: data.shares, value: data.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [holdings, getPrice])

  const holdingColors = ['#7C3AED', '#3B82F6', '#06B6D4', '#EC4899', '#10B981']

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        Loading family overview...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {/* KPI Row */}
      <div style={gridStyle}>
        <KpiCard
          label="Family Portfolio Value"
          value={formatCurrency(portfolioValue)}
          accent="purple"
          icon={<PortfolioIcon />}
        />
        <KpiCard
          label="Total Round-Ups"
          value={formatCurrency(totalRoundUps)}
          accent="blue"
          icon={<RoundUpIcon />}
        />
        <KpiCard
          label="Active Members"
          value={activeMembers}
          accent="teal"
          icon={<MembersIcon />}
        />
        <KpiCard
          label="Family Goals Progress"
          value={`${goalsProgress}%`}
          accent="pink"
          icon={<GoalsIcon />}
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div style={twoColStyle}>
        {/* Left: Family Portfolio Chart */}
        <AreaChart
          title="Family Portfolio"
          data={chartData}
          dataKey="value"
          xKey="name"
          color="#7C3AED"
          height={260}
        />

        {/* Right: Recent Family Transactions */}
        <GlassCard accent="blue" padding="24px">
          <p style={sectionTitleStyle}>Recent Family Transactions</p>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
              marginBottom: '12px',
            }}
          />
          <Table<FamilyTransaction>
            columns={recentTxColumns}
            data={recentTransactions}
            loading={false}
            emptyMessage="No family transactions yet"
            pageSize={5}
          />
        </GlassCard>
      </div>

      {/* Top Holdings */}
      <div style={{ marginTop: '20px' }}>
        <GlassCard accent="teal" padding="24px">
          <p style={sectionTitleStyle}>Top Holdings</p>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
              marginBottom: '16px',
            }}
          />

          {topHoldings.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
                fontSize: '14px',
              }}
            >
              No holdings yet — sync transactions to start investing
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topHoldings.map((h, idx) => {
                const maxValue = topHoldings[0]?.value ?? 1
                const pct = maxValue > 0 ? (h.value / maxValue) * 100 : 0
                const barColor = holdingColors[idx % holdingColors.length]

                return (
                  <div key={h.ticker}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <CompanyLogo name={h.ticker} size={22} />
                        {h.ticker}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {h.shares.toFixed(4)} shares · {formatCurrency(h.value)}
                      </span>
                    </div>

                    <div style={progressBarBgStyle}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: '4px',
                          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
