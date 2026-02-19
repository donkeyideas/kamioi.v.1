import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, KpiCard, Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'
import BarChart from '@/components/charts/BarChart'

/* ---- Types ---- */

interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  role: string
  status: string
  users: {
    id: number
    name: string
  } | null
}

interface Holding {
  id: number
  user_id: number
  ticker: string
  shares: number
  avg_price: number
  current_price: number
}

interface HoldingRow {
  id: number
  ticker: string
  shares: number
  avg_price: number
  current_price: number
  gainLoss: number
  memberName: string
}

/* ---- Formatting helpers ---- */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

/* ---- Inline SVG Icons ---- */

function ValueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function HoldingsCountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

/* ---- KPI Grid Style ---- */

const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '20px',
}

/* ---- Table columns ---- */

const columns: Column<HoldingRow>[] = [
  {
    key: 'ticker',
    header: 'Ticker',
    width: '100px',
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: 700, color: '#A78BFA', fontSize: '13px' }}>
        {row.ticker}
      </span>
    ),
  },
  {
    key: 'shares',
    header: 'Shares',
    align: 'right',
    width: '100px',
    sortable: true,
    render: (row) => (
      <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
        {row.shares.toFixed(4)}
      </span>
    ),
  },
  {
    key: 'avg_price',
    header: 'Avg Price',
    align: 'right',
    width: '110px',
    render: (row) => (
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
        {formatCurrency(row.avg_price)}
      </span>
    ),
  },
  {
    key: 'current_price',
    header: 'Current Price',
    align: 'right',
    width: '120px',
    render: (row) => (
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>
        {formatCurrency(row.current_price)}
      </span>
    ),
  },
  {
    key: 'gainLoss',
    header: 'Gain/Loss',
    align: 'right',
    width: '120px',
    sortable: true,
    render: (row) => {
      const isPositive = row.gainLoss >= 0
      return (
        <Badge variant={isPositive ? 'success' : 'error'}>
          {isPositive ? '+' : ''}{formatCurrency(row.gainLoss)}
        </Badge>
      )
    },
  },
  {
    key: 'memberName',
    header: 'Member',
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {row.memberName}
      </span>
    ),
  },
]

/* ---- Component ---- */

export function FamilyPortfolioTab() {
  const { profile } = useAuth()

  const [holdingRows, setHoldingRows] = useState<HoldingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) { setLoading(false); return }

      const { data: memberRecord } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', profile.id)
        .single()

      if (!memberRecord) { setLoading(false); return }

      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('*, users(id, name)')
        .eq('family_id', memberRecord.family_id)

      const membersData = (familyMembers ?? []) as FamilyMember[]
      const memberUserIds = membersData.map((m) => m.user_id)

      if (memberUserIds.length === 0) { setLoading(false); return }

      const { data: holdingsData } = await supabase
        .from('holdings')
        .select('*')
        .in('user_id', memberUserIds)

      const memberNameMap = new Map<number, string>()
      for (const m of membersData) {
        memberNameMap.set(m.user_id, m.users?.name ?? 'Unknown')
      }

      const rows: HoldingRow[] = ((holdingsData ?? []) as Holding[]).map((h) => ({
        id: h.id,
        ticker: h.ticker,
        shares: h.shares,
        avg_price: h.avg_price,
        current_price: h.current_price,
        gainLoss: (h.current_price - h.avg_price) * h.shares,
        memberName: memberNameMap.get(h.user_id) ?? 'Unknown',
      }))

      setHoldingRows(rows)
      setLoading(false)
    }
    fetchData()
  }, [profile?.id])

  /* ---- Computed KPIs ---- */

  const totalValue = useMemo(
    () => holdingRows.reduce((sum, h) => sum + h.shares * h.current_price, 0),
    [holdingRows],
  )

  const totalGainLoss = useMemo(
    () => holdingRows.reduce((sum, h) => sum + h.gainLoss, 0),
    [holdingRows],
  )

  const holdingsCount = holdingRows.length

  /* ---- Chart data: allocation by ticker ---- */

  const allocationData = useMemo(() => {
    const tickerMap = new Map<string, number>()
    for (const h of holdingRows) {
      const value = h.shares * h.current_price
      tickerMap.set(h.ticker, (tickerMap.get(h.ticker) ?? 0) + value)
    }
    return Array.from(tickerMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [holdingRows])

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
        Loading family portfolio...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Row */}
      <div style={kpiGridStyle}>
        <KpiCard
          label="Total Value"
          value={formatCurrency(totalValue)}
          accent="purple"
          icon={<ValueIcon />}
        />
        <KpiCard
          label="Total Gain/Loss"
          value={`${totalGainLoss >= 0 ? '+' : ''}${formatCurrency(totalGainLoss)}`}
          changeType={totalGainLoss >= 0 ? 'positive' : 'neutral'}
          accent="blue"
          icon={<TrendIcon />}
        />
        <KpiCard
          label="Holdings Count"
          value={holdingsCount}
          accent="teal"
          icon={<HoldingsCountIcon />}
        />
      </div>

      {/* Holdings Table */}
      <GlassCard padding="0">
        <Table<HoldingRow>
          columns={columns}
          data={holdingRows}
          loading={false}
          pageSize={15}
          emptyMessage="No family holdings found"
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Portfolio Allocation Chart */}
      <BarChart
        data={allocationData}
        dataKey="value"
        xKey="name"
        title="Portfolio Allocation"
        color="#7C3AED"
        height={280}
      />
    </div>
  )
}
