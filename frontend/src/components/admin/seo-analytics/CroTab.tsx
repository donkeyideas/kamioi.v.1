import { GlassCard } from '@/components/ui/GlassCard'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge } from '@/components/ui/Badge'
import { Table, type Column } from '@/components/ui/Table'
import { CircularGauge } from './CircularGauge'
import { useSeoData } from './useSeoData'
import { RecommendationsPanel } from './RecommendationsPanel'

interface CroData {
  cro_score: number
  funnel: Array<{ stage: string; value: number; percentage: number }>
  ctas: Array<{ page: string; cta_text: string; placement: string; visibility: number }>
  landing_pages: Array<{ page: string; sessions: number; bounce_rate: number; conversion_rate: number; avg_duration: number }>
  metrics: { total_users: number; active_users: number; users_with_transactions: number }
}

export function CroTab() {
  const { data, loading } = useSeoData<CroData>('cro_analysis')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading CRO analysis...</p></GlassCard>
  if (!data) return null

  const landingColumns: Column<CroData['landing_pages'][0]>[] = [
    { key: 'page', header: 'Page', sortable: true },
    { key: 'sessions', header: 'Sessions', sortable: true, align: 'right' },
    { key: 'bounce_rate', header: 'Bounce Rate', sortable: true, align: 'center', render: (r) => <Badge variant={r.bounce_rate <= 40 ? 'success' : r.bounce_rate <= 55 ? 'warning' : 'error'}>{r.bounce_rate}%</Badge> },
    { key: 'conversion_rate', header: 'Conv. Rate', sortable: true, align: 'center', render: (r) => <Badge variant={r.conversion_rate >= 5 ? 'success' : r.conversion_rate >= 2 ? 'warning' : 'error'}>{r.conversion_rate}%</Badge> },
    { key: 'avg_duration', header: 'Avg Duration', sortable: true, align: 'right', render: (r) => `${Math.floor(r.avg_duration / 60)}m ${r.avg_duration % 60}s` },
  ]

  const ctaColumns: Column<CroData['ctas'][0]>[] = [
    { key: 'page', header: 'Page' },
    { key: 'cta_text', header: 'CTA Text', render: (r) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.cta_text}</span> },
    { key: 'placement', header: 'Placement' },
    { key: 'visibility', header: 'Visibility', align: 'center', sortable: true, render: (r) => <Badge variant={r.visibility >= 90 ? 'success' : r.visibility >= 70 ? 'warning' : 'error'}>{r.visibility}%</Badge> },
  ]

  const maxFunnelVal = data.funnel[0]?.value || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* CRO Score + KPIs */}
      <GlassCard>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
          <CircularGauge score={data.cro_score} size={140} label="CRO Score" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <KpiCard label="Total Users" value={data.metrics.total_users} accent="purple" />
            <KpiCard label="Active Users" value={data.metrics.active_users} accent="blue" />
            <KpiCard label="With Transactions" value={data.metrics.users_with_transactions} accent="teal" />
          </div>
        </div>
      </GlassCard>

      {/* Conversion Funnel */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Conversion Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.funnel.map((step, i) => {
            const width = Math.max(8, (step.value / maxFunnelVal) * 100)
            const colors = ['#7C3AED', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B']
            return (
              <div key={step.stage} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '160px' }}>{step.stage}</span>
                <div style={{ flex: 1, position: 'relative' }}>
                  <div style={{
                    height: '32px', borderRadius: '8px', background: colors[i % colors.length],
                    width: `${width}%`, display: 'flex', alignItems: 'center', paddingLeft: '12px',
                    transition: 'width 600ms ease', opacity: 0.85,
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                      {step.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '45px', textAlign: 'right' }}>
                  {step.percentage}%
                </span>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Landing Page Performance */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Landing Page Performance</h3>
        <Table columns={landingColumns} data={data.landing_pages} pageSize={10} />
      </GlassCard>

      {/* CTA Effectiveness */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>CTA Effectiveness</h3>
        <Table columns={ctaColumns} data={data.ctas} pageSize={10} />
      </GlassCard>

      {/* CRO Recommendations */}
      <RecommendationsPanel category="cro" />
    </div>
  )
}
