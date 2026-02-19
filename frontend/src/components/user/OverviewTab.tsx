import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import AreaChart from '@/components/charts/AreaChart'
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

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
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
  color: 'var(--text-primary, #F8FAFC)',
  marginBottom: '16px',
}

const progressBarBgStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
}

/* ---- Mini-table columns ---- */

const recentTxColumns: Column<Transaction>[] = [
  {
    key: 'date',
    header: 'Date',
    width: '80px',
    render: (row) => (
      <span style={{ color: 'rgba(248,250,252,0.6)', fontSize: '13px' }}>
        {formatDate(row.date)}
      </span>
    ),
  },
  {
    key: 'merchant',
    header: 'Merchant',
    render: (row) => (
      <span style={{ color: '#F8FAFC', fontSize: '13px' }}>{row.merchant}</span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right' as const,
    render: (row) => (
      <span style={{ color: '#F8FAFC', fontSize: '13px' }}>
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

export function OverviewTab() {
  const { profile } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      if (!profile?.id) { setLoading(false); return }

      const [txRes, pfRes, glRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
      ])

      setTransactions(txRes.data ?? [])
      setPortfolios(pfRes.data ?? [])
      setGoals(glRes.data ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [profile?.id])

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

  /* ---- Chart data: portfolio value grouped by date ---- */

  const chartData = useMemo(() => {
    if (portfolios.length === 0) return []

    const grouped = new Map<string, number>()
    for (const p of portfolios) {
      const dateKey = new Date(p.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + p.total_value)
    }

    return Array.from(grouped.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))
  }, [portfolios])

  /* ---- Goal accent colors ---- */

  const goalColors = ['#7C3AED', '#3B82F6', '#06B6D4', '#EC4899']

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'rgba(248,250,252,0.4)',
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
          label="Active Goals"
          value={goals.length}
          accent="teal"
          icon={<TargetIcon />}
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
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
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

      {/* Active Goals */}
      <div style={{ marginTop: '20px' }}>
        <GlassCard accent="teal" padding="24px">
          <p style={sectionTitleStyle}>Active Goals</p>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              marginBottom: '16px',
            }}
          />

          {goals.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(248,250,252,0.4)',
                fontSize: '14px',
              }}
            >
              No active goals yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {goals.map((goal, idx) => {
                const pct = Math.min(goal.progress, 100)
                const barColor = goalColors[idx % goalColors.length]

                return (
                  <div key={goal.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--text-primary, #F8FAFC)',
                          }}
                        >
                          {goal.title}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted, rgba(248,250,252,0.5))',
                            marginLeft: '8px',
                          }}
                        >
                          {goal.goal_type}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted, rgba(248,250,252,0.6))',
                        }}
                      >
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </div>
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

                    <div
                      style={{
                        fontSize: '12px',
                        color: barColor,
                        fontWeight: 600,
                        marginTop: '4px',
                        textAlign: 'right',
                      }}
                    >
                      {pct.toFixed(1)}%
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
