import { useState, useMemo } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import BarChart from '@/components/charts/BarChart'
import type { DemoTransaction, DemoInsight } from './demoData'
import { demoInsights } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

const typeColors: Record<string, string> = {
  investing: '#7C3AED',
  saving: '#06B6D4',
  spending: '#F59E0B',
  general: '#3B82F6',
}

const priorityVariant: Record<string, 'error' | 'warning' | 'info'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
}

export function DemoAiInsightsTab({ transactions: rawTransactions, roundUpOverride }: { transactions: DemoTransaction[]; roundUpOverride?: number }) {
  const transactions = useMemo(() => {
    if (roundUpOverride == null) return rawTransactions
    return rawTransactions.map(t => ({ ...t, round_up: roundUpOverride }))
  }, [rawTransactions, roundUpOverride])
  const [insights, setInsights] = useState<DemoInsight[]>(demoInsights)
  const [refreshing, setRefreshing] = useState(false)

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      map.set(t.category, (map.get(t.category) || 0) + t.amount)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
  }, [transactions])

  const totalRoundUps = useMemo(() => transactions.reduce((s, t) => s + t.round_up, 0), [transactions])
  const avgPerTx = totalRoundUps / (transactions.length || 1)
  const projectedAnnual = avgPerTx * 365 * 1.5

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setInsights([...demoInsights].sort(() => Math.random() - 0.5))
      setRefreshing(false)
    }, 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>AI Recommendations</h2>
        <Button variant="secondary" size="sm" onClick={handleRefresh} loading={refreshing}>
          Refresh Insights
        </Button>
      </div>

      {/* Insights Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {insights.map(insight => (
          <GlassCard key={insight.id} accent="purple" padding="20px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColors[insight.type] }} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: typeColors[insight.type] }}>
                  {insight.type}
                </span>
              </div>
              <Badge variant={priorityVariant[insight.priority]}>{insight.priority}</Badge>
            </div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>{insight.title}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{insight.description}</p>
          </GlassCard>
        ))}
      </div>

      {/* Round-Up Impact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <GlassCard accent="blue" padding="24px">
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Round-Up Impact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total round-ups</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#7C3AED' }}>{fmt(totalRoundUps)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Avg per transaction</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6' }}>{fmt(avgPerTx)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Projected annual</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#06B6D4' }}>{fmt(projectedAnnual)}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard accent="teal" padding="24px">
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Top Spending Categories</p>
          {spendingByCategory.slice(0, 5).map((cat, i) => (
            <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border-divider)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{cat.name}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{fmt(cat.value)}</span>
            </div>
          ))}
        </GlassCard>
      </div>

      <BarChart title="Spending by Category" data={spendingByCategory} dataKey="value" xKey="name" color="#7C3AED" height={260} />
    </div>
  )
}
