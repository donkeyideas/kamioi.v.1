import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { fetchStockPrices, type StockQuote } from '@/services/stockPrices'
import { KpiCard, GlassCard } from '@/components/ui'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BusinessMember {
  user_id: number
  department: string | null
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
  user_id: number
  ticker: string
  shares: number
  avg_price: number
  current_price: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`
}

function getMonthSortKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function InvestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  )
}

function RoundUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function CategoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function GrowthIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading spinner                                                    */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'biz-analytics-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-analytics-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessAnalyticsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [members, setMembers] = useState<BusinessMember[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [prices, setPrices] = useState<Map<string, StockQuote>>(new Map())
  const [loading, setLoading] = useState(true)

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle()

      if (!bizData) { setLoading(false); return }

      const { data: memberData } = await supabaseAdmin
        .from('business_members')
        .select('user_id, department')
        .eq('business_id', bizData.id)
        .limit(50)

      const memberList = (memberData as BusinessMember[] | null) ?? []
      setMembers(memberList)

      const userIds = memberList.map((m) => m.user_id)

      if (userIds.length > 0) {
        const [txRes, holdRes] = await Promise.all([
          supabaseAdmin
            .from('transactions')
            .select('*')
            .in('user_id', userIds)
            .order('created_at', { ascending: true })
            .limit(500),
          supabaseAdmin
            .from('holdings')
            .select('user_id, shares, avg_price, current_price, ticker')
            .in('user_id', userIds)
            .limit(200),
        ])

        setTransactions((txRes.data as Transaction[] | null) ?? [])
        const holdingsArr = (holdRes.data as Holding[] | null) ?? []
        setHoldings(holdingsArr)

        // Fetch live stock prices
        if (holdingsArr.length > 0) {
          const tickers = [...new Set(holdingsArr.map(h => h.ticker))]
          fetchStockPrices(tickers).then(quotes => {
            if (quotes.size > 0) setPrices(quotes)
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userLoading) void fetchData()
  }, [fetchData, userLoading])

  /* ---- Live price helper ---- */

  const getPrice = useCallback((h: Holding) => prices.get(h.ticker)?.price ?? h.current_price, [prices])

  /* ---- KPI: Total Invested ---- */

  const totalInvested = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * getPrice(h), 0),
    [holdings, getPrice],
  )

  /* ---- KPI: Average Round-Up ---- */

  const avgRoundUp = useMemo(() => {
    const withRoundUp = transactions.filter((tx) => tx.round_up > 0)
    if (withRoundUp.length === 0) return 0
    return withRoundUp.reduce((sum, tx) => sum + tx.round_up, 0) / withRoundUp.length
  }, [transactions])

  /* ---- KPI: Top Category ---- */

  const topCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      const cat = tx.category ?? 'Uncategorized'
      map.set(cat, (map.get(cat) ?? 0) + tx.amount)
    }
    let maxCat = '--'
    let maxVal = 0
    for (const [cat, val] of map.entries()) {
      if (val > maxVal) { maxCat = cat; maxVal = val }
    }
    return maxCat
  }, [transactions])

  /* ---- KPI: Growth Rate ---- */

  const growthRate = useMemo(() => {
    const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avg_price, 0)
    if (totalCost === 0) return 0
    return ((totalInvested - totalCost) / totalCost) * 100
  }, [holdings, totalInvested])

  /* ---- Investment by department (BarChart) ---- */

  const investmentByDept = useMemo(() => {
    const memberDeptMap = new Map<number, string>()
    for (const m of members) {
      memberDeptMap.set(m.user_id, m.department ?? 'Unassigned')
    }

    const holdingsByDept = new Map<string, number>()
    for (const h of holdings) {
      const dept = memberDeptMap.get(h.user_id) ?? 'Unassigned'
      holdingsByDept.set(dept, (holdingsByDept.get(dept) ?? 0) + h.shares * getPrice(h))
    }

    return Array.from(holdingsByDept.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [members, holdings, getPrice])

  /* ---- Monthly spending trends (LineChart) ---- */

  const spendingByMonth = useMemo(() => {
    const map = new Map<string, { sortKey: string; total: number }>()

    for (const tx of transactions) {
      const dateField = tx.date ?? tx.created_at
      const monthLabel = getMonthKey(dateField)
      const sortKey = getMonthSortKey(dateField)
      const existing = map.get(monthLabel)
      if (existing) {
        existing.total += tx.amount
      } else {
        map.set(monthLabel, { sortKey, total: tx.amount })
      }
    }

    return Array.from(map.entries())
      .map(([month, { sortKey, total }]) => ({
        month,
        sortKey,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [transactions])

  /* ---- Top merchants ---- */

  const topMerchants = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      const merchant = tx.merchant || 'Unknown'
      map.set(merchant, (map.get(merchant) ?? 0) + tx.amount)
    }
    return Array.from(map.entries())
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [transactions])

  const maxMerchantTotal = topMerchants.length > 0 ? topMerchants[0].total : 1

  /* ---- Category breakdown ---- */

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      const cat = tx.category ?? 'Uncategorized'
      map.set(cat, (map.get(cat) ?? 0) + tx.amount)
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Analytics
      </h2>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard
          label="Total Invested"
          value={formatCurrency(totalInvested)}
          accent="purple"
          icon={<InvestIcon />}
        />
        <KpiCard
          label="Average Round-Up"
          value={formatCurrency(avgRoundUp)}
          accent="blue"
          icon={<RoundUpIcon />}
        />
        <KpiCard
          label="Top Category"
          value={topCategory}
          accent="teal"
          icon={<CategoryIcon />}
        />
        <KpiCard
          label="Growth Rate"
          value={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
          accent="pink"
          icon={<GrowthIcon />}
        />
      </div>

      {/* Investment by department */}
      <BarChart
        data={investmentByDept}
        dataKey="value"
        xKey="name"
        title="Investment by Department"
        color="#7C3AED"
        height={280}
      />

      {/* Monthly spending trends */}
      <LineChart
        data={spendingByMonth}
        dataKey="total"
        xKey="month"
        title="Monthly Spending Trends"
        color="#3B82F6"
        height={280}
      />

      {/* Top Merchants */}
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
          Top Merchants
        </h3>
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
            marginBottom: '16px',
          }}
        />

        {topMerchants.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '32px 0' }}>
            No transaction data available.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topMerchants.map((m, idx) => {
              const proportion = maxMerchantTotal > 0 ? (m.total / maxMerchantTotal) * 100 : 0
              return (
                <div key={m.merchant} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          background: idx === 0
                            ? 'rgba(124,58,237,0.2)'
                            : idx === 1
                              ? 'rgba(59,130,246,0.15)'
                              : 'var(--surface-input)',
                          color: idx === 0
                            ? '#7C3AED'
                            : idx === 1
                              ? '#3B82F6'
                              : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {m.merchant}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                      {formatCurrency(m.total)}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--surface-input)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${proportion}%`,
                        height: '100%',
                        borderRadius: '3px',
                        background:
                          idx === 0
                            ? 'linear-gradient(90deg, #7C3AED, #3B82F6)'
                            : idx === 1
                              ? 'linear-gradient(90deg, #3B82F6, #06B6D4)'
                              : 'var(--text-muted)',
                        transition: 'width 500ms ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Category Breakdown */}
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
          Category Breakdown
        </h3>
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
            marginBottom: '16px',
          }}
        />

        {categoryBreakdown.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '32px 0' }}>
            No category data available.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {categoryBreakdown.map((cat, idx) => {
              const colors = ['#7C3AED', '#3B82F6', '#06B6D4', '#EC4899', '#FBBF24']
              const color = colors[idx % colors.length]
              return (
                <div
                  key={cat.name}
                  style={{
                    padding: '14px',
                    background: 'var(--surface-input)',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                    {cat.name}
                  </p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {formatCurrency(cat.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
