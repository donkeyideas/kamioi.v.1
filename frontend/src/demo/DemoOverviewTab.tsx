import { useMemo } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import AreaChart from '@/components/charts/AreaChart'
import { CompanyLogo, formatMerchantName } from '@/components/common/CompanyLogo'
import type { DemoTransaction, DemoHolding } from './demoData'
import { buildChartData } from './demoData'

/* ---- Icons ---- */

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

/* ---- Helpers ---- */

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ---- Styles ---- */

const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }
const twoColStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '20px' }
const sectionTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }

/* ---- Component ---- */

export function DemoOverviewTab({
  transactions: rawTransactions,
  holdings,
  dashboardLabel,
  roundUpOverride,
}: {
  transactions: DemoTransaction[]
  holdings: DemoHolding[]
  dashboardLabel: string
  roundUpOverride?: number
}) {
  const transactions = useMemo(() => {
    if (roundUpOverride == null) return rawTransactions
    return rawTransactions.map(t => ({ ...t, round_up: roundUpOverride }))
  }, [rawTransactions, roundUpOverride])
  const portfolioValue = useMemo(() => holdings.reduce((s, h) => s + h.total_value, 0), [holdings])

  const roundUpsThisMonth = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return transactions.filter(t => new Date(t.date) >= start).reduce((s, t) => s + t.round_up, 0)
  }, [transactions])

  const chartData = useMemo(() => {
    const data = buildChartData(transactions)
    return data.map(d => ({ name: d.name, value: d.cumulative }))
  }, [transactions])

  const recentTx = useMemo(() => transactions.slice(0, 5), [transactions])

  const columns: Column<DemoTransaction>[] = useMemo(() => [
    { key: 'date', header: 'Date', width: '80px', render: r => <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{fmtDate(r.date)}</span> },
    { key: 'merchant', header: 'Merchant', render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CompanyLogo name={r.merchant} size={20} />
        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{formatMerchantName(r.merchant)}</span>
      </div>
    ) },
    { key: 'amount', header: 'Amount', align: 'right' as const, render: r => <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{fmt(r.amount)}</span> },
    { key: 'round_up', header: 'Round-Up', align: 'right' as const, render: r => <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: '13px' }}>{fmt(r.round_up)}</span> },
  ], [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      <div style={gridStyle}>
        <KpiCard label="Portfolio Value" value={fmt(portfolioValue)} accent="purple" icon={<DollarIcon />} />
        <KpiCard label="Round-Ups This Month" value={fmt(roundUpsThisMonth)} accent="blue" icon={<ArrowsIcon />} />
        <KpiCard label="Unique Stocks" value={holdings.length} accent="teal" icon={<StocksIcon />} />
        <KpiCard label="Transactions" value={transactions.length} accent="pink" icon={<ReceiptIcon />} />
      </div>

      <div style={twoColStyle}>
        <AreaChart title={`${dashboardLabel} Growth`} data={chartData} dataKey="value" xKey="name" color="#7C3AED" height={260} />
        <GlassCard accent="blue" padding="24px">
          <p style={sectionTitleStyle}>Recent Transactions</p>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)', marginBottom: '12px' }} />
          <Table<DemoTransaction> columns={columns} data={recentTx} loading={false} emptyMessage="No transactions yet" pageSize={5} />
        </GlassCard>
      </div>

      <div style={{ marginTop: '20px' }}>
        <GlassCard accent="teal" padding="24px">
          <p style={sectionTitleStyle}>Top Holdings</p>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {holdings.slice(0, 6).map(h => {
              const isUp = h.day_change >= 0
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--surface-input)', borderRadius: '12px', border: '1px solid var(--border-divider)' }}>
                  <CompanyLogo name={h.ticker} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#7C3AED', letterSpacing: '0.02em' }}>{h.ticker}</span>
                      {h.shares === 0 && <Badge variant="warning">Pending</Badge>}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {h.shares.toFixed(3)} shares | {fmt(h.total_value)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(h.current_price)}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isUp ? '#34D399' : '#F87171' }}>
                      {isUp ? '+' : ''}{h.day_change.toFixed(2)} ({isUp ? '+' : ''}{h.day_change_pct.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
