import { useState, useEffect, useMemo } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, KpiCard, Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'
import BarChart from '@/components/charts/BarChart'
import { fetchStockPrices, type StockQuote } from '@/services/stockPrices'
import { CompanyLogo } from '@/components/common/CompanyLogo'

/* ---- Types ---- */

interface BusinessMember {
  id: number
  business_id: number
  user_id: number
  role: string
  department: string | null
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
  totalValue: number
  gainLoss: number
  memberName: string
  department: string
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

/* ---- KPI Grid Style ---- */

const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '20px',
}

/* ---- Component ---- */

export function BusinessPortfolioTab() {
  const { userId, loading: userLoading } = useUserId()

  const [rawHoldings, setRawHoldings] = useState<Holding[]>([])
  const [memberInfoMap, setMemberInfoMap] = useState<Map<number, { name: string; department: string }>>(new Map())
  const [prices, setPrices] = useState<Map<string, StockQuote>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) { setLoading(false); return }

      const { data: memberRecord } = await supabaseAdmin
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!memberRecord) { setLoading(false); return }

      const { data: businessMembers } = await supabaseAdmin
        .from('business_members')
        .select('*, users(id, name)')
        .eq('business_id', memberRecord.business_id)
        .limit(50)

      const membersData = (businessMembers ?? []) as BusinessMember[]
      const memberUserIds = membersData.map((m) => m.user_id)

      if (memberUserIds.length === 0) { setLoading(false); return }

      const { data: holdingsData } = await supabaseAdmin
        .from('holdings')
        .select('*')
        .in('user_id', memberUserIds)
        .limit(200)

      const infoMap = new Map<number, { name: string; department: string }>()
      for (const m of membersData) {
        infoMap.set(m.user_id, {
          name: m.users?.name ?? 'Unknown',
          department: m.department ?? 'General',
        })
      }

      const holdingsArr = (holdingsData ?? []) as Holding[]
      setRawHoldings(holdingsArr)
      setMemberInfoMap(infoMap)
      setLoading(false)

      // Fetch live stock prices
      if (holdingsArr.length > 0) {
        const tickers = [...new Set(holdingsArr.map(h => h.ticker))]
        const quotes = await fetchStockPrices(tickers)
        if (quotes.size > 0) setPrices(quotes)
      }
    }
    if (!userLoading) fetchData()
  }, [userId, userLoading])

  /* ---- Derive holdingRows from raw data + live prices ---- */

  const holdingRows = useMemo<HoldingRow[]>(() => {
    return rawHoldings.map((h) => {
      const livePrice = prices.get(h.ticker)?.price ?? h.current_price
      const info = memberInfoMap.get(h.user_id)
      return {
        id: h.id,
        ticker: h.ticker,
        shares: h.shares,
        avg_price: h.avg_price,
        current_price: livePrice,
        totalValue: livePrice * h.shares,
        gainLoss: (livePrice - h.avg_price) * h.shares,
        memberName: info?.name ?? 'Unknown',
        department: info?.department ?? 'General',
      }
    })
  }, [rawHoldings, memberInfoMap, prices])

  /* ---- Table columns ---- */

  const columns = useMemo<Column<HoldingRow>[]>(() => [
    {
      key: 'ticker',
      header: 'Ticker',
      sortable: true,
      render: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#A78BFA', fontSize: '13px' }}>
          <CompanyLogo name={row.ticker} size={22} />
          {row.ticker}
        </span>
      ),
    },
    {
      key: 'shares',
      header: 'Shares',
      align: 'right',
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
      render: (row) => {
        const quote = prices.get(row.ticker)
        const dayChange = quote?.changePercent ?? 0
        const isUp = dayChange >= 0
        return (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>
              {formatCurrency(row.current_price)}
            </div>
            {quote && (
              <div style={{ fontSize: '11px', fontWeight: 600, color: isUp ? '#34D399' : '#F87171' }}>
                {isUp ? '+' : ''}{dayChange.toFixed(2)}%
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
          {formatCurrency(row.totalValue)}
        </span>
      ),
    },
    {
      key: 'gainLoss',
      header: 'Gain/Loss',
      align: 'right',
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
      header: 'Employee',
      render: (row) => (
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.memberName}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.department}</div>
        </div>
      ),
    },
  ], [prices])

  /* ---- Computed KPIs ---- */

  const totalValue = useMemo(
    () => holdingRows.reduce((sum, h) => sum + h.totalValue, 0),
    [holdingRows],
  )

  const totalGainLoss = useMemo(
    () => holdingRows.reduce((sum, h) => sum + h.gainLoss, 0),
    [holdingRows],
  )

  const holdingsCount = holdingRows.length

  const uniqueMembers = useMemo(
    () => new Set(holdingRows.map(h => h.memberName)).size,
    [holdingRows],
  )

  /* ---- Chart data: allocation by ticker ---- */

  const allocationData = useMemo(() => {
    const tickerMap = new Map<string, number>()
    for (const h of holdingRows) {
      tickerMap.set(h.ticker, (tickerMap.get(h.ticker) ?? 0) + h.totalValue)
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
        Loading business portfolio...
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
          label="Holdings"
          value={holdingsCount}
          accent="teal"
          icon={<HoldingsCountIcon />}
        />
        <KpiCard
          label="Participating Employees"
          value={uniqueMembers}
          accent="pink"
          icon={<MembersIcon />}
        />
      </div>

      {/* Holdings Table */}
      <GlassCard padding="0">
        <Table<HoldingRow>
          columns={columns}
          data={holdingRows}
          loading={false}
          pageSize={15}
          emptyMessage="No business holdings found"
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Portfolio Allocation Chart */}
      <BarChart
        data={allocationData}
        dataKey="value"
        xKey="name"
        title="Portfolio Allocation by Ticker"
        color="#7C3AED"
        height={280}
        yTickFormatter={(v) => v.toLocaleString()}
      />
    </div>
  )
}
