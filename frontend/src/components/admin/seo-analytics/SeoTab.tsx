import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, type Column } from '@/components/ui/Table'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import { CircularGauge } from './CircularGauge'
import { useSeoData } from './useSeoData'
import { RecommendationsPanel } from './RecommendationsPanel'

/* ================================================================
   Types
   ================================================================ */

interface OverviewData {
  scores: { overall: number; technical: number; content: number; geo: number; aeo: number; cro: number } | null
  score_history: Array<{ audit_date: string; overall_score: number; technical_score: number; content_score: number; geo_score: number }>
  issues_by_category: Record<string, number>
  quick_stats: {
    pages_in_sitemap: number; blog_posts: number; api_calls: number
    schema_types_active: number; ai_crawlers_allowed: number
    open_recommendations: number; resolved_recommendations: number; last_audit: string | null
  }
}

interface TechnicalData {
  pages: Array<{
    url: string; page_name: string; score: number
    title: { value: string; length: number; status: string }
    meta_description: { value: string; length: number; status: string }
    h1: { count: number; status: string }
    structured_data: { types: string[]; valid: boolean }
    og_tags: { complete: boolean }
    issues: Array<{ type: string; severity: string; message: string }>
  }>
  checklist: Array<{ item: string; status: boolean }>
  robots: { ai_crawlers: Array<{ name: string; owner: string; allowed: boolean }> }
}

interface ContentData {
  summary: { total_posts: number; avg_score: number; above_80: number; below_50: number }
  posts: Array<{ id: number; title: string; slug: string; status: string; word_count: number; seo_score: number; published_at: string }>
  score_distribution: Array<{ range: string; count: number }>
}

interface StructuredDataResult {
  coverage: Array<{ schema_type: string; count: number; total_pages: number; coverage_pct: number; pages_with: string[] }>
  summary: { total_types: number; active_types: number; pages_with_data: number; total_pages: number }
}

interface GscData {
  rankings: { keywords: Array<{ keyword: string; position: number; impressions: number; clicks: number; ctr: number }>; source: string }
  traffic: { daily: Array<{ date: string; clicks: number; impressions: number }>; sources: Array<{ source: string; sessions: number; percentage: number }>; source: string }
}

/* ================================================================
   Helpers
   ================================================================ */

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/* ================================================================
   Sub-sections
   ================================================================ */

function SeoOverview() {
  const { data, loading, refetch: refetchOverview } = useSeoData<OverviewData>('overview')
  const [auditing, setAuditing] = useState(false)
  const { refetch: runAudit } = useSeoData('run_audit', false)
  const { data: gscData } = useSeoData<GscData>('gsc_data')

  const handleAudit = async () => {
    setAuditing(true)
    await runAudit()
    await refetchOverview()
    setAuditing(false)
  }

  const scores = data?.scores
  const stats = data?.quick_stats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Score Gauges */}
      <GlassCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>SEO Health Score</h3>
          <Button onClick={handleAudit} loading={auditing} size="sm">Run Audit</Button>
        </div>
        {scores ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '24px', justifyItems: 'center' }}>
            <CircularGauge score={scores.overall} label="Overall" />
            <CircularGauge score={scores.technical} label="Technical" />
            <CircularGauge score={scores.content} label="Content" />
            <CircularGauge score={scores.geo} label="GEO" />
            <CircularGauge score={scores.aeo} label="AEO" />
            <CircularGauge score={scores.cro} label="CRO" />
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            {loading ? 'Loading scores...' : 'No audit data yet. Click "Run Audit" to analyze your site.'}
          </p>
        )}
      </GlassCard>

      {/* KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <KpiCard label="Pages in Sitemap" value={stats.pages_in_sitemap} accent="purple" />
          <KpiCard label="Blog Posts" value={stats.blog_posts} accent="blue" />
          <KpiCard label="Schema Types" value={stats.schema_types_active} accent="teal" />
          <KpiCard label="AI Crawlers Allowed" value={stats.ai_crawlers_allowed} accent="blue" />
          <KpiCard label="Open Recommendations" value={stats.open_recommendations} accent="pink" />
        </div>
      )}

      {/* Score Trend Chart */}
      {data?.score_history && data.score_history.length > 1 && (
        <LineChart
          data={data.score_history.map(h => ({ name: h.audit_date, score: h.overall_score }))}
          dataKey="score"
          xKey="name"
          title="SEO Score Trend"
          color="#7C3AED"
          height={280}
        />
      )}

      {/* Daily Search Traffic Chart */}
      {gscData?.traffic?.daily && gscData.traffic.daily.length > 0 && (
        <LineChart
          data={gscData.traffic.daily.map(d => ({ name: d.date.slice(5), clicks: d.clicks }))}
          dataKey="clicks"
          xKey="name"
          title="Daily Search Clicks (30 days)"
          color="#3B82F6"
          height={280}
        />
      )}

      {/* Traffic Sources + Issues Breakdown side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Traffic Sources */}
        {gscData?.traffic?.sources && gscData.traffic.sources.length > 0 && (
          <GlassCard>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Traffic Sources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {gscData.traffic.sources.map(s => (
                <div key={s.source}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.source}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.percentage}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--surface-input)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${s.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', borderRadius: '4px', transition: 'width 600ms ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Issues Breakdown */}
        {data?.issues_by_category && Object.keys(data.issues_by_category).length > 0 && (
          <BarChart
            data={Object.entries(data.issues_by_category).map(([category, count]) => ({ name: category, count: count as number }))}
            dataKey="count"
            xKey="name"
            title="Issues by Category"
            color="#F59E0B"
            height={280}
          />
        )}
      </div>

      {/* Keyword Rankings Preview */}
      {gscData?.rankings?.keywords && gscData.rankings.keywords.length > 0 && (
        <GlassCard>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Top Keywords</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {gscData.rankings.keywords.slice(0, 6).map(kw => (
              <div key={kw.keyword} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface-input)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{kw.keyword}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{kw.clicks.toLocaleString()} clicks &middot; {kw.impressions.toLocaleString()} impressions</div>
                </div>
                <Badge variant={kw.position <= 3 ? 'success' : kw.position <= 10 ? 'info' : 'warning'}>#{kw.position}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}

function TechnicalAudit() {
  const { data, loading } = useSeoData<TechnicalData>('technical_audit')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading technical audit...</p></GlassCard>
  if (!data) return null

  const pageColumns: Column<TechnicalData['pages'][0]>[] = [
    { key: 'page_name', header: 'Page', sortable: true },
    { key: 'score', header: 'Score', sortable: true, align: 'center', render: (r) => <Badge variant={r.score >= 80 ? 'success' : r.score >= 60 ? 'warning' : 'error'}>{r.score}</Badge> },
    { key: 'title', header: 'Title', align: 'center', render: (r) => <Badge variant={r.title.status === 'good' ? 'success' : 'warning'}>{formatStatus(r.title.status)}</Badge> },
    { key: 'meta', header: 'Meta Desc', align: 'center', render: (r) => <Badge variant={r.meta_description.status === 'good' ? 'success' : 'warning'}>{formatStatus(r.meta_description.status)}</Badge> },
    { key: 'h1', header: 'H1', align: 'center', render: (r) => <Badge variant={r.h1.status === 'good' ? 'success' : 'error'}>{formatStatus(r.h1.status)}</Badge> },
    { key: 'schema', header: 'Schema', align: 'center', render: (r) => <Badge variant={r.structured_data.types.length >= 2 ? 'success' : 'warning'}>{r.structured_data.types.length}</Badge> },
    { key: 'og', header: 'OG Tags', align: 'center', render: (r) => <Badge variant={r.og_tags.complete ? 'success' : 'error'}>{r.og_tags.complete ? 'Yes' : 'No'}</Badge> },
    { key: 'issues', header: 'Issues', align: 'center', render: (r) => r.issues.length > 0 ? <Badge variant="warning">{r.issues.length}</Badge> : <Badge variant="success">0</Badge> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Page-by-Page Audit</h3>
        <Table columns={pageColumns} data={data.pages} pageSize={10} />
      </GlassCard>

      {/* Technical Checklist */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Technical Checklist</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {data.checklist.map(c => (
            <div key={c.item} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--surface-input)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="9" fill={c.status ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} />
                {c.status
                  ? <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <path d="M6 6l6 6M12 6l-6 6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                }
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.item}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* AI Crawler Access */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>AI Crawler Access (robots.txt)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {data.robots.ai_crawlers.map(c => (
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
    </div>
  )
}

function ContentAnalysis() {
  const { data, loading } = useSeoData<ContentData>('content_audit')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading content analysis...</p></GlassCard>
  if (!data) return null

  const postColumns: Column<ContentData['posts'][0]>[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'status', header: 'Status', align: 'center', render: (r) => <Badge variant={r.status === 'published' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'word_count', header: 'Words', sortable: true, align: 'center' },
    { key: 'seo_score', header: 'SEO Score', sortable: true, align: 'center', render: (r) => <Badge variant={r.seo_score >= 80 ? 'success' : r.seo_score >= 60 ? 'warning' : 'error'}>{r.seo_score}</Badge> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Posts" value={data.summary.total_posts} accent="purple" />
        <KpiCard label="Avg SEO Score" value={data.summary.avg_score} accent="blue" />
        <KpiCard label="Posts 80+" value={data.summary.above_80} accent="teal" />
        <KpiCard label="Posts Below 50" value={data.summary.below_50} accent="pink" />
      </div>

      {/* Score Distribution */}
      {data.score_distribution.some(d => d.count > 0) && (
        <BarChart
          data={data.score_distribution}
          dataKey="count"
          xKey="range"
          title="SEO Score Distribution"
          color="#3B82F6"
          height={250}
        />
      )}

      {/* Posts Table */}
      {data.posts.length > 0 && (
        <GlassCard>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Blog Post SEO Analysis</h3>
          <Table columns={postColumns} data={data.posts} pageSize={10} />
        </GlassCard>
      )}
    </div>
  )
}

function RankingsTraffic() {
  const { data, loading } = useSeoData<GscData>('gsc_data')
  const { data: status } = useSeoData<{ connected: boolean; source: string; message: string }>('gsc_status')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading rankings & traffic...</p></GlassCard>
  if (!data) return null

  const keywordColumns: Column<GscData['rankings']['keywords'][0]>[] = [
    { key: 'keyword', header: 'Keyword', sortable: true },
    { key: 'position', header: 'Position', sortable: true, align: 'center', render: (r) => (
      <Badge variant={r.position <= 3 ? 'success' : r.position <= 10 ? 'info' : r.position <= 20 ? 'warning' : 'default'}>#{r.position}</Badge>
    )},
    { key: 'impressions', header: 'Impressions', sortable: true, align: 'right', render: (r) => r.impressions.toLocaleString() },
    { key: 'clicks', header: 'Clicks', sortable: true, align: 'right', render: (r) => r.clicks.toLocaleString() },
    { key: 'ctr', header: 'CTR', sortable: true, align: 'right', render: (r) => `${r.ctr.toFixed(1)}%` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Demo banner */}
      {status && !status.connected && (
        <GlassCard accent="blue">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Badge variant="info">Demo Data</Badge>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Connect Google Search Console for real keyword rankings and traffic data.
            </span>
          </div>
        </GlassCard>
      )}

      {/* Traffic Chart */}
      {data.traffic.daily.length > 0 && (
        <LineChart
          data={data.traffic.daily.map(d => ({ name: d.date.slice(5), clicks: d.clicks }))}
          dataKey="clicks"
          xKey="name"
          title="Daily Search Clicks (30 days)"
          color="#3B82F6"
          height={280}
        />
      )}

      {/* Traffic Sources */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Traffic Sources</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.traffic.sources.map(s => (
            <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '120px' }}>{s.source}</span>
              <div style={{ flex: 1, height: '8px', background: 'var(--surface-input)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${s.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', borderRadius: '4px', transition: 'width 600ms ease' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '45px', textAlign: 'right' }}>{s.percentage}%</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Keyword Rankings */}
      <GlassCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Keyword Rankings</h3>
        <Table columns={keywordColumns} data={data.rankings.keywords} pageSize={10} />
      </GlassCard>
    </div>
  )
}

function StructuredData() {
  const { data, loading } = useSeoData<StructuredDataResult>('structured_data')

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading structured data...</p></GlassCard>
  if (!data) return null

  return (
    <GlassCard>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Schema.org Coverage</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px' }}>
        {data.summary.active_types} of {data.summary.total_types} schema types active across {data.summary.pages_with_data} pages
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {data.coverage.map(c => (
          <div key={c.schema_type} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '160px' }}>{c.schema_type}</span>
            <div style={{ flex: 1, height: '8px', background: 'var(--surface-input)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(c.coverage_pct, c.count > 0 ? 4 : 0)}%`, height: '100%', background: c.count > 0 ? (c.coverage_pct >= 50 ? '#10B981' : '#3B82F6') : 'transparent', borderRadius: '4px', transition: 'width 600ms ease' }} />
            </div>
            <span style={{ fontSize: '13px', color: c.count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', minWidth: '120px', textAlign: 'right' }}>
              {c.count > 0 ? `${c.count}/${c.total_pages} pages (${c.coverage_pct}%)` : 'Not active'}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

/* ================================================================
   Main Export
   ================================================================ */

export function SeoTab() {
  const [section, setSection] = useState<'overview' | 'technical' | 'content' | 'rankings' | 'schema' | 'recs'>('overview')

  const navItems: { key: typeof section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'technical', label: 'Technical Audit' },
    { key: 'content', label: 'Content SEO' },
    { key: 'rankings', label: 'Rankings & Traffic' },
    { key: 'schema', label: 'Structured Data' },
    { key: 'recs', label: 'Recommendations' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {navItems.map(n => (
          <button
            key={n.key}
            onClick={() => setSection(n.key)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, transition: 'all 200ms ease',
              background: section === n.key ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : 'var(--surface-input)',
              color: section === n.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {n.label}
          </button>
        ))}
      </div>

      {section === 'overview' && <SeoOverview />}
      {section === 'technical' && <TechnicalAudit />}
      {section === 'content' && <ContentAnalysis />}
      {section === 'rankings' && <RankingsTraffic />}
      {section === 'schema' && <StructuredData />}
      {section === 'recs' && <RecommendationsPanel category="technical,content,structured_data" />}
    </div>
  )
}
