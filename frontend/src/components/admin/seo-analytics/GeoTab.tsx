import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Table, type Column } from '@/components/ui/Table'
import { CircularGauge } from './CircularGauge'
import { useSeoData } from './useSeoData'
import { RecommendationsPanel } from './RecommendationsPanel'

interface GeoData {
  geo_score: number
  score_breakdown: Array<{ category: string; score: number; max: number }>
  crawler_monitor: Array<{ name: string; owner: string; allowed: boolean }>
  page_readiness: Array<{
    url: string; page_name: string
    clarity: number; factual_density: number; structure_quality: number
    citation_strength: number; freshness: number; overall: number
  }>
  faq_coverage: { pages_with_faq: number; total_questions: number }
  ai_search_simulation: Array<{ query: string; source_page: string; snippet: string; confidence: string; schemas: string[] }>
}

export function GeoTab() {
  const { data, loading } = useSeoData<GeoData>('geo_analysis')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading GEO analysis...</p></GlassCard>
  if (!data) return null

  const readinessColumns: Column<GeoData['page_readiness'][0]>[] = [
    { key: 'page_name', header: 'Page', sortable: true },
    { key: 'clarity', header: 'Clarity', align: 'center', sortable: true, render: (r) => <ScoreCell value={r.clarity} /> },
    { key: 'factual_density', header: 'Factual', align: 'center', sortable: true, render: (r) => <ScoreCell value={r.factual_density} /> },
    { key: 'structure_quality', header: 'Structure', align: 'center', sortable: true, render: (r) => <ScoreCell value={r.structure_quality} /> },
    { key: 'citation_strength', header: 'Citation', align: 'center', sortable: true, render: (r) => <ScoreCell value={r.citation_strength} /> },
    { key: 'freshness', header: 'Freshness', align: 'center', sortable: true, render: (r) => <ScoreCell value={r.freshness} /> },
    { key: 'overall', header: 'Overall', align: 'center', sortable: true, render: (r) => <Badge variant={r.overall >= 80 ? 'success' : r.overall >= 60 ? 'warning' : 'error'}>{r.overall}</Badge> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* GEO Score + Breakdown */}
      <GlassCard>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
          <CircularGauge score={data.geo_score} size={140} label="GEO Readiness" />
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Score Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.score_breakdown.map(b => (
                <div key={b.category} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '140px' }}>{b.category}</span>
                  <div style={{ flex: 1, height: '8px', background: 'var(--surface-input)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${b.score}%`, height: '100%', background: b.score >= 80 ? '#10B981' : b.score >= 60 ? '#F59E0B' : '#EF4444', borderRadius: '4px', transition: 'width 600ms ease' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '50px', textAlign: 'right' }}>{b.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* AI Crawler Monitor */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>AI Crawler Monitor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {data.crawler_monitor.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--surface-input)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.owner}</div>
              </div>
              <Badge variant={c.allowed ? 'success' : 'error'}>{c.allowed ? 'Allowed' : 'Blocked'}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Per-Page AI Readiness */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Page AI-Readiness Scores</h3>
        <Table columns={readinessColumns} data={data.page_readiness} pageSize={10} />
      </GlassCard>

      {/* FAQ Coverage */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>FAQ Schema Coverage</h3>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 24px', background: 'var(--surface-input)', borderRadius: '12px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{data.faq_coverage.pages_with_faq}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pages with FAQ</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 24px', background: 'var(--surface-input)', borderRadius: '12px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{data.faq_coverage.total_questions}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Questions</span>
          </div>
        </div>
      </GlassCard>

      {/* AI Search Simulation */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>AI Search Simulation</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {data.ai_search_simulation.map(sim => (
            <div key={sim.query} style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>"{sim.query}"</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>{sim.snippet}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant={sim.confidence === 'high' ? 'success' : sim.confidence === 'medium' ? 'warning' : 'error'}>{sim.confidence} confidence</Badge>
                {sim.schemas.map(s => <Badge key={s} variant="purple">{s}</Badge>)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Source: {sim.source_page}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* GEO Recommendations */}
      <RecommendationsPanel category="geo" />
    </div>
  )
}

function ScoreCell({ value }: { value: number }) {
  const color = value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444'
  return <span style={{ fontSize: '13px', fontWeight: 600, color }}>{value}</span>
}
