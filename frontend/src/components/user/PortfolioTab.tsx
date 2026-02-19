import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import BarChart from '@/components/charts/BarChart'
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
  color: 'var(--text-primary, #F8FAFC)',
  marginBottom: '16px',
}

/* ---- Component ---- */

export function PortfolioTab() {
  const { profile } = useAuth()

  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPortfolios() {
      if (!profile?.id) { setLoading(false); return }
      const { data: rows } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      setPortfolios(rows ?? [])
      setLoading(false)
    }
    fetchPortfolios()
  }, [profile?.id])

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
        ),
      },
      {
        key: 'shares',
        header: 'Shares',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          <span style={{ color: '#F8FAFC', fontSize: '14px' }}>
            {formatNumber(row.shares)}
          </span>
        ),
      },
      {
        key: 'average_price',
        header: 'Avg Price',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          <span style={{ color: 'rgba(248,250,252,0.7)', fontSize: '14px' }}>
            {formatCurrency(row.average_price)}
          </span>
        ),
      },
      {
        key: 'current_price',
        header: 'Current Price',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          <span style={{ color: '#F8FAFC', fontSize: '14px' }}>
            {formatCurrency(row.current_price)}
          </span>
        ),
      },
      {
        key: 'total_value',
        header: 'Total Value',
        sortable: true,
        align: 'right' as const,
        render: (row) => (
          <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>
            {formatCurrency(row.total_value)}
          </span>
        ),
      },
      {
        key: 'gain_loss',
        header: 'Gain/Loss',
        sortable: true,
        align: 'right' as const,
        render: (row) => {
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
    [],
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
          color: 'rgba(248,250,252,0.4)',
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
          label="Total Value"
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
          label="Holdings"
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
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
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
