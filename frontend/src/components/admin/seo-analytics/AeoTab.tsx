import { GlassCard } from '@/components/ui/GlassCard'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge } from '@/components/ui/Badge'
import { Table, type Column } from '@/components/ui/Table'
import { CircularGauge } from './CircularGauge'
import { useSeoData } from './useSeoData'
import { RecommendationsPanel } from './RecommendationsPanel'

interface AeoData {
  aeo_score: number
  voice_search: {
    overall_readiness: number
    pages: Array<{
      url: string; page_name: string
      has_concise_answer: boolean; has_question_headings: boolean
      has_speakable_data: boolean; readiness_score: number
    }>
  }
  featured_snippets: {
    eligible_count: number
    pages: Array<{
      url: string; page_name: string
      has_definition: boolean; has_list: boolean; has_table: boolean
      eligibility: string
    }>
  }
  faq_analysis: {
    pages_with_faq: number; total_questions: number
    pages: Array<{
      url: string; page_name: string
      has_faq_schema: boolean; question_count: number; recommendation: string
    }>
  }
}

export function AeoTab() {
  const { data, loading } = useSeoData<AeoData>('aeo_analysis')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading AEO analysis...</p></GlassCard>
  if (!data) return null

  const voiceColumns: Column<AeoData['voice_search']['pages'][0]>[] = [
    { key: 'page_name', header: 'Page', sortable: true },
    { key: 'has_concise_answer', header: 'Concise Answer', align: 'center', render: (r) => <StatusDot ok={r.has_concise_answer} /> },
    { key: 'has_question_headings', header: 'Q&A Headings', align: 'center', render: (r) => <StatusDot ok={r.has_question_headings} /> },
    { key: 'has_speakable_data', header: 'Speakable', align: 'center', render: (r) => <StatusDot ok={r.has_speakable_data} /> },
    { key: 'readiness_score', header: 'Score', align: 'center', sortable: true, render: (r) => <Badge variant={r.readiness_score >= 70 ? 'success' : r.readiness_score >= 50 ? 'warning' : 'error'}>{r.readiness_score}</Badge> },
  ]

  const snippetColumns: Column<AeoData['featured_snippets']['pages'][0]>[] = [
    { key: 'page_name', header: 'Page', sortable: true },
    { key: 'has_definition', header: 'Definition', align: 'center', render: (r) => <StatusDot ok={r.has_definition} /> },
    { key: 'has_list', header: 'List', align: 'center', render: (r) => <StatusDot ok={r.has_list} /> },
    { key: 'has_table', header: 'Table', align: 'center', render: (r) => <StatusDot ok={r.has_table} /> },
    { key: 'eligibility', header: 'Eligibility', align: 'center', render: (r) => <Badge variant={r.eligibility === 'eligible' ? 'success' : 'warning'}>{r.eligibility === 'eligible' ? 'Eligible' : 'Needs Work'}</Badge> },
  ]

  const faqColumns: Column<AeoData['faq_analysis']['pages'][0]>[] = [
    { key: 'page_name', header: 'Page', sortable: true },
    { key: 'has_faq_schema', header: 'FAQ Schema', align: 'center', render: (r) => <StatusDot ok={r.has_faq_schema} /> },
    { key: 'question_count', header: 'Questions', align: 'center', sortable: true },
    { key: 'recommendation', header: 'Recommendation', render: (r) => <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.recommendation}</span> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* AEO Score + Summary */}
      <GlassCard>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
          <CircularGauge score={data.aeo_score} size={140} label="AEO Score" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <KpiCard label="Voice Search Ready" value={`${data.voice_search.overall_readiness}%`} accent="purple" />
            <KpiCard label="Snippet Eligible" value={data.featured_snippets.eligible_count} accent="blue" />
            <KpiCard label="FAQ Pages" value={data.faq_analysis.pages_with_faq} accent="teal" />
            <KpiCard label="Total Questions" value={data.faq_analysis.total_questions} accent="pink" />
          </div>
        </div>
      </GlassCard>

      {/* Voice Search Readiness */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Voice Search Readiness</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Pages optimized for voice assistants (Siri, Alexa, Google Assistant) with concise answers, question headings, and speakable data.
        </p>
        <Table columns={voiceColumns} data={data.voice_search.pages} pageSize={10} />
      </GlassCard>

      {/* Featured Snippet Eligibility */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Featured Snippet Eligibility</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Pages analyzed for Google Featured Snippet eligibility: definitions, lists, and table content.
        </p>
        <Table columns={snippetColumns} data={data.featured_snippets.pages} pageSize={10} />
      </GlassCard>

      {/* FAQ Schema Analysis */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>FAQ Schema Analysis</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
          FAQ structured data enables rich results in Google and improves answer engine visibility.
        </p>
        <Table columns={faqColumns} data={data.faq_analysis.pages} pageSize={10} />
      </GlassCard>

      {/* AEO Recommendations */}
      <RecommendationsPanel category="aeo" />
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill={ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'} />
      {ok
        ? <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      }
    </svg>
  )
}
