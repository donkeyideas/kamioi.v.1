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
/*  Tab 7: Recommendations                                            */
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
/*  Tab 8: GA4 Analytics                                               */
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
      { key: 'recommendations', label: 'Recommendations', content: <RecommendationsContent /> },
      { key: 'ga4-analytics', label: 'GA4 Analytics', content: <Ga4AnalyticsContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
        SEO and GEO Analytics
      </p>
      <Tabs tabs={tabs} defaultTab="overview" />
    </div>
  );
}
