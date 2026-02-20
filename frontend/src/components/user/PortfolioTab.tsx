import { useState, useEffect, useMemo } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import BarChart from '@/components/charts/BarChart'
import { Badge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { fetchStockPrices, type StockQuote } from '@/services/stockPrices'
import type { Database } from '@/types/database'

/* ---- Types ---- */

type Portfolio = Database['public']['Tables']['portfolios']['Row']

/* ---- Inline SVG Icons ---- */

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
  )
}

function PieIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
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

function formatNumber(value: number, decimals: number = 4): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/* ---- Styles ---- */

const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '16px',
}

/* ---- Component ---- */

export function PortfolioTab() {
  const { userId, loading: userLoading } = useUserId()

  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [prices, setPrices] = useState<Map<string, StockQuote>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPortfolios() {
      if (!userId) { setLoading(false); return }
      const { data: rows } = await supabaseAdmin
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
      const pf = rows ?? []
      setPortfolios(pf)
      setLoading(false)

      // Fetch live stock prices
      if (pf.length > 0) {
        const tickers = pf.map((p) => p.ticker)
        const quotes = await fetchStockPrices(tickers)
        if (quotes.size > 0) setPrices(quotes)
      }
    }
    if (!userLoading) fetchPortfolios()
  }, [userId, userLoading])

  /* ---- Computed KPIs ---- */

  const totalValue = useMemo(
    () => portfolios.reduce((sum, p) => sum + p.total_value, 0),
    [portfolios],
  )

  const totalShares = useMemo(
    () => portfolios.reduce((sum, p) => sum + p.shares, 0),
    [portfolios],
  )

  const holdingsCount = useMemo(
    () => new Set(portfolios.map((p) => p.ticker)).size,
    [portfolios],
  )

  /* ---- Table columns ---- */

  const holdingsColumns: Column<Portfolio>[] = useMemo(
    () => [
      {
        key: 'ticker',
        header: 'Ticker',
        sortable: true,
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={row.ticker} size={22} />
            <span
              style={{
                fontWeight: 700,
                color: '#7C3AED',
                fontSize: '14px',
                letterSpacing: '0.02em',
              }}
            >
              {row.ticker}
            </span>
          </div>
        ),
      },
      {
        key: 'shares',
        header: 'Shares',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          row.shares > 0 ? (
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
              {formatNumber(row.shares)}
            </span>
          ) : (
            <Badge variant="warning">Pending</Badge>
          )
        ),
      },
      {
        key: 'average_price',
        header: 'Avg Price',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {formatCurrency(row.average_price)}
          </span>
        ),
      },
      {
        key: 'current_price',
        header: 'Current Price',
        sortable: true,
        align: 'right' as const,
        render: (row) => {
          const quote = prices.get(row.ticker)
          const price = quote?.price ?? row.current_price
          const dayChange = quote?.changePercent ?? 0
          const isUp = dayChange >= 0

          return (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                {formatCurrency(price)}
              </div>
              {quote && (
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isUp ? '#34D399' : '#F87171',
                  }}
                >
                  {isUp ? '+' : ''}{dayChange.toFixed(2)}%
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'total_value',
        header: 'Total Value',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
            {formatCurrency(row.total_value)}
          </span>
        ),
      },
      {
        key: 'gain_loss',
        header: 'Status',
        sortable: true,
        align: 'right' as const,
        render: (row) => {
          if (row.shares === 0) {
            return (
              <span style={{ color: '#FBBF24', fontWeight: 600, fontSize: '13px' }}>
                Awaiting Purchase
              </span>
            )
          }
          const gainLoss = (row.current_price - row.average_price) * row.shares
          const isPositive = gainLoss >= 0
          return (
            <span
              style={{
                color: isPositive ? '#34D399' : '#F87171',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {isPositive ? '+' : ''}{formatCurrency(gainLoss)}
            </span>
          )
        },
      },
    ],
    [prices],
  )

  /* ---- Chart data: value by ticker ---- */

  const chartData = useMemo(() => {
    if (portfolios.length === 0) return []
    return portfolios.map((p) => ({
      name: p.ticker,
      value: Math.round(p.total_value * 100) / 100,
    }))
  }, [portfolios])

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
        Loading portfolio...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Row */}
      <div style={kpiGridStyle}>
        <KpiCard
          label="Total Allocated"
          value={formatCurrency(totalValue)}
          accent="purple"
          icon={<WalletIcon />}
        />
        <KpiCard
          label="Total Shares"
          value={formatNumber(totalShares, 4)}
          accent="blue"
          icon={<LayersIcon />}
        />
        <KpiCard
          label="Unique Stocks"
          value={holdingsCount}
          accent="teal"
          icon={<PieIcon />}
        />
      </div>

      {/* Holdings Table */}
      <GlassCard accent="purple" padding="24px">
        <p style={sectionTitleStyle}>Holdings</p>
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
            marginBottom: '12px',
          }}
        />
        <Table<Portfolio>
          columns={holdingsColumns}
          data={portfolios}
          loading={false}
          emptyMessage="No holdings yet"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Portfolio Allocation Chart */}
      <BarChart
        title="Portfolio Allocation"
        data={chartData}
        dataKey="value"
        xKey="name"
        color="#7C3AED"
        height={280}
      />
    </div>
  )
}
