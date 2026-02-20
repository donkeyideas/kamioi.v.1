import { useState, useEffect, useMemo } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import AreaChart from '@/components/charts/AreaChart'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { fetchStockPrices, type StockQuote } from '@/services/stockPrices'
import type { Database } from '@/types/database'

/* ---- Types ---- */

type Transaction = Database['public']['Tables']['transactions']['Row']
type Portfolio = Database['public']['Tables']['portfolios']['Row']
type Goal = Database['public']['Tables']['goals']['Row']

/* ---- Inline SVG Icons ---- */

function DollarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function ArrowsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function StocksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v.5" />
      <path d="M12 6v.5" />
    </svg>
  )
}

/* ---- Helper ---- */

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

/* ---- Component ---- */

export function OverviewTab() {
  const { userId, loading: userLoading } = useUserId()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [prices, setPrices] = useState<Map<string, StockQuote>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      if (!userId) { setLoading(false); return }

      const [txRes, pfRes, glRes] = await Promise.all([
        supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabaseAdmin
          .from('portfolios')
          .select('*')
          .eq('user_id', userId)
          .order('total_value', { ascending: false })
          .limit(100),
        supabaseAdmin
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      const pf = pfRes.data ?? []
      setTransactions(txRes.data ?? [])
      setPortfolios(pf)
      setGoals(glRes.data ?? [])
      setLoading(false)

      // Fetch live stock prices for portfolio tickers
      if (pf.length > 0) {
        const tickers = pf.map((p) => p.ticker)
        const quotes = await fetchStockPrices(tickers)
        if (quotes.size > 0) setPrices(quotes)
      }
    }
    if (!userLoading) fetchAll()
  }, [userId, userLoading])

  /* ---- Computed KPIs ---- */

  const portfolioValue = useMemo(
    () => portfolios.reduce((sum, p) => sum + p.total_value, 0),
    [portfolios],
  )

  const roundUpsThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return transactions
      .filter((tx) => new Date(tx.date) >= monthStart)
      .reduce((sum, tx) => sum + tx.round_up, 0)
  }, [transactions])

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions],
  )

  /* ---- Recent Transactions columns (with logos) ---- */

  const recentTxColumns: Column<Transaction>[] = useMemo(
    () => [
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
        key: 'merchant',
        header: 'Merchant',
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={row.merchant} size={20} />
            <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
              {row.merchant}
            </span>
          </div>
        ),
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
    ],
    [],
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
        Loading overview...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {/* KPI Row */}
      <div style={gridStyle}>
        <KpiCard
          label="Portfolio Value"
          value={formatCurrency(portfolioValue)}
          accent="purple"
          icon={<DollarIcon />}
        />
        <KpiCard
          label="Round-Ups This Month"
          value={formatCurrency(roundUpsThisMonth)}
          accent="blue"
          icon={<ArrowsIcon />}
        />
        <KpiCard
          label="Unique Stocks"
          value={portfolios.length}
          accent="teal"
          icon={<StocksIcon />}
        />
        <KpiCard
          label="Transactions"
          value={transactions.length}
          accent="pink"
          icon={<ReceiptIcon />}
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div style={twoColStyle}>
        {/* Left: Portfolio Growth Chart */}
        <AreaChart
          title="Portfolio Growth"
          data={chartData}
          dataKey="value"
          xKey="name"
          color="#7C3AED"
          height={260}
        />

        {/* Right: Recent Transactions */}
        <GlassCard accent="blue" padding="24px">
          <p style={sectionTitleStyle}>Recent Transactions</p>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
              marginBottom: '12px',
            }}
          />
          <Table<Transaction>
            columns={recentTxColumns}
            data={recentTransactions}
            loading={false}
            emptyMessage="No transactions yet"
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

          {portfolios.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
                fontSize: '14px',
              }}
            >
              No holdings yet — sync your bank to start investing
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {portfolios.slice(0, 6).map((holding) => {
                const quote = prices.get(holding.ticker)
                const currentPrice = quote?.price ?? holding.current_price
                const dayChange = quote?.change ?? 0
                const dayChangePct = quote?.changePercent ?? 0
                const isUp = dayChange >= 0

                return (
                  <div
                    key={holding.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      background: 'var(--surface-input)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-divider)',
                    }}
                  >
                    {/* Logo */}
                    <CompanyLogo name={holding.ticker} size={36} />

                    {/* Ticker + Status */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#7C3AED',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {holding.ticker}
                        </span>
                        {holding.shares === 0 && (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Allocated: {formatCurrency(holding.total_value)}
                      </span>
                    </div>

                    {/* Price + Change */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {currentPrice > 0 ? (
                        <>
                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {formatCurrency(currentPrice)}
                          </div>
                          {quote && (
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: isUp ? '#34D399' : '#F87171',
                              }}
                            >
                              {isUp ? '+' : ''}{dayChange.toFixed(2)} ({isUp ? '+' : ''}{dayChangePct.toFixed(2)}%)
                            </div>
                          )}
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#FBBF24',
                            fontWeight: 600,
                          }}
                        >
                          Awaiting
                        </span>
                      )}
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
