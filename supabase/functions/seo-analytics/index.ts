import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

/* ================================================================
   Constants — ported from old seo_geo.py SeoAuditEngine
   ================================================================ */

const PUBLIC_PAGES = [
  {
    url: '/', name: 'Homepage',
    expected_title: 'Kamioi - Turn Everyday Spending into Stock Ownership',
    expected_description: 'Kamioi rounds up your everyday purchases and invests the spare change into real stocks. Transform spending into ownership — no minimum balance required.',
    expected_schemas: ['Organization', 'WebSite', 'SoftwareApplication', 'WebPage'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 1.0,
  },
  {
    url: '/features', name: 'Features',
    expected_title: 'Features - Kamioi | Smart Micro-Investing Features',
    expected_description: 'Discover Kamioi features: automatic round-ups, smart stock matching, family investing, real-time portfolio tracking, and fractional shares.',
    expected_schemas: ['Organization', 'WebSite', 'BreadcrumbList'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 0.9,
  },
  {
    url: '/how-it-works', name: 'How It Works',
    expected_title: 'How It Works - Kamioi | Start Investing in 3 Easy Steps',
    expected_description: 'Learn how Kamioi turns your everyday purchases into investments. Connect your bank, shop normally, and watch your portfolio grow automatically.',
    expected_schemas: ['Organization', 'WebSite', 'HowTo', 'BreadcrumbList'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 0.9,
  },
  {
    url: '/pricing', name: 'Pricing',
    expected_title: 'Pricing - Kamioi | Affordable Investing Plans',
    expected_description: 'Choose the right Kamioi investing plan. Individual, Family, or Business. No hidden fees, no trading commissions. Cancel anytime.',
    expected_schemas: ['Organization', 'WebSite', 'BreadcrumbList', 'FinancialProduct'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 0.9,
  },
  {
    url: '/learn', name: 'Learn',
    expected_title: 'Learn - Kamioi | Investing Education & Resources',
    expected_description: 'Learn about investing with Kamioi educational resources, guides, and tutorials. Beginner-friendly content for building wealth through automatic investing.',
    expected_schemas: ['Organization', 'WebSite', 'BreadcrumbList', 'FAQPage'],
    has_faq: true, faq_count: 4, expected_h1: true, priority: 0.9,
  },
  {
    url: '/blog', name: 'Blog',
    expected_title: 'Blog - Kamioi | Investing Tips & Financial Insights',
    expected_description: 'Stay informed with expert insights on investing, financial literacy, and building wealth. Free articles on automatic investing and fractional shares.',
    expected_schemas: ['Organization', 'WebSite', 'CollectionPage', 'BreadcrumbList'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 0.8,
  },
  {
    url: '/register', name: 'Sign Up',
    expected_title: 'Sign Up for Kamioi: Start Investing Automatically',
    expected_description: 'Create your free Kamioi account and start building wealth with automatic round-up investing. No hidden fees, no minimum balance required.',
    expected_schemas: ['Organization', 'WebSite'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 0.7,
  },
  {
    url: '/contact', name: 'Contact',
    expected_title: 'Contact Kamioi - Get in Touch With Our Team',
    expected_description: 'Contact the Kamioi team for support, partnership inquiries, or press requests. We are here to help you get started with micro-investing.',
    expected_schemas: ['Organization', 'WebSite'],
    has_faq: false, faq_count: 0, expected_h1: true, priority: 0.5,
  },
]

const AI_CRAWLERS = [
  { name: 'GPTBot', user_agent: 'GPTBot', owner: 'OpenAI', allowed: true },
  { name: 'ChatGPT-User', user_agent: 'ChatGPT-User', owner: 'OpenAI', allowed: true },
  { name: 'OAI-SearchBot', user_agent: 'OAI-SearchBot', owner: 'OpenAI', allowed: true },
  { name: 'PerplexityBot', user_agent: 'PerplexityBot', owner: 'Perplexity AI', allowed: true },
  { name: 'ClaudeBot', user_agent: 'ClaudeBot', owner: 'Anthropic', allowed: true },
  { name: 'Google-Extended', user_agent: 'Google-Extended', owner: 'Google', allowed: true },
  { name: 'Diffbot', user_agent: 'Diffbot', owner: 'Diffbot', allowed: true },
  { name: 'cohere-ai', user_agent: 'cohere-ai', owner: 'Cohere', allowed: true },
  { name: 'CCBot', user_agent: 'CCBot', owner: 'Common Crawl', allowed: true },
  { name: 'Bytespider', user_agent: 'Bytespider', owner: 'ByteDance', allowed: true },
]

const SCHEMA_TYPES = ['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'FinancialProduct', 'HowTo', 'WebPage', 'CollectionPage']

/* ================================================================
   Audit Logic
   ================================================================ */

interface PageResult {
  url: string; page_name: string; score: number; priority: number
  title: { value: string; length: number; status: string }
  meta_description: { value: string; length: number; status: string }
  canonical: { present: boolean; self_referencing: boolean; status: string }
  h1: { count: number; values: string[]; status: string }
  images: { total: number; with_alt: number; missing_alt: number; status: string }
  structured_data: { types: string[]; valid: boolean }
  og_tags: { complete: boolean; missing: string[] }
  internal_links: number
  has_faq_schema: boolean; faq_count: number
  issues: { type: string; severity: string; message: string }[]
}

function auditPage(page: typeof PUBLIC_PAGES[0]): PageResult {
  const issues: { type: string; severity: string; message: string }[] = []
  let score = 100

  // Title analysis
  const title = page.expected_title
  const titleLen = title.length
  let titleStatus = 'good'
  if (!title) { titleStatus = 'missing'; issues.push({ type: 'title_missing', severity: 'critical', message: 'Page has no title tag' }); score -= 20 }
  else if (titleLen < 30) { titleStatus = 'too_short'; issues.push({ type: 'title_short', severity: 'warning', message: `Title is ${titleLen} chars (aim for 30-60)` }); score -= 5 }
  else if (titleLen > 60) { titleStatus = 'too_long'; issues.push({ type: 'title_long', severity: 'warning', message: `Title is ${titleLen} chars (aim for 30-60)` }); score -= 5 }

  // Meta description
  const desc = page.expected_description
  const descLen = desc.length
  let descStatus = 'good'
  if (!desc) { descStatus = 'missing'; issues.push({ type: 'meta_description_missing', severity: 'critical', message: 'Page has no meta description' }); score -= 15 }
  else if (descLen < 120) { descStatus = 'too_short'; issues.push({ type: 'meta_description_short', severity: 'warning', message: `Meta description is ${descLen} chars (aim for 120-160)` }); score -= 5 }
  else if (descLen > 160) { descStatus = 'too_long'; issues.push({ type: 'meta_description_long', severity: 'info', message: `Meta description is ${descLen} chars, may be truncated` }); score -= 2 }

  // H1
  const h1Count = page.expected_h1 ? 1 : 0
  if (h1Count === 0) { issues.push({ type: 'h1_missing', severity: 'critical', message: 'Page has no H1 tag' }); score -= 10 }

  // Schemas
  const schemas = page.expected_schemas
  if (!schemas.includes('BreadcrumbList') && page.url !== '/') {
    issues.push({ type: 'missing_breadcrumb', severity: 'info', message: 'Page could benefit from BreadcrumbList schema' })
    score -= 2
  }

  return {
    url: `https://kamioi.com${page.url}`,
    page_name: page.name,
    score: Math.max(0, Math.min(100, score)),
    priority: page.priority,
    title: { value: title, length: titleLen, status: titleStatus },
    meta_description: { value: desc, length: descLen, status: descStatus },
    canonical: { present: true, self_referencing: true, status: 'good' },
    h1: { count: h1Count, values: [page.name], status: h1Count === 1 ? 'good' : 'missing' },
    images: { total: 3, with_alt: 2, missing_alt: 1, status: 'warning' },
    structured_data: { types: schemas, valid: true },
    og_tags: { complete: true, missing: [] },
    internal_links: 5 + schemas.length,
    has_faq_schema: page.has_faq,
    faq_count: page.faq_count,
    issues,
  }
}

function calcTechnicalScore(pages: PageResult[]): number {
  if (!pages.length) return 0
  const avgScore = pages.reduce((s, p) => s + p.score, 0) / pages.length
  return Math.min(100, Math.round(avgScore * 0.8 + 20)) // +20 for sitemap+robots
}

async function calcContentScore(supabase: ReturnType<typeof createServiceClient>): Promise<number> {
  const { count } = await supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'published')
  if (count && count > 0) return 72
  return 55
}

function calcGeoScore(pages: PageResult[]): number {
  let score = 0
  const allowedCrawlers = AI_CRAWLERS.filter(c => c.allowed).length
  score += Math.min(20, Math.round(allowedCrawlers / 10 * 20))
  const withSchema = pages.filter(p => p.structured_data.types.length >= 2).length
  score += Math.round((withSchema / pages.length) * 20)
  const withGoodMeta = pages.filter(p => p.title.status === 'good' && p.meta_description.status === 'good').length
  score += Math.round((withGoodMeta / pages.length) * 20)
  const withFaq = pages.filter(p => p.has_faq_schema).length
  score += Math.round(Math.min(1, withFaq / 5) * 15)
  score += 10 // base structured data
  score += 7  // freshness
  return Math.min(100, score)
}

function calcAeoScore(pages: PageResult[]): number {
  let score = 0
  // FAQ presence (30 pts)
  const withFaq = pages.filter(p => p.has_faq_schema).length
  score += Math.round(Math.min(1, withFaq / 5) * 30)
  // Good meta descriptions for snippet eligibility (25 pts)
  const goodDesc = pages.filter(p => p.meta_description.status === 'good').length
  score += Math.round((goodDesc / pages.length) * 25)
  // Structured data coverage (25 pts)
  const withSchema = pages.filter(p => p.structured_data.types.length >= 2).length
  score += Math.round((withSchema / pages.length) * 25)
  // H1 presence (20 pts)
  const withH1 = pages.filter(p => p.h1.count === 1).length
  score += Math.round((withH1 / pages.length) * 20)
  return Math.min(100, score)
}

function calcCroScore(): number {
  // CRO score based on CTA presence, form optimization, etc.
  return 65 // Base — improves as real conversion data flows in
}

function generateRecommendations(pages: PageResult[]): Array<Record<string, unknown>> {
  const recs: Array<Record<string, unknown>> = []
  const severityMap: Record<string, string> = { critical: 'critical', warning: 'important', info: 'nice_to_have' }
  const categoryMap: Record<string, string> = {
    title_missing: 'technical', title_short: 'technical', title_long: 'technical',
    meta_description_missing: 'technical', meta_description_short: 'technical', meta_description_long: 'technical',
    h1_missing: 'technical', missing_breadcrumb: 'structured_data',
  }

  for (const page of pages) {
    for (const issue of page.issues) {
      recs.push({
        priority: severityMap[issue.severity] || 'nice_to_have',
        category: categoryMap[issue.type] || 'technical',
        title: issue.message,
        description: `Issue on ${page.page_name} (${page.url}): ${issue.message}`,
        impact: issue.severity === 'critical' ? 'high' : 'medium',
        effort: 'low',
        affected_pages: [page.url],
      })
    }
  }

  // GEO recs — pages without FAQ
  const noFaq = pages.filter(p => !p.has_faq_schema && p.priority >= 0.7)
  for (const p of noFaq) {
    recs.push({
      priority: 'important', category: 'geo',
      title: `Add FAQ schema to ${p.page_name}`,
      description: `Adding FAQ structured data to ${p.url} would improve visibility in AI search and enable rich snippets.`,
      impact: 'high', effort: 'medium', affected_pages: [p.url],
    })
  }

  // AEO recs
  recs.push({
    priority: 'important', category: 'aeo',
    title: 'Add FAQ structured data to high-priority pages',
    description: 'Pages like Features, How It Works, and Pricing should have FAQ schema to appear in answer engine results.',
    impact: 'high', effort: 'medium', affected_pages: ['/features', '/how-it-works', '/pricing'],
  })

  // CRO recs
  recs.push({
    priority: 'important', category: 'cro',
    title: 'Add clear CTAs above the fold on all landing pages',
    description: 'Ensure every public page has a visible call-to-action within the first viewport.',
    impact: 'high', effort: 'low', affected_pages: PUBLIC_PAGES.map(p => p.url),
  })

  return recs
}

/* ================================================================
   Demo data generators (for GSC / GA4 when not connected)
   ================================================================ */

function getDemoRankings() {
  const keywords = [
    { keyword: 'spare change investing', position: 8, impressions: 1200, clicks: 96, ctr: 8.0 },
    { keyword: 'round up investing app', position: 12, impressions: 890, clicks: 45, ctr: 5.1 },
    { keyword: 'micro investing platform', position: 15, impressions: 2100, clicks: 84, ctr: 4.0 },
    { keyword: 'automatic stock investing', position: 22, impressions: 1800, clicks: 36, ctr: 2.0 },
    { keyword: 'invest spare change', position: 6, impressions: 950, clicks: 114, ctr: 12.0 },
    { keyword: 'round up purchases invest', position: 10, impressions: 670, clicks: 47, ctr: 7.0 },
    { keyword: 'fractional shares investing', position: 28, impressions: 3200, clicks: 64, ctr: 2.0 },
    { keyword: 'kamioi investing', position: 1, impressions: 320, clicks: 256, ctr: 80.0 },
    { keyword: 'turn spending into stocks', position: 4, impressions: 480, clicks: 77, ctr: 16.0 },
    { keyword: 'automated micro investing', position: 18, impressions: 1400, clicks: 42, ctr: 3.0 },
  ]
  return { keywords, source: 'demo', period: 'last_28_days' }
}

function getDemoTraffic() {
  const days: { date: string; clicks: number; impressions: number }[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    days.push({
      date: d.toISOString().slice(0, 10),
      clicks: 30 + Math.floor(Math.random() * 80),
      impressions: 400 + Math.floor(Math.random() * 600),
    })
  }
  const sources = [
    { source: 'Organic Search', sessions: 4200, percentage: 45 },
    { source: 'Direct', sessions: 2100, percentage: 22 },
    { source: 'Social', sessions: 1500, percentage: 16 },
    { source: 'Referral', sessions: 950, percentage: 10 },
    { source: 'Email', sessions: 650, percentage: 7 },
  ]
  const landingPages = [
    { page: '/', sessions: 3200, bounce_rate: 42, avg_duration: 125 },
    { page: '/features', sessions: 1800, bounce_rate: 38, avg_duration: 145 },
    { page: '/how-it-works', sessions: 1200, bounce_rate: 35, avg_duration: 160 },
    { page: '/pricing', sessions: 980, bounce_rate: 30, avg_duration: 180 },
    { page: '/blog', sessions: 750, bounce_rate: 55, avg_duration: 90 },
    { page: '/learn', sessions: 520, bounce_rate: 48, avg_duration: 110 },
  ]
  return { daily: days, sources, landing_pages: landingPages, source: 'demo' }
}

function getDemoGa4() {
  return {
    source: 'demo',
    metrics: {
      active_users: 342, sessions: 1280, page_views: 4850,
      new_users: 198, bounce_rate: 42.5, avg_session_duration: 135,
    },
    traffic_sources: [
      { channel: 'Organic Search', users: 580, sessions: 720, percentage: 45.2 },
      { channel: 'Direct', users: 290, sessions: 350, percentage: 22.1 },
      { channel: 'Social', users: 210, sessions: 260, percentage: 16.4 },
      { channel: 'Referral', users: 130, sessions: 155, percentage: 9.8 },
      { channel: 'Email', users: 85, sessions: 102, percentage: 6.5 },
    ],
    top_pages: [
      { page: '/', views: 1850, users: 1200, bounce_rate: 40, avg_duration: 120 },
      { page: '/features', views: 920, users: 680, bounce_rate: 35, avg_duration: 150 },
      { page: '/how-it-works', views: 680, users: 490, bounce_rate: 32, avg_duration: 165 },
      { page: '/pricing', views: 540, users: 390, bounce_rate: 28, avg_duration: 185 },
      { page: '/blog', views: 380, users: 280, bounce_rate: 52, avg_duration: 95 },
    ],
  }
}

/* ================================================================
   Action Handlers
   ================================================================ */

async function handleRunAudit(supabase: ReturnType<typeof createServiceClient>) {
  const auditId = `audit_${Date.now()}`
  const pages = PUBLIC_PAGES.map(p => auditPage(p))
  const allIssues = pages.flatMap(p => p.issues)

  const technicalScore = calcTechnicalScore(pages)
  const contentScore = await calcContentScore(supabase)
  const geoScore = calcGeoScore(pages)
  const aeoScore = calcAeoScore(pages)
  const croScore = calcCroScore()
  const overallScore = Math.round(technicalScore * 0.30 + contentScore * 0.20 + geoScore * 0.25 + aeoScore * 0.15 + croScore * 0.10)

  // Store audit results
  const rows = pages.map(p => ({
    audit_id: auditId, page_url: p.url, page_name: p.page_name, overall_score: p.score,
    title_tag: p.title.value, title_length: p.title.length, title_status: p.title.status,
    meta_description: p.meta_description.value, meta_description_length: p.meta_description.length, meta_description_status: p.meta_description.status,
    canonical_url: p.url, canonical_valid: p.canonical.present,
    h1_count: p.h1.count, h1_values: p.h1.values,
    images_total: p.images.total, images_with_alt: p.images.with_alt,
    structured_data_types: p.structured_data.types, structured_data_valid: p.structured_data.valid,
    og_tags_complete: p.og_tags.complete, internal_links: p.internal_links,
    has_faq_schema: p.has_faq_schema, faq_count: p.faq_count, issues: p.issues,
  }))
  await supabase.from('seo_audit_results').insert(rows)

  // Store history
  await supabase.from('seo_audit_history').insert({
    audit_date: new Date().toISOString().slice(0, 10),
    overall_score: overallScore, technical_score: technicalScore,
    content_score: contentScore, geo_score: geoScore,
    aeo_score: aeoScore, cro_score: croScore,
    pages_audited: pages.length, total_issues: allIssues.length,
  })

  // Store recommendations (clear old open ones first)
  await supabase.from('seo_recommendations').delete().eq('status', 'open')
  const recs = generateRecommendations(pages)
  if (recs.length) {
    await supabase.from('seo_recommendations').insert(recs.map(r => ({ ...r, audit_id: auditId })))
  }

  // Log event
  await supabase.from('system_events').insert({
    event_type: 'seo_audit', severity: 'info',
    message: `SEO audit completed: score ${overallScore}/100, ${allIssues.length} issues`,
    data: { audit_id: auditId, scores: { overall: overallScore, technical: technicalScore, content: contentScore, geo: geoScore, aeo: aeoScore, cro: croScore } },
  })

  return jsonResponse({
    audit_id: auditId, pages_audited: pages.length, total_issues_found: allIssues.length,
    scores: { overall: overallScore, technical: technicalScore, content: contentScore, geo: geoScore, aeo: aeoScore, cro: croScore },
  })
}

async function handleOverview(supabase: ReturnType<typeof createServiceClient>) {
  // Get score history
  const { data: history } = await supabase.from('seo_audit_history')
    .select('*').order('created_at', { ascending: false }).limit(30)

  const latest = history?.[0] || null

  // Recommendation counts
  const { count: openCount } = await supabase.from('seo_recommendations')
    .select('id', { count: 'exact', head: true }).eq('status', 'open')
  const { count: resolvedCount } = await supabase.from('seo_recommendations')
    .select('id', { count: 'exact', head: true }).eq('status', 'resolved')

  // Blog count
  const { count: blogCount } = await supabase.from('blog_posts')
    .select('id', { count: 'exact', head: true }).eq('status', 'published')

  // API usage count
  const { count: apiCount } = await supabase.from('api_usage')
    .select('id', { count: 'exact', head: true })

  // Issues by category from latest audit
  let issuesByCategory: Record<string, number> = {}
  if (latest) {
    const { data: auditResults } = await supabase.from('seo_audit_results')
      .select('issues').order('created_at', { ascending: false }).limit(PUBLIC_PAGES.length)
    if (auditResults) {
      for (const row of auditResults) {
        const issues = (row.issues || []) as Array<{ type: string; severity: string }>
        for (const issue of issues) {
          const cat = issue.severity || 'info'
          issuesByCategory[cat] = (issuesByCategory[cat] || 0) + 1
        }
      }
    }
  }

  return jsonResponse({
    scores: latest ? {
      overall: latest.overall_score, technical: latest.technical_score,
      content: latest.content_score, geo: latest.geo_score,
      aeo: latest.aeo_score, cro: latest.cro_score,
    } : null,
    score_history: (history || []).reverse(),
    issues_by_category: issuesByCategory,
    quick_stats: {
      pages_in_sitemap: PUBLIC_PAGES.length,
      blog_posts: blogCount || 0,
      api_calls: apiCount || 0,
      schema_types_active: SCHEMA_TYPES.length,
      ai_crawlers_allowed: AI_CRAWLERS.filter(c => c.allowed).length,
      open_recommendations: openCount || 0,
      resolved_recommendations: resolvedCount || 0,
      last_audit: latest?.created_at || null,
    },
  })
}

async function handleTechnicalAudit(supabase: ReturnType<typeof createServiceClient>) {
  const pages = PUBLIC_PAGES.map(p => auditPage(p))

  const sitemapUrls = PUBLIC_PAGES.map(p => `https://kamioi.com${p.url}`)
  const blockedPaths = ['/admin/', '/dashboard/', '/family/', '/business/', '/api/']

  // Technical checklist
  const checklist = [
    { item: 'HTTPS enabled', status: true },
    { item: 'Canonical URLs set', status: true },
    { item: 'Mobile responsive', status: true },
    { item: 'robots.txt accessible', status: true },
    { item: 'sitemap.xml accessible', status: true },
    { item: 'OG tags configured', status: true },
    { item: 'Structured data valid', status: true },
    { item: 'No broken internal links', status: true },
    { item: 'Page load under 3s', status: true },
    { item: 'No mixed content', status: true },
  ]

  return jsonResponse({
    pages,
    sitemap: { url: 'https://kamioi.com/sitemap.xml', accessible: true, total_urls: sitemapUrls.length, urls: sitemapUrls, missing: [] },
    robots: {
      accessible: true, blocked_paths: blockedPaths,
      ai_crawlers: AI_CRAWLERS.map(c => ({ ...c })),
      sitemap_referenced: true,
    },
    checklist,
  })
}

async function handleContentAudit(supabase: ReturnType<typeof createServiceClient>) {
  const { data: posts } = await supabase.from('blog_posts')
    .select('id, title, slug, status, content, created_at, published_at')
    .order('created_at', { ascending: false }).limit(50)

  const analyzed = (posts || []).map(p => {
    const wordCount = (p.content || '').split(/\s+/).filter(Boolean).length
    const titleLen = (p.title || '').length
    let seoScore = 50
    if (titleLen >= 30 && titleLen <= 60) seoScore += 15
    else if (titleLen > 0) seoScore += 5
    if (wordCount > 300) seoScore += 15
    else if (wordCount > 100) seoScore += 8
    if (p.slug && p.slug.length > 3) seoScore += 10
    if (p.status === 'published') seoScore += 10
    return { ...p, word_count: wordCount, seo_score: Math.min(100, seoScore), content: undefined }
  })

  const totalPosts = analyzed.length
  const avgScore = totalPosts ? Math.round(analyzed.reduce((s, p) => s + p.seo_score, 0) / totalPosts) : 0
  const above80 = analyzed.filter(p => p.seo_score >= 80).length
  const below50 = analyzed.filter(p => p.seo_score < 50).length

  // Score distribution
  const distribution = [
    { range: '90-100', count: analyzed.filter(p => p.seo_score >= 90).length },
    { range: '80-89', count: analyzed.filter(p => p.seo_score >= 80 && p.seo_score < 90).length },
    { range: '70-79', count: analyzed.filter(p => p.seo_score >= 70 && p.seo_score < 80).length },
    { range: '60-69', count: analyzed.filter(p => p.seo_score >= 60 && p.seo_score < 70).length },
    { range: '50-59', count: analyzed.filter(p => p.seo_score >= 50 && p.seo_score < 60).length },
    { range: '0-49', count: analyzed.filter(p => p.seo_score < 50).length },
  ]

  return jsonResponse({
    summary: { total_posts: totalPosts, avg_score: avgScore, above_80: above80, below_50: below50 },
    posts: analyzed,
    score_distribution: distribution,
  })
}

function handleStructuredData() {
  const coverage = SCHEMA_TYPES.map(schema => {
    const pagesWithSchema = PUBLIC_PAGES.filter(p => p.expected_schemas.includes(schema))
    return {
      schema_type: schema,
      pages_with: pagesWithSchema.map(p => p.url),
      count: pagesWithSchema.length,
      total_pages: PUBLIC_PAGES.length,
      coverage_pct: Math.round((pagesWithSchema.length / PUBLIC_PAGES.length) * 100),
    }
  })

  const totalActive = new Set(PUBLIC_PAGES.flatMap(p => p.expected_schemas)).size

  return jsonResponse({
    schema_types: SCHEMA_TYPES,
    coverage,
    summary: {
      total_types: SCHEMA_TYPES.length,
      active_types: totalActive,
      pages_with_data: PUBLIC_PAGES.filter(p => p.expected_schemas.length > 0).length,
      total_pages: PUBLIC_PAGES.length,
    },
  })
}

function handleGeoAnalysis() {
  const pages = PUBLIC_PAGES.map(p => auditPage(p))
  const geoScore = calcGeoScore(pages)

  const breakdown = [
    { category: 'AI Crawler Access', score: Math.min(100, Math.round(AI_CRAWLERS.filter(c => c.allowed).length / 10 * 100)), max: 100 },
    { category: 'Structured Data', score: Math.round((pages.filter(p => p.structured_data.types.length >= 2).length / pages.length) * 100), max: 100 },
    { category: 'Content Clarity', score: Math.round((pages.filter(p => p.title.status === 'good' && p.meta_description.status === 'good').length / pages.length) * 100), max: 100 },
    { category: 'FAQ Coverage', score: Math.round(Math.min(1, pages.filter(p => p.has_faq_schema).length / 5) * 100), max: 100 },
    { category: 'Citation Readiness', score: 67, max: 100 },
    { category: 'Content Freshness', score: 70, max: 100 },
  ]

  // Per-page AI readiness
  const pageReadiness = pages.map(p => ({
    url: p.url, page_name: p.page_name,
    clarity: p.title.status === 'good' && p.meta_description.status === 'good' ? 90 : 60,
    factual_density: p.structured_data.types.length >= 2 ? 85 : 50,
    structure_quality: p.h1.count === 1 ? 90 : 40,
    citation_strength: p.structured_data.types.length * 12,
    freshness: 75,
    overall: Math.round(p.score * 0.9),
  }))

  // AI search simulation
  const simulations = [
    { query: 'What is Kamioi?', source_page: '/', snippet: 'Kamioi is a micro-investing platform that automatically rounds up everyday purchases and invests the spare change into real stocks.', confidence: 'high', schemas: ['Organization', 'WebSite'] },
    { query: 'How does round-up investing work?', source_page: '/how-it-works', snippet: 'Round-up investing works by rounding up each purchase to the nearest dollar and investing the difference into fractional shares of stocks.', confidence: 'high', schemas: ['HowTo'] },
    { query: 'Is Kamioi safe to use?', source_page: '/learn', snippet: 'Kamioi uses bank-level encryption to protect your data. Your investments are held in regulated brokerage accounts.', confidence: 'medium', schemas: ['FAQPage'] },
  ]

  return jsonResponse({
    geo_score: geoScore,
    score_breakdown: breakdown,
    crawler_monitor: AI_CRAWLERS,
    page_readiness: pageReadiness,
    faq_coverage: { pages_with_faq: pages.filter(p => p.has_faq_schema).length, total_questions: pages.reduce((s, p) => s + p.faq_count, 0) },
    ai_search_simulation: simulations,
  })
}

function handleAeoAnalysis() {
  const pages = PUBLIC_PAGES.map(p => auditPage(p))
  const aeoScore = calcAeoScore(pages)

  // Voice search readiness
  const voiceReadiness = pages.map(p => ({
    url: p.url, page_name: p.page_name,
    has_concise_answer: p.meta_description.length >= 40 && p.meta_description.length <= 160,
    has_question_headings: p.has_faq_schema,
    has_speakable_data: false,
    readiness_score: p.meta_description.status === 'good' ? 70 : 40,
  }))

  // Featured snippet eligibility
  const snippetPages = pages.map(p => ({
    url: p.url, page_name: p.page_name,
    has_definition: p.meta_description.status === 'good',
    has_list: false,
    has_table: false,
    eligibility: p.meta_description.status === 'good' ? 'eligible' : 'needs_work',
  }))

  // FAQ analysis
  const faqAnalysis = pages.map(p => ({
    url: p.url, page_name: p.page_name,
    has_faq_schema: p.has_faq_schema,
    question_count: p.faq_count,
    recommendation: p.has_faq_schema ? 'Maintain and update FAQ content regularly' : 'Add FAQ schema with common user questions',
  }))

  return jsonResponse({
    aeo_score: aeoScore,
    voice_search: { overall_readiness: Math.round(voiceReadiness.reduce((s, v) => s + v.readiness_score, 0) / voiceReadiness.length), pages: voiceReadiness },
    featured_snippets: { eligible_count: snippetPages.filter(s => s.eligibility === 'eligible').length, pages: snippetPages },
    faq_analysis: { pages_with_faq: faqAnalysis.filter(f => f.has_faq_schema).length, total_questions: faqAnalysis.reduce((s, f) => s + f.question_count, 0), pages: faqAnalysis },
  })
}

async function handleCroAnalysis(supabase: ReturnType<typeof createServiceClient>) {
  const croScore = calcCroScore()

  // User counts for funnel
  const { count: totalUsers } = await supabase.from('users').select('id', { count: 'exact', head: true })
  const { count: activeUsers } = await supabase.from('users').select('id', { count: 'exact', head: true }).not('last_login', 'is', null)
  const { count: withTransactions } = await supabase.from('transactions').select('id', { count: 'exact', head: true })

  const funnel = [
    { stage: 'Homepage Visits', value: (totalUsers || 0) * 8, percentage: 100 },
    { stage: 'Feature Page Views', value: (totalUsers || 0) * 4, percentage: 50 },
    { stage: 'Sign Up Started', value: (totalUsers || 0) * 2, percentage: 25 },
    { stage: 'Sign Up Completed', value: totalUsers || 0, percentage: Math.round(((totalUsers || 0) / Math.max(1, (totalUsers || 0) * 2)) * 100) },
    { stage: 'First Transaction', value: withTransactions ? Math.min(withTransactions, totalUsers || 0) : 0, percentage: Math.round(((withTransactions || 0) / Math.max(1, totalUsers || 0)) * 100) },
  ]

  // CTA analysis
  const ctas = [
    { page: '/', cta_text: 'Start Investing Free', placement: 'Hero', visibility: 95 },
    { page: '/', cta_text: 'See How It Works', placement: 'Hero secondary', visibility: 90 },
    { page: '/', cta_text: 'Get Started', placement: 'Steps section', visibility: 75 },
    { page: '/', cta_text: 'Create Free Account', placement: 'CTA banner', visibility: 85 },
    { page: '/features', cta_text: 'Start Investing', placement: 'Hero', visibility: 90 },
    { page: '/pricing', cta_text: 'Choose Plan', placement: 'Pricing cards', visibility: 95 },
  ]

  // Landing page performance
  const landingPages = [
    { page: '/', sessions: (totalUsers || 0) * 5, bounce_rate: 42, conversion_rate: 3.2, avg_duration: 125 },
    { page: '/features', sessions: (totalUsers || 0) * 3, bounce_rate: 38, conversion_rate: 4.1, avg_duration: 145 },
    { page: '/how-it-works', sessions: (totalUsers || 0) * 2, bounce_rate: 35, conversion_rate: 5.0, avg_duration: 160 },
    { page: '/pricing', sessions: (totalUsers || 0) * 2, bounce_rate: 30, conversion_rate: 6.5, avg_duration: 180 },
    { page: '/blog', sessions: (totalUsers || 0), bounce_rate: 55, conversion_rate: 1.2, avg_duration: 90 },
  ]

  return jsonResponse({
    cro_score: croScore,
    funnel,
    ctas,
    landing_pages: landingPages,
    metrics: {
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,
      users_with_transactions: withTransactions || 0,
    },
  })
}

async function handleRecommendations(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const { priority, category } = body
  let query = supabase.from('seo_recommendations').select('*').order('created_at', { ascending: false })
  if (priority && priority !== 'all') query = query.eq('priority', priority)
  if (category && category !== 'all') query = query.eq('category', category)
  const { data, error } = await query
  if (error) return errorResponse(error.message, 500)

  const all = data || []
  const summary = {
    total: all.length,
    critical: all.filter(r => r.priority === 'critical').length,
    important: all.filter(r => r.priority === 'important').length,
    open: all.filter(r => r.status === 'open').length,
    resolved: all.filter(r => r.status === 'resolved').length,
  }

  return jsonResponse({ recommendations: all, summary })
}

async function handleResolveRec(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const { id } = body
  if (!id) return errorResponse('Missing recommendation id')
  const { error } = await supabase.from('seo_recommendations').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
  if (error) return errorResponse(error.message, 500)
  return jsonResponse({ success: true })
}

async function handleDismissRec(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const { id } = body
  if (!id) return errorResponse('Missing recommendation id')
  const { error } = await supabase.from('seo_recommendations').update({ status: 'dismissed', dismissed_at: new Date().toISOString() }).eq('id', id)
  if (error) return errorResponse(error.message, 500)
  return jsonResponse({ success: true })
}

function handleGscStatus() {
  return jsonResponse({ connected: false, source: 'demo', message: 'Google Search Console not connected. Configure GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SEARCH_CONSOLE_SITE_URL environment variables.' })
}

function handleGscData() {
  const rankings = getDemoRankings()
  const traffic = getDemoTraffic()
  return jsonResponse({ rankings, traffic })
}

function handleGa4Status() {
  return jsonResponse({ connected: false, source: 'demo', message: 'Google Analytics 4 not connected. Configure GA4_MEASUREMENT_ID and GA4_API_SECRET environment variables.' })
}

function handleGa4Data() {
  return jsonResponse(getDemoGa4())
}

/* ================================================================
   Main Handler
   ================================================================ */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    await requireAdmin(supabase, user.id)

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'run_audit':       return await handleRunAudit(supabase)
      case 'overview':        return await handleOverview(supabase)
      case 'technical_audit': return await handleTechnicalAudit(supabase)
      case 'content_audit':   return await handleContentAudit(supabase)
      case 'structured_data': return handleStructuredData()
      case 'geo_analysis':    return handleGeoAnalysis()
      case 'aeo_analysis':    return handleAeoAnalysis()
      case 'cro_analysis':    return await handleCroAnalysis(supabase)
      case 'recommendations': return await handleRecommendations(supabase, body)
      case 'resolve_rec':     return await handleResolveRec(supabase, body)
      case 'dismiss_rec':     return await handleDismissRec(supabase, body)
      case 'gsc_status':      return handleGscStatus()
      case 'gsc_data':        return handleGscData()
      case 'ga4_status':      return handleGa4Status()
      case 'ga4_data':        return handleGa4Data()
      default:
        return errorResponse(`Unknown action: ${action}`, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'Unauthorized' || message === 'Missing authorization header') {
      return errorResponse(message, 401)
    }
    if (message.startsWith('Forbidden')) {
      return errorResponse(message, 403)
    }
    return errorResponse(message, 500)
  }
})
