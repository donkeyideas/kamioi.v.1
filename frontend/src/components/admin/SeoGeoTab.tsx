import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BlogPostRow {
  id: number;
  title: string | null;
  slug: string | null;
  status: string | null;
  created_at: string;
  published_at: string | null;
}

interface DailyCallPoint {
  [key: string]: unknown;
  name: string;
  calls: number;
}

interface CrawlerEntry {
  name: string;
  status: 'Allowed' | 'Blocked';
}

interface AdminSettingRow {
  id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: string | null;
  description: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function dayLabel(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Tab 1: Overview                                                    */
/* ------------------------------------------------------------------ */

function OverviewContent() {
  const [loading, setLoading] = useState(true);
  const [publishedBlogCount, setPublishedBlogCount] = useState(0);
  const [blogError, setBlogError] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [activeAdsCount, setActiveAdsCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [blogResult, apiResult, adsResult, contactResult] = await Promise.all([
          supabase
            .from('blog_posts')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published'),
          supabase
            .from('api_usage')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('advertisements')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('contact_messages')
            .select('id', { count: 'exact', head: true }),
        ]);

        if (blogResult.error) {
          setBlogError(true);
        } else {
          setPublishedBlogCount(blogResult.count ?? 0);
        }
        setApiCallCount(apiResult.count ?? 0);
        setActiveAdsCount(adsResult.count ?? 0);
        setContactCount(contactResult.count ?? 0);
      } catch {
        console.error('OverviewContent fetch error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading overview...
      </div>
    );
  }

  const seoItems = [
    { label: 'Meta Tags', configured: true },
    { label: 'Sitemap', configured: true },
    { label: 'Robots.txt', configured: true },
    { label: 'Structured Data', configured: true },
    { label: 'Mobile Responsive', configured: true },
  ];

  const aiCrawlers = [
    { name: 'GPTBot', allowed: true },
    { name: 'ClaudeBot', allowed: true },
    { name: 'PerplexityBot', allowed: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard
          label="Blog Posts Published"
          value={blogError ? '0' : formatNumber(publishedBlogCount)}
          accent="purple"
        />
        <KpiCard label="Total API Calls" value={formatNumber(apiCallCount)} accent="teal" />
        <KpiCard label="Active Ads" value={formatNumber(activeAdsCount)} accent="blue" />
        <KpiCard label="Contact Messages" value={formatNumber(contactCount)} accent="pink" />
      </div>

      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '12px' }}>
          SEO Health Score
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', marginBottom: '16px', lineHeight: 1.6 }}>
          SEO audit requires Edge Function. Current coverage:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {seoItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: item.configured ? '#34D399' : '#EF4444', fontSize: '16px' }}>
                {item.configured ? '\u2713' : '\u2717'}
              </span>
              <span style={{ fontSize: '14px', color: '#F8FAFC' }}>{item.label}</span>
              <Badge variant="success">Configured</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '12px' }}>
          AI Search Readiness
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {aiCrawlers.map((crawler) => (
            <div key={crawler.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#F8FAFC', fontWeight: 500 }}>{crawler.name}</span>
              <Badge variant="success">Allowed</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Rankings & Traffic                                          */
/* ------------------------------------------------------------------ */

function RankingsTrafficContent() {
  const [loading, setLoading] = useState(true);
  const [dailyCalls, setDailyCalls] = useState<DailyCallPoint[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data } = await supabase
          .from('api_usage')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        const dayMap = new Map<string, number>();
        for (const row of data ?? []) {
          const key = dayLabel(row.created_at);
          dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
        }

        const points: DailyCallPoint[] = [];
        for (const [name, calls] of dayMap) {
          points.push({ name, calls });
        }
        setDailyCalls(points);
      } catch {
        console.error('RankingsTrafficContent fetch error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading traffic data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Google Search Console Required
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Google Search Console integration required for live ranking data. Configure GSC API credentials in System Settings.
        </p>
      </GlassCard>

      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Keyword Rankings
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Connect Google Search Console to track keyword positions, impressions, clicks, and CTR.
        </p>
      </GlassCard>

      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Traffic Sources
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Connect Google Analytics to view traffic sources, user demographics, and behavior analytics.
        </p>
      </GlassCard>

      <LineChart<DailyCallPoint>
        data={dailyCalls}
        dataKey="calls"
        xKey="name"
        title="Daily Site Activity (API Usage - Last 30 Days)"
        color="#06B6D4"
        height={280}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Technical Audit                                             */
/* ------------------------------------------------------------------ */

function TechnicalAuditContent() {
  const webVitals = [
    { label: 'LCP (Largest Contentful Paint)', status: 'Requires Lighthouse' as const },
    { label: 'FID (First Input Delay)', status: 'Requires Lighthouse' as const },
    { label: 'CLS (Cumulative Layout Shift)', status: 'Requires Lighthouse' as const },
  ];

  const crawlabilityItems = [
    'robots.txt configured',
    'XML sitemap present',
    'No noindex on public pages',
    'Canonical URLs set',
    'Mobile-friendly design',
  ];

  const securityItems: Array<{ label: string; variant: 'success' | 'warning'; text: string }> = [
    { label: 'HTTPS enabled', variant: 'success', text: 'Enabled' },
    { label: 'Content Security Policy', variant: 'warning', text: 'Review' },
    { label: 'CORS configuration', variant: 'warning', text: 'Review' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
          Core Web Vitals
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {webVitals.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#F8FAFC', minWidth: '280px' }}>{item.label}</span>
              <Badge variant="info">{item.status}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
          Crawlability
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {crawlabilityItems.map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#34D399', fontSize: '16px' }}>{'\u2713'}</span>
              <span style={{ fontSize: '14px', color: '#F8FAFC' }}>{item}</span>
              <Badge variant="success">Configured</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
          Security
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {securityItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#F8FAFC', minWidth: '220px' }}>{item.label}</span>
              <Badge variant={item.variant}>{item.text}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Content SEO                                                 */
/* ------------------------------------------------------------------ */

function ContentSeoContent() {
  const [loading, setLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState<BlogPostRow[]>([]);
  const [blogExists, setBlogExists] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('id, title, slug, status, created_at, published_at')
          .order('created_at', { ascending: false });

        if (error) {
          setBlogExists(false);
          return;
        }
        setBlogPosts((data ?? []) as BlogPostRow[]);
      } catch {
        setBlogExists(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const blogColumns: Column<BlogPostRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (row) => (
          <span style={{ fontWeight: 500, color: '#F8FAFC' }}>
            {row.title ?? '--'}
          </span>
        ),
      },
      { key: 'slug', header: 'Slug', sortable: true, width: '200px' },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '120px',
        render: (row) => {
          const variant = row.status === 'published' ? 'success' : row.status === 'draft' ? 'warning' : 'default';
          return <Badge variant={variant}>{row.status ?? 'Unknown'}</Badge>;
        },
      },
      {
        key: 'word_count',
        header: 'Word Count',
        width: '110px',
        align: 'right',
        render: () => (
          <span style={{ color: 'rgba(248,250,252,0.4)' }}>N/A</span>
        ),
      },
      {
        key: 'created_at',
        header: 'Published Date',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.published_at ?? row.created_at),
      },
    ],
    [],
  );

  const seoChecklist = [
    'Each blog post should have a unique title tag (50-60 characters)',
    'Each blog post should have a meta description (150-160 characters)',
    'Each blog post should have exactly one H1 heading',
    'All images should include descriptive alt text',
    'Include 2-3 internal links to related pages',
    'Include 1-2 external links to authoritative sources',
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading content data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Content SEO Analysis
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Content SEO analysis reviews your blog posts and public pages for SEO optimization.
        </p>
      </GlassCard>

      {blogExists ? (
        <GlassCard padding="0">
          <div style={{ padding: '20px 20px 0 20px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>
              Blog Posts
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.4)', marginBottom: '16px' }}>
              {blogPosts.length} posts found
            </p>
          </div>
          <Table<BlogPostRow>
            columns={blogColumns}
            data={blogPosts}
            loading={false}
            emptyMessage="No blog posts found"
            pageSize={10}
            rowKey={(row) => row.id}
          />
        </GlassCard>
      ) : (
        <GlassCard padding="28px">
          <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)' }}>
            Blog posts table not configured.
          </p>
        </GlassCard>
      )}

      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
          SEO Checklist for Content
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {seoChecklist.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ color: 'rgba(248,250,252,0.4)', fontSize: '14px', fontWeight: 600, minWidth: '20px' }}>
                {idx + 1}.
              </span>
              <span style={{ fontSize: '14px', color: 'rgba(248,250,252,0.7)', lineHeight: 1.5 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5: Structured Data                                             */
/* ------------------------------------------------------------------ */

function StructuredDataContent() {
  const [blogExists, setBlogExists] = useState(true);

  useEffect(() => {
    async function checkBlog() {
      try {
        const { error } = await supabase
          .from('blog_posts')
          .select('id', { count: 'exact', head: true });
        if (error) setBlogExists(false);
      } catch {
        setBlogExists(false);
      }
    }
    checkBlog();
  }, []);

  const schemas: Array<{ name: string; variant: 'success' | 'warning' | 'info'; text: string; note?: string }> = [
    { name: 'Organization schema', variant: 'success', text: 'Implemented' },
    { name: 'WebSite schema', variant: 'success', text: 'Implemented' },
    {
      name: 'BlogPosting schema',
      variant: blogExists ? 'success' : 'warning',
      text: blogExists ? 'Implemented' : 'Pending',
    },
    { name: 'BreadcrumbList schema', variant: 'info', text: 'Optional' },
    { name: 'FAQ schema', variant: 'success', text: 'Implemented', note: 'Learn page' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Structured Data (Schema.org)
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Structured data (Schema.org markup) helps search engines understand your content.
        </p>
      </GlassCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {schemas.map((schema) => (
          <GlassCard key={schema.name} padding="20px">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC' }}>
                  {schema.name}
                </span>
                {schema.note && (
                  <span style={{ fontSize: '12px', color: 'rgba(248,250,252,0.4)' }}>
                    -- {schema.note}
                  </span>
                )}
              </div>
              <Badge variant={schema.variant}>{schema.text}</Badge>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '12px' }}>
          Rich Snippet Preview
        </p>
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <p style={{ fontSize: '18px', color: '#3B82F6', marginBottom: '4px', fontWeight: 500 }}>
            Kamioi - AI-Powered Micro-Investing Platform
          </p>
          <p style={{ fontSize: '13px', color: '#34D399', marginBottom: '6px' }}>
            https://kamioi.com
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.6)', lineHeight: 1.5 }}>
            Kamioi uses artificial intelligence to help you invest your spare change automatically. Start micro-investing today with round-up investing and AI portfolio management.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 6: GEO / AI Search                                            */
/* ------------------------------------------------------------------ */

function GeoAiSearchContent() {
  const strategies = [
    {
      title: 'Authoritative Content',
      desc: 'Include citations and statistics from trusted financial sources to establish credibility.',
    },
    {
      title: 'Structured Answers',
      desc: 'Use FAQ format, clear headings, and concise answers for AI extraction.',
    },
    {
      title: 'Technical Accuracy',
      desc: 'Use precise financial terminology (micro-investing, round-up investing, portfolio allocation).',
    },
    {
      title: 'Source Attribution',
      desc: 'Link to authoritative sources such as SEC filings, FINRA guidelines, and academic research.',
    },
    {
      title: 'Conversational Tone',
      desc: 'Write in natural language that AI search engines can easily extract and present.',
    },
  ];

  const crawlers: CrawlerEntry[] = [
    { name: 'GPTBot', status: 'Allowed' },
    { name: 'ClaudeBot', status: 'Allowed' },
    { name: 'PerplexityBot', status: 'Allowed' },
    { name: 'Google-Extended', status: 'Allowed' },
    { name: 'CCBot', status: 'Blocked' },
    { name: 'Bytespider', status: 'Blocked' },
  ];

  const crawlerColumns: Column<CrawlerEntry>[] = [
    {
      key: 'name',
      header: 'Crawler',
      render: (row) => (
        <span style={{ fontWeight: 500, color: '#F8FAFC', fontFamily: 'monospace', fontSize: '13px' }}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Badge variant={row.status === 'Allowed' ? 'success' : 'error'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Generative Engine Optimization (GEO)
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          GEO optimizes your content for AI-powered search engines like Google SGE, Bing Chat, and Perplexity.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {strategies.map((strategy, idx) => (
            <GlassCard key={idx} padding="20px">
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', marginBottom: '6px' }}>
                {idx + 1}. {strategy.title}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.5 }}>
                {strategy.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="teal" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>
            AI Crawler Configuration
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.4)', marginBottom: '16px' }}>
            Access status configured in robots.txt
          </p>
        </div>
        <Table<CrawlerEntry>
          columns={crawlerColumns}
          data={crawlers}
          loading={false}
          emptyMessage="No crawlers configured"
          pageSize={10}
          rowKey={(row) => row.name}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 7: AEO (Answer Engine Optimization)                            */
/* ------------------------------------------------------------------ */

function AeoContent() {
  const answerEngines = [
    {
      name: 'ChatGPT / OpenAI',
      desc: 'Conversational AI that retrieves and synthesizes answers from web content.',
    },
    {
      name: 'Google AI Overview',
      desc: 'AI-generated summaries displayed at the top of Google search results.',
    },
    {
      name: 'Perplexity AI',
      desc: 'AI-powered search engine that provides sourced, citation-backed answers.',
    },
    {
      name: 'Bing Copilot',
      desc: 'Microsoft AI assistant that answers queries using web data and Bing index.',
    },
    {
      name: 'Claude (Anthropic)',
      desc: 'AI assistant with web search capabilities for real-time information retrieval.',
    },
  ];

  const qaStrategies = [
    {
      title: 'Use explicit question-and-answer formatting',
      desc: 'Structure content with clear question headings (H2/H3) followed by concise, direct answers in the first 1-2 sentences.',
    },
    {
      title: 'Provide concise, factual answers first',
      desc: 'Lead with a direct answer (40-60 words), then expand with supporting details. Answer engines prefer content that front-loads the answer.',
    },
    {
      title: 'Target long-tail conversational queries',
      desc: 'Optimize for natural-language questions users ask AI assistants, such as "How does round-up investing work?" or "What is micro-investing?".',
    },
    {
      title: 'Include structured lists and step-by-step guides',
      desc: 'Answer engines frequently extract ordered lists and numbered steps. Format actionable content as bulleted or numbered lists.',
    },
    {
      title: 'Add authoritative citations and data points',
      desc: 'Include specific statistics, percentages, and references to authoritative sources. AI engines prioritize well-sourced content.',
    },
  ];

  const voiceSearchChecklist: Array<{ item: string; status: 'ready' | 'needs-review' | 'not-configured' }> = [
    { item: 'Content uses natural, conversational language', status: 'ready' },
    { item: 'FAQ sections with question-format headings', status: 'ready' },
    { item: 'Short, direct answers (under 30 words) for key queries', status: 'needs-review' },
    { item: 'Local business schema markup', status: 'not-configured' },
    { item: 'Page load speed under 3 seconds on mobile', status: 'needs-review' },
    { item: 'HTTPS enabled across all pages', status: 'ready' },
    { item: 'Speakable schema markup for key content', status: 'not-configured' },
  ];

  const snippetGuide = [
    {
      title: 'Paragraph snippets',
      desc: 'Write 40-60 word answer paragraphs directly below question headings. Google and AI engines extract these as featured answers.',
    },
    {
      title: 'List snippets',
      desc: 'Use ordered or unordered lists for "how to" and "best of" content. Ensure lists have 3-8 items with clear, concise descriptions.',
    },
    {
      title: 'Table snippets',
      desc: 'Present comparison data in HTML tables with clear headers. Tables are frequently extracted for "vs" and comparison queries.',
    },
    {
      title: 'Video snippets',
      desc: 'Add VideoObject schema to embedded videos. Include timestamps and transcripts for AI extraction.',
    },
  ];

  const faqSchemaStatus: Array<{ page: string; status: 'implemented' | 'pending' | 'not-applicable'; count: number }> = [
    { page: 'Learn / FAQ Page', status: 'implemented', count: 8 },
    { page: 'Homepage', status: 'pending', count: 0 },
    { page: 'Pricing Page', status: 'pending', count: 0 },
    { page: 'Blog Posts', status: 'pending', count: 0 },
    { page: 'Contact Page', status: 'not-applicable', count: 0 },
  ];

  const knowledgePanelItems: Array<{ label: string; variant: 'success' | 'warning' | 'info'; text: string }> = [
    { label: 'Organization schema with complete properties', variant: 'success', text: 'Implemented' },
    { label: 'Social media profile links (sameAs)', variant: 'warning', text: 'Needs Review' },
    { label: 'Official website claim in Google Knowledge Panel', variant: 'warning', text: 'Not Verified' },
    { label: 'Wikipedia / Wikidata entity', variant: 'info', text: 'Not Created' },
    { label: 'Google Business Profile', variant: 'info', text: 'Not Configured' },
    { label: 'Brand logo and images in schema', variant: 'success', text: 'Implemented' },
  ];

  const metricsToTrack = [
    { metric: 'Answer Box Appearances', desc: 'Number of times your content appears in Google featured snippets and AI overviews.' },
    { metric: 'Voice Search Impressions', desc: 'Estimated impressions from voice-activated search queries (requires GSC integration).' },
    { metric: 'AI Citation Rate', desc: 'Frequency with which AI engines cite your content as a source in generated answers.' },
    { metric: 'Zero-Click Search Share', desc: 'Percentage of queries where users get the answer directly from your snippet without clicking through.' },
    { metric: 'FAQ Rich Result Impressions', desc: 'Impressions generated by FAQ schema rich results in search (requires GSC).' },
    { metric: 'People Also Ask Appearances', desc: 'Number of times your content appears in Google "People Also Ask" expandable sections.' },
  ];

  const statusVariant = (status: string): 'success' | 'warning' | 'info' => {
    if (status === 'ready' || status === 'implemented') return 'success';
    if (status === 'needs-review' || status === 'pending') return 'warning';
    return 'info';
  };

  const statusLabel = (status: string): string => {
    if (status === 'ready') return 'Ready';
    if (status === 'needs-review') return 'Needs Review';
    if (status === 'not-configured') return 'Not Configured';
    if (status === 'implemented') return 'Implemented';
    if (status === 'pending') return 'Pending';
    if (status === 'not-applicable') return 'N/A';
    return status;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* What is AEO */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Answer Engine Optimization (AEO)
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          AEO is the practice of optimizing content so that answer engines -- AI-powered platforms such as
          ChatGPT, Perplexity, Google AI Overview, and Bing Copilot -- can accurately retrieve, cite, and
          present your information in their generated responses. Unlike traditional SEO which focuses on
          ranking web pages in link-based results, AEO focuses on making your content the preferred source
          for AI-synthesized answers.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {answerEngines.map((engine) => (
            <div key={engine.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ color: '#A78BFA', fontSize: '14px', marginTop: '2px' }}>{'\u2022'}</span>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>{engine.name}</span>
                <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginLeft: '8px' }}>
                  {engine.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Q&A Format Optimization */}
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Question-Answer Format Optimization
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Structure your content in question-and-answer format to increase the likelihood of extraction by answer engines.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {qaStrategies.map((strategy, idx) => (
            <GlassCard key={idx} padding="20px">
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', marginBottom: '6px' }}>
                {idx + 1}. {strategy.title}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.5 }}>
                {strategy.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      {/* Voice Search Readiness */}
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Voice Search Readiness Checklist
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Voice search queries are typically conversational and question-based. Ensure your content is optimized
          for voice assistants (Google Assistant, Siri, Alexa) that rely on answer engines.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {voiceSearchChecklist.map((entry) => (
            <div key={entry.item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: entry.status === 'ready' ? '#34D399' : entry.status === 'needs-review' ? '#FBBF24' : 'rgba(248,250,252,0.4)', fontSize: '16px' }}>
                  {entry.status === 'ready' ? '\u2713' : entry.status === 'needs-review' ? '\u25CB' : '\u2717'}
                </span>
                <span style={{ fontSize: '14px', color: '#F8FAFC' }}>{entry.item}</span>
              </div>
              <Badge variant={statusVariant(entry.status)}>{statusLabel(entry.status)}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Featured Snippet Optimization */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Featured Snippet Optimization Guide
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Featured snippets are the primary source for AI answer engines. Optimize your content to win snippet
          positions across all four snippet types.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {snippetGuide.map((guide, idx) => (
            <GlassCard key={idx} padding="20px">
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', marginBottom: '6px' }}>
                {guide.title}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.5 }}>
                {guide.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      {/* FAQ Schema Implementation Status */}
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          FAQ Schema Implementation Status
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          FAQ schema (FAQPage structured data) enables rich results in search and improves content extraction
          by answer engines.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqSchemaStatus.map((entry) => (
            <div key={entry.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC', minWidth: '160px' }}>
                  {entry.page}
                </span>
                {entry.status === 'implemented' && entry.count > 0 && (
                  <span style={{ fontSize: '12px', color: 'rgba(248,250,252,0.4)' }}>
                    {entry.count} questions
                  </span>
                )}
              </div>
              <Badge variant={statusVariant(entry.status)}>{statusLabel(entry.status)}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Knowledge Panel Readiness */}
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Knowledge Panel Readiness
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Knowledge panels are used by Google and AI engines to display authoritative entity information.
          Establishing a verified knowledge panel increases your content authority in answer engine results.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {knowledgePanelItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: '#F8FAFC' }}>{item.label}</span>
              <Badge variant={item.variant}>{item.text}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Key Metrics to Track */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Key Metrics to Track
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Monitor these AEO-specific metrics to measure your answer engine visibility. Metric collection
          requires Google Search Console and third-party AEO tracking integrations.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {metricsToTrack.map((entry) => (
            <GlassCard key={entry.metric} padding="20px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
                  {entry.metric}
                </p>
                <Badge variant="info">Not Connected</Badge>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.5 }}>
                {entry.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 8: CRO (Conversion Rate Optimization)                         */
/* ------------------------------------------------------------------ */

function CroContent() {
  const funnelStages: Array<{ stage: string; desc: string; widthPercent: number; color: string }> = [
    { stage: 'Visitor', desc: 'Users who land on the site from any source.', widthPercent: 100, color: '#8B5CF6' },
    { stage: 'Sign Up', desc: 'Users who create a Kamioi account.', widthPercent: 70, color: '#6366F1' },
    { stage: 'Subscribe', desc: 'Users who activate a subscription or link a payment method.', widthPercent: 40, color: '#06B6D4' },
    { stage: 'Active User', desc: 'Users who complete at least one round-up investment.', widthPercent: 22, color: '#34D399' },
  ];

  const abTestFields: Array<{ label: string; value: string }> = [
    { label: 'Active Tests', value: '--' },
    { label: 'Completed Tests', value: '--' },
    { label: 'Avg. Conversion Lift', value: '--' },
    { label: 'Statistical Significance', value: '--' },
  ];

  const landingPageMetrics = [
    { page: 'Homepage (/)', metric: 'Conversion Rate', value: '--', note: 'Requires GA4 integration' },
    { page: 'Learn (/learn)', metric: 'Conversion Rate', value: '--', note: 'Requires GA4 integration' },
    { page: 'Pricing (/pricing)', metric: 'Conversion Rate', value: '--', note: 'Requires GA4 integration' },
    { page: 'Blog (/blog)', metric: 'Conversion Rate', value: '--', note: 'Requires GA4 integration' },
    { page: 'Contact (/contact)', metric: 'Submission Rate', value: '--', note: 'Requires GA4 integration' },
  ];

  const ctaItems = [
    { cta: 'Hero "Get Started" Button', placement: 'Homepage hero section', clicks: '--', conversions: '--' },
    { cta: 'Navigation "Sign Up" Link', placement: 'Global navigation bar', clicks: '--', conversions: '--' },
    { cta: 'Pricing "Subscribe" Button', placement: 'Pricing page cards', clicks: '--', conversions: '--' },
    { cta: 'Blog "Read More" Links', placement: 'Blog listing page', clicks: '--', conversions: '--' },
    { cta: 'Footer "Contact Us" Link', placement: 'Global footer', clicks: '--', conversions: '--' },
  ];

  const journeyStages = [
    {
      title: 'Awareness',
      desc: 'User discovers Kamioi through search, social, or referral. Track entry pages, traffic sources, and first-touch attribution.',
    },
    {
      title: 'Consideration',
      desc: 'User browses features, pricing, and learn pages. Track page depth, time on site, and content engagement.',
    },
    {
      title: 'Decision',
      desc: 'User reaches signup or pricing page. Track form starts, drop-off points, and hesitation signals.',
    },
    {
      title: 'Action',
      desc: 'User completes signup and activates account. Track completion rate, time to convert, and post-signup behavior.',
    },
    {
      title: 'Retention',
      desc: 'User returns and engages regularly. Track login frequency, feature usage, and churn indicators.',
    },
  ];

  const bounceExitPages = [
    { page: '/', label: 'Homepage', bounceRate: '--', exitRate: '--' },
    { page: '/learn', label: 'Learn', bounceRate: '--', exitRate: '--' },
    { page: '/pricing', label: 'Pricing', bounceRate: '--', exitRate: '--' },
    { page: '/blog', label: 'Blog', bounceRate: '--', exitRate: '--' },
    { page: '/contact', label: 'Contact', bounceRate: '--', exitRate: '--' },
  ];

  const formAnalytics = [
    { form: 'Sign Up Form', views: '--', starts: '--', completions: '--', dropOff: '--' },
    { form: 'Contact Form', views: '--', starts: '--', completions: '--', dropOff: '--' },
    { form: 'Demo Request Form', views: '--', starts: '--', completions: '--', dropOff: '--' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Conversion Funnel */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Conversion Funnel
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '24px' }}>
          Visualize the user journey from first visit to active investor. Funnel data will populate
          when GA4 conversion tracking is configured.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {funnelStages.map((stage) => (
            <div key={stage.stage} style={{ width: '100%', maxWidth: '600px' }}>
              <div
                style={{
                  width: `${stage.widthPercent}%`,
                  margin: '0 auto',
                  background: `linear-gradient(135deg, ${stage.color}33, ${stage.color}11)`,
                  border: `1px solid ${stage.color}44`,
                  borderRadius: '8px',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>{stage.stage}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '2px' }}>{stage.desc}</p>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 700, color: stage.color }}>--</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* A/B Test Tracking */}
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          A/B Test Tracking
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Track and manage A/B tests across landing pages, CTAs, and user flows. Connect an A/B testing
          platform (e.g., Google Optimize, VWO, Optimizely) to populate test data.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {abTestFields.map((field) => (
            <KpiCard key={field.label} label={field.label} value={field.value} accent="blue" />
          ))}
        </div>
        <GlassCard padding="20px">
          <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
            No active A/B tests. Create tests by defining variants for your landing pages, headlines,
            CTAs, or signup flows. Each test should run until it reaches statistical significance
            (typically 95% confidence level with a minimum sample of 1,000 visitors per variant).
          </p>
        </GlassCard>
      </GlassCard>

      {/* Landing Page Performance */}
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Landing Page Performance
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Monitor conversion rates and engagement metrics for each landing page. Data requires GA4 event tracking.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {landingPageMetrics.map((entry) => (
            <div key={entry.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC', minWidth: '180px' }}>
                  {entry.page}
                </span>
                <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.4)' }}>{entry.metric}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(248,250,252,0.4)' }}>
                  {entry.value}
                </span>
                <Badge variant="info">{entry.note}</Badge>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* CTA Effectiveness */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          CTA Effectiveness Tracking
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Measure how effectively each call-to-action drives user engagement and conversions. Requires
          GA4 event tracking on CTA elements.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ctaItems.map((cta) => (
            <GlassCard key={cta.cta} padding="20px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>{cta.cta}</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.4)' }}>
                    Clicks: {cta.clicks}
                  </span>
                  <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.4)' }}>
                    Conversions: {cta.conversions}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.4)' }}>{cta.placement}</p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      {/* User Journey Analysis */}
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          User Journey Analysis
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Map the complete user journey from awareness to retention. Identify drop-off points and optimize
          each stage of the conversion path.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {journeyStages.map((stage, idx) => (
            <GlassCard key={idx} padding="20px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#F8FAFC',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>{stage.title}</p>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.5, marginLeft: '40px' }}>
                {stage.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      {/* Bounce Rate & Exit Page Analysis */}
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Bounce Rate and Exit Page Analysis
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Identify pages where users leave without converting. High bounce and exit rates indicate opportunities
          for content or UX improvement. Data requires GA4 integration.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px',
              gap: '12px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(248,250,252,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Page
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(248,250,252,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
              Bounce Rate
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(248,250,252,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
              Exit Rate
            </span>
          </div>
          {bounceExitPages.map((entry) => (
            <div
              key={entry.page}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 120px',
                gap: '12px',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC' }}>{entry.label}</span>
                <span style={{ fontSize: '12px', color: 'rgba(248,250,252,0.4)', marginLeft: '8px' }}>
                  {entry.page}
                </span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(248,250,252,0.4)', textAlign: 'right' }}>
                {entry.bounceRate}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(248,250,252,0.4)', textAlign: 'right' }}>
                {entry.exitRate}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Form Analytics */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Form Analytics
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Track form performance across signup, contact, and demo request forms. Identify where users
          abandon forms and optimize for completion. Requires GA4 form interaction event tracking.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {formAnalytics.map((form) => (
            <GlassCard key={form.form} padding="20px">
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', marginBottom: '12px' }}>
                {form.form}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Views
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(248,250,252,0.4)' }}>{form.views}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Starts
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(248,250,252,0.4)' }}>{form.starts}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Completions
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(248,250,252,0.4)' }}>{form.completions}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Drop-off
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(248,250,252,0.4)' }}>{form.dropOff}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 9: Recommendations                                            */
/* ------------------------------------------------------------------ */

function RecommendationsContent() {
  const recommendations = [
    {
      title: 'Optimize page load speed',
      desc: 'Aim for LCP under 2.5 seconds. Use lazy loading for images and code splitting.',
    },
    {
      title: 'Add structured data to all pages',
      desc: 'Implement JSON-LD schema markup for Organization, WebSite, and BlogPosting.',
    },
    {
      title: 'Improve internal linking',
      desc: 'Add contextual links between blog posts and feature pages.',
    },
    {
      title: 'Create more long-form content',
      desc: 'Publish 1500+ word articles targeting investment and savings keywords.',
    },
    {
      title: 'Monitor Core Web Vitals',
      desc: 'Set up Lighthouse CI to track performance metrics automatically.',
    },
    {
      title: 'Expand keyword targeting',
      desc: 'Research and target long-tail keywords in the micro-investing niche.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          AI-Generated SEO Recommendations
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Automated recommendations require the SEO audit Edge Function. Below are general best practices.
        </p>
      </GlassCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {recommendations.map((rec, idx) => (
          <GlassCard key={idx} padding="24px">
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
              {idx + 1}. {rec.title}
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
              {rec.desc}
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 10: GA4 Analytics                                              */
/* ------------------------------------------------------------------ */

function Ga4AnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [measurementId, setMeasurementId] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    async function fetchGa4Config() {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['ga4_measurement_id', 'ga4_api_secret']);

        const settings = (data ?? []) as AdminSettingRow[];
        const midSetting = settings.find((s) => s.setting_key === 'ga4_measurement_id');
        const secretSetting = settings.find((s) => s.setting_key === 'ga4_api_secret');

        if (midSetting?.setting_value) {
          setMeasurementId(midSetting.setting_value);
          setGa4Connected(true);
        }
        if (secretSetting?.setting_value) {
          setApiSecret(secretSetting.setting_value);
        }
      } catch {
        console.error('Failed to fetch GA4 config');
      } finally {
        setLoading(false);
      }
    }

    fetchGa4Config();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      const upsertSettings = async (key: string, value: string) => {
        const { data: existing } = await supabase
          .from('admin_settings')
          .select('id')
          .eq('setting_key', key)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from('admin_settings')
            .update({ setting_value: value })
            .eq('setting_key', key);
        } else {
          await supabase.from('admin_settings').insert({
            setting_key: key,
            setting_value: value,
            setting_type: 'analytics',
            description: key === 'ga4_measurement_id' ? 'GA4 Measurement ID' : 'GA4 API Secret',
          });
        }
      };

      await upsertSettings('ga4_measurement_id', measurementId);
      await upsertSettings('ga4_api_secret', apiSecret);

      setGa4Connected(measurementId.trim().length > 0);
      setSaveMessage('GA4 configuration saved successfully.');
    } catch {
      setSaveMessage('Failed to save GA4 configuration.');
    } finally {
      setSaving(false);
    }
  }, [measurementId, apiSecret]);

  const ga4Features = [
    'Traffic sources',
    'User demographics',
    'Conversion tracking',
    'Event tracking',
    'User journeys',
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading GA4 configuration...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Google Analytics 4 Integration
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Google Analytics 4 integration provides detailed user behavior analytics.
        </p>
        <div style={{ marginTop: '12px' }}>
          {ga4Connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="warning">Not Connected</Badge>
          )}
        </div>
      </GlassCard>

      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
          Connect GA4
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <Input
            label="GA4 Measurement ID"
            placeholder="G-XXXXXXXXXX"
            value={measurementId}
            onChange={(e) => setMeasurementId(e.target.value)}
          />
          <Input
            label="API Secret"
            placeholder="Enter API secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
          />
          <Button onClick={handleSave} loading={saving}>
            Save GA4 Configuration
          </Button>
          {saveMessage && (
            <p style={{ fontSize: '13px', color: saveMessage.includes('success') ? '#34D399' : '#EF4444' }}>
              {saveMessage}
            </p>
          )}
        </div>
      </GlassCard>

      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
          GA4 Features
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ga4Features.map((feature) => (
            <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#3B82F6', fontSize: '14px' }}>{'\u2022'}</span>
              <span style={{ fontSize: '14px', color: 'rgba(248,250,252,0.7)' }}>{feature}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SeoGeoTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'overview', label: 'Overview', content: <OverviewContent /> },
      { key: 'rankings-traffic', label: 'Rankings & Traffic', content: <RankingsTrafficContent /> },
      { key: 'technical-audit', label: 'Technical Audit', content: <TechnicalAuditContent /> },
      { key: 'content-seo', label: 'Content SEO', content: <ContentSeoContent /> },
      { key: 'structured-data', label: 'Structured Data', content: <StructuredDataContent /> },
      { key: 'geo-ai-search', label: 'GEO / AI Search', content: <GeoAiSearchContent /> },
      { key: 'aeo', label: 'AEO', content: <AeoContent /> },
      { key: 'cro', label: 'CRO', content: <CroContent /> },
      { key: 'recommendations', label: 'Recommendations', content: <RecommendationsContent /> },
      { key: 'ga4-analytics', label: 'GA4 Analytics', content: <Ga4AnalyticsContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
        SEO, GEO, AEO & CRO Analytics
      </p>
      <Tabs tabs={tabs} defaultTab="overview" />
    </div>
  );
}
