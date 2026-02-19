import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ---------- Types ---------- */

interface ApiUsageRow {
  id: number;
  endpoint: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  processing_time_ms: number | null;
  cost: number | null;
  success: boolean;
  error_message: string | null;
  user_id: string | null;
  page_tab: string | null;
  created_at: string;
}

interface EndpointCallPoint {
  [key: string]: unknown;
  name: string;
  calls: number;
}

interface DailyVolumePoint {
  [key: string]: unknown;
  name: string;
  calls: number;
}

/* ---------- Helpers ---------- */

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function dayLabel(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/* ---------- Overview Tab ---------- */

function OverviewContent() {
  const [loading, setLoading] = useState(true);
  const [publishedBlogCount, setPublishedBlogCount] = useState<number | null>(null);
  const [blogError, setBlogError] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [blogResult, apiResult] = await Promise.all([
          supabase
            .from('blog_posts')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published'),

          supabase
            .from('api_usage')
            .select('id', { count: 'exact', head: true }),
        ]);

        if (blogResult.error) {
          console.error('Blog posts query error:', blogResult.error);
          setBlogError(true);
        } else {
          setPublishedBlogCount(blogResult.count ?? 0);
        }

        setApiCallCount(apiResult.count ?? 0);
      } catch (err) {
        console.error('OverviewContent fetch error:', err);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Pages Indexed" value="N/A" accent="purple" />
        <KpiCard
          label="Blog Posts Published"
          value={blogError ? 'N/A' : formatNumber(publishedBlogCount ?? 0)}
          accent="teal"
        />
        <KpiCard label="Total API Calls" value={formatNumber(apiCallCount)} accent="blue" />
      </div>

      <GlassCard accent="purple" padding="32px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '12px',
          }}
        >
          SEO Audit Engine
        </p>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(248,250,252,0.5)',
            lineHeight: 1.6,
          }}
        >
          SEO audit engine requires Edge Function configuration. Connect your Supabase Edge Functions to enable automated SEO audits.
        </p>
      </GlassCard>
    </div>
  );
}

/* ---------- API Usage Tab ---------- */

function ApiUsageContent() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<ApiUsageRow[]>([]);
  const [allUsageRows, setAllUsageRows] = useState<ApiUsageRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recentResult, allResult] = await Promise.all([
          /* Recent 50 for table */
          supabase
            .from('api_usage')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),

          /* All rows for aggregation */
          supabase
            .from('api_usage')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        setUsageData((recentResult.data ?? []) as ApiUsageRow[]);
        setAllUsageRows((allResult.data ?? []) as ApiUsageRow[]);
      } catch (err) {
        console.error('ApiUsageContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalCalls = useMemo(() => allUsageRows.length, [allUsageRows]);

  const totalCost = useMemo(() => {
    return allUsageRows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  }, [allUsageRows]);

  const avgResponseTime = useMemo(() => {
    const withTime = allUsageRows.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    const sum = withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0);
    return Math.round(sum / withTime.length);
  }, [allUsageRows]);

  const errorRate = useMemo(() => {
    if (allUsageRows.length === 0) return 0;
    const errors = allUsageRows.filter((r) => r.success === false).length;
    return errors / allUsageRows.length;
  }, [allUsageRows]);

  const callsByEndpoint = useMemo<EndpointCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const r of allUsageRows) {
      const endpoint = r.endpoint ?? 'Unknown';
      map.set(endpoint, (map.get(endpoint) ?? 0) + 1);
    }
    const result: EndpointCallPoint[] = [];
    for (const [name, calls] of map) {
      result.push({ name, calls });
    }
    return result.sort((a, b) => b.calls - a.calls);
  }, [allUsageRows]);

  const columns: Column<ApiUsageRow>[] = useMemo(
    () => [
      {
        key: 'endpoint',
        header: 'Endpoint',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'rgba(248,250,252,0.8)',
            }}
          >
            {row.endpoint ?? '--'}
          </span>
        ),
      },
      { key: 'model', header: 'Model', sortable: true, width: '140px' },
      {
        key: 'total_tokens',
        header: 'Tokens',
        sortable: true,
        width: '100px',
        align: 'right',
        render: (row) => formatNumber(row.total_tokens ?? 0),
      },
      {
        key: 'cost',
        header: 'Cost',
        sortable: true,
        width: '100px',
        align: 'right',
        render: (row) => (row.cost !== null ? formatCurrency(row.cost) : '--'),
      },
      {
        key: 'processing_time_ms',
        header: 'Time (ms)',
        sortable: true,
        width: '110px',
        align: 'right',
        render: (row) =>
          row.processing_time_ms !== null
            ? formatNumber(row.processing_time_ms)
            : '--',
      },
      {
        key: 'success',
        header: 'Success',
        width: '100px',
        render: (row) => (
          <Badge variant={row.success ? 'success' : 'error'}>
            {row.success ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading API usage...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Calls" value={formatNumber(totalCalls)} accent="purple" />
        <KpiCard label="Total Cost" value={formatCurrency(totalCost)} accent="teal" />
        <KpiCard label="Avg Response Time" value={`${formatNumber(avgResponseTime)}ms`} accent="blue" />
        <KpiCard label="Error Rate" value={formatPercent(errorRate)} accent="pink" />
      </div>

      <BarChart<EndpointCallPoint>
        data={callsByEndpoint}
        dataKey="calls"
        xKey="name"
        title="Calls by Endpoint"
        color="#7C3AED"
        height={260}
      />

      <GlassCard accent="blue" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#F8FAFC',
              marginBottom: '4px',
            }}
          >
            Recent API Calls
          </p>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(248,250,252,0.4)',
              marginBottom: '16px',
            }}
          >
            Last 50 API usage records
          </p>
        </div>
        <Table<ApiUsageRow>
          columns={columns}
          data={usageData}
          loading={false}
          emptyMessage="No API usage data found"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ---------- Performance Tab ---------- */

function PerformanceContent() {
  const [loading, setLoading] = useState(true);
  const [usageRows, setUsageRows] = useState<ApiUsageRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase
          .from('api_usage')
          .select('id, created_at')
          .order('created_at', { ascending: true });

        setUsageRows((result.data ?? []) as ApiUsageRow[]);
      } catch (err) {
        console.error('PerformanceContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const dailyVolume = useMemo<DailyVolumePoint[]>(() => {
    const dayMap = new Map<string, number>();
    for (const row of usageRows) {
      const key = dayLabel(row.created_at);
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
    const result: DailyVolumePoint[] = [];
    for (const [name, calls] of dayMap) {
      result.push({ name, calls });
    }
    return result;
  }, [usageRows]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading performance data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="teal" padding="32px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '12px',
          }}
        >
          Performance Metrics
        </p>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(248,250,252,0.5)',
            lineHeight: 1.6,
          }}
        >
          Performance metrics require Google Search Console and Analytics integration. Configure in System Settings.
        </p>
      </GlassCard>

      <LineChart<DailyVolumePoint>
        data={dailyVolume}
        dataKey="calls"
        xKey="name"
        title="Daily API Call Volume"
        color="#06B6D4"
        height={280}
      />
    </div>
  );
}

/* ---------- Main Component ---------- */

export function SeoGeoTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      {
        key: 'overview',
        label: 'Overview',
        content: <OverviewContent />,
      },
      {
        key: 'api-usage',
        label: 'API Usage',
        content: <ApiUsageContent />,
      },
      {
        key: 'performance',
        label: 'Performance',
        content: <PerformanceContent />,
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#F8FAFC',
        }}
      >
        SEO and GEO Analytics
      </p>
      <Tabs tabs={tabs} defaultTab="overview" />
    </div>
  );
}
