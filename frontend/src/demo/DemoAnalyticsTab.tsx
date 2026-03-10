import { useMemo } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import AreaChart from '@/components/charts/AreaChart'
import BarChart from '@/components/charts/BarChart'
import type { DemoTransaction } from './demoData'
import { buildChartData } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

export function DemoAnalyticsTab({ transactions: rawTransactions, roundUpOverride }: { transactions: DemoTransaction[]; roundUpOverride?: number }) {
  const transactions = useMemo(() => {
    if (roundUpOverride == null) return rawTransactions
    return rawTransactions.map(t => ({ ...t, round_up: roundUpOverride }))
  }, [rawTransactions, roundUpOverride])
  const chartData = useMemo(() => buildChartData(transactions), [transactions])

  const monthlySpending = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return transactions.filter(t => new Date(t.date) >= start).reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  const monthlyRoundUps = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return transactions.filter(t => new Date(t.date) >= start).reduce((s, t) => s + t.round_up, 0)
  }, [transactions])

  const topMerchants = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      map.set(t.merchant, (map.get(t.merchant) || 0) + t.amount)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
  }, [transactions])

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      map.set(t.category, (map.get(t.category) || 0) + t.amount)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
  }, [transactions])

  const spendingOverTime = useMemo(
    () => chartData.map(d => ({ name: d.name, value: d.spending })),
    [chartData],
  )

  const roundUpAccumulation = useMemo(
    () => chartData.map(d => ({ name: d.name, value: d.cumulative })),
    [chartData],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KpiCard label="Monthly Spending" value={fmt(monthlySpending)} accent="purple" />
        <KpiCard label="Monthly Round-Ups" value={fmt(monthlyRoundUps)} accent="blue" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <AreaChart title="Spending Over Time" data={spendingOverTime} dataKey="value" xKey="name" color="#3B82F6" height={260} />
        <AreaChart title="Round-Up Accumulation" data={roundUpAccumulation} dataKey="value" xKey="name" color="#7C3AED" height={260} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <BarChart title="Top Merchants" data={topMerchants} dataKey="value" xKey="name" color="#06B6D4" height={260} />
        <BarChart title="Spending by Category" data={spendingByCategory} dataKey="value" xKey="name" color="#7C3AED" height={260} />
      </div>
    </div>
  )
}
