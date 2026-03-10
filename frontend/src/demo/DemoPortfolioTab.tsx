import { useMemo } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import BarChart from '@/components/charts/BarChart'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import type { DemoHolding } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

export function DemoPortfolioTab({ holdings }: { holdings: DemoHolding[] }) {
  const totalAllocated = useMemo(() => holdings.reduce((s, h) => s + h.total_value, 0), [holdings])
  const totalShares = useMemo(() => holdings.reduce((s, h) => s + h.shares, 0), [holdings])

  const chartData = useMemo(
    () => holdings.map(h => ({ name: h.ticker, value: Math.round(h.total_value * 100) / 100 })),
    [holdings],
  )

  const columns: Column<DemoHolding>[] = useMemo(() => [
    {
      key: 'ticker',
      header: 'Ticker',
      render: r => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CompanyLogo name={r.ticker} size={22} />
          <span style={{ fontWeight: 700, color: '#7C3AED' }}>{r.ticker}</span>
          {r.shares === 0 && <Badge variant="warning">Pending</Badge>}
        </div>
      ),
    },
    { key: 'shares', header: 'Shares', align: 'right' as const, render: r => <span>{r.shares.toFixed(4)}</span> },
    { key: 'avg_price', header: 'Avg Price', align: 'right' as const, render: r => <span>{fmt(r.avg_price)}</span> },
    {
      key: 'current_price',
      header: 'Current Price',
      align: 'right' as const,
      render: r => (
        <div style={{ textAlign: 'right' }}>
          <div>{fmt(r.current_price)}</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: r.day_change >= 0 ? '#34D399' : '#F87171' }}>
            {r.day_change >= 0 ? '+' : ''}{r.day_change_pct.toFixed(2)}%
          </div>
        </div>
      ),
    },
    { key: 'total_value', header: 'Value', align: 'right' as const, render: r => <span style={{ fontWeight: 600 }}>{fmt(r.total_value)}</span> },
    {
      key: 'gain',
      header: 'Gain/Loss',
      align: 'right' as const,
      render: r => {
        const gain = (r.current_price - r.avg_price) * r.shares
        const pct = ((r.current_price - r.avg_price) / r.avg_price) * 100
        const isUp = gain >= 0
        return (
          <span style={{ fontWeight: 600, color: isUp ? '#34D399' : '#F87171' }}>
            {isUp ? '+' : ''}{fmt(gain)} ({isUp ? '+' : ''}{pct.toFixed(1)}%)
          </span>
        )
      },
    },
  ], [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Allocated" value={fmt(totalAllocated)} accent="purple" />
        <KpiCard label="Total Shares" value={totalShares.toFixed(3)} accent="blue" />
        <KpiCard label="Unique Stocks" value={holdings.length} accent="teal" />
      </div>

      <GlassCard accent="purple" padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Holdings</p>
        <Table<DemoHolding> columns={columns} data={holdings} loading={false} emptyMessage="No holdings yet" pageSize={10} />
      </GlassCard>

      <BarChart title="Portfolio Allocation" data={chartData} dataKey="value" xKey="name" color="#7C3AED" height={260} />
    </div>
  )
}
