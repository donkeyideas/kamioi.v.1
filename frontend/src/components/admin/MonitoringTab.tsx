import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Modal } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  request_data: Record<string, unknown> | null;
  response_data: Record<string, unknown> | null;
  user_id: string | null;
  page_tab: string | null;
  created_at: string;
}

interface SystemEventRow {
  id: number;
  event_type: string | null;
  tenant_id: string | null;
  tenant_type: string | null;
  data: Record<string, unknown> | null;
  correlation_id: string | null;
  source: string | null;
  created_at: string;
}

interface EndpointCount {
  [key: string]: unknown;
  name: string;
  count: number;
}

interface DailyAvgTime {
  [key: string]: unknown;
  name: string;
  avgTime: number;
}

interface TimeBucket {
  [key: string]: unknown;
  name: string;
  count: number;
}

interface DailyCost {
  [key: string]: unknown;
  name: string;
  cost: number;
}

interface EndpointCost {
  [key: string]: unknown;
  name: string;
  cost: number;
}

interface HealthCheckResult {
  name: string;
  responseTime: number;
  rowCount: number | null;
  status: 'success' | 'warning' | 'error';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Tab 1: API Usage                                                   */
/* ------------------------------------------------------------------ */

function ApiUsageContent() {
  const [usageData, setUsageData] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCalls, setTotalCalls] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const [totalResult, successResult, failedResult, dataResult] = await Promise.all([
          supabase.from('api_usage').select('*', { count: 'exact', head: true }),
          supabase.from('api_usage').select('*', { count: 'exact', head: true }).eq('success', true),
          supabase.from('api_usage').select('*', { count: 'exact', head: true }).eq('success', false),
          supabase.from('api_usage').select('*').order('created_at', { ascending: false }).limit(200),
        ]);

        setTotalCalls(totalResult.count ?? 0);
        setSuccessCount(successResult.count ?? 0);
        setFailedCount(failedResult.count ?? 0);
        setUsageData((dataResult.data ?? []) as ApiUsageRow[]);
      } catch {
        console.error('Failed to fetch API usage');
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  const totalCost = useMemo(
    () => usageData.reduce((sum, row) => sum + (row.cost ?? 0), 0),
    [usageData],
  );

  const avgResponseTime = useMemo(() => {
    const withTime = usageData.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    const sum = withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0);
    return Math.round(sum / withTime.length);
  }, [usageData]);

  const endpointCounts = useMemo<EndpointCount[]>(() => {
    const map = new Map<string, number>();
    usageData.forEach((row) => {
      const endpoint = row.endpoint ?? 'unknown';
      map.set(endpoint, (map.get(endpoint) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [usageData]);

  const usageColumns: Column<ApiUsageRow>[] = useMemo(
    () => [
      {
        key: 'endpoint',
        header: 'Endpoint',
        sortable: true,
        width: '160px',
        render: (row) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>
            {row.endpoint ?? '--'}
          </span>
        ),
      },
      { key: 'model', header: 'Model', sortable: true, width: '120px' },
      {
        key: 'prompt_tokens',
        header: 'Prompt',
        sortable: true,
        align: 'right',
        width: '80px',
        render: (row) => (row.prompt_tokens ?? 0).toLocaleString(),
      },
      {
        key: 'completion_tokens',
        header: 'Completion',
        sortable: true,
        align: 'right',
        width: '90px',
        render: (row) => (row.completion_tokens ?? 0).toLocaleString(),
      },
      {
        key: 'total_tokens',
        header: 'Total',
        sortable: true,
        align: 'right',
        width: '80px',
        render: (row) => (row.total_tokens ?? 0).toLocaleString(),
      },
      {
        key: 'cost',
        header: 'Cost ($)',
        sortable: true,
        align: 'right',
        width: '90px',
        render: (row) => usd(row.cost ?? 0),
      },
      {
        key: 'processing_time_ms',
        header: 'Time (ms)',
        sortable: true,
        align: 'right',
        width: '90px',
        render: (row) => (row.processing_time_ms ?? 0).toLocaleString(),
      },
      {
        key: 'success',
        header: 'Success',
        sortable: true,
        width: '90px',
        render: (row) => (
          <Badge variant={row.success ? 'success' : 'error'}>
            {row.success ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'user_id',
        header: 'User ID',
        width: '80px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {row.user_id ?? '--'}
          </span>
        ),
      },
      {
        key: 'page_tab',
        header: 'Page Tab',
        width: '100px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {row.page_tab ?? '--'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '160px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Calls" value={totalCalls.toLocaleString()} accent="purple" />
        <KpiCard label="Successful" value={successCount.toLocaleString()} accent="teal" />
        <KpiCard label="Failed" value={failedCount.toLocaleString()} accent="pink" />
        <KpiCard label="Total Cost" value={usd(totalCost)} accent="blue" />
        <KpiCard label="Avg Response Time" value={`${avgResponseTime.toLocaleString()} ms`} accent="purple" />
      </div>

      <BarChart<EndpointCount>
        data={endpointCounts}
        dataKey="count"
        xKey="name"
        title="Calls by Endpoint (Top 10)"
        color="#7C3AED"
        height={260}
      />

      <GlassCard padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            API Usage Log
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Most recent API calls
          </p>
        </div>
        <Table<ApiUsageRow>
          columns={usageColumns}
          data={usageData}
          loading={loading}
          emptyMessage="No API usage data recorded"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Error Log                                                   */
/* ------------------------------------------------------------------ */

function ErrorLogContent() {
  const [errors, setErrors] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalErrors, setTotalErrors] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [selectedError, setSelectedError] = useState<ApiUsageRow | null>(null);

  useEffect(() => {
    async function fetchErrors() {
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const [totalResult, recentResult, dataResult] = await Promise.all([
          supabase.from('api_usage').select('*', { count: 'exact', head: true }).eq('success', false),
          supabase
            .from('api_usage')
            .select('*', { count: 'exact', head: true })
            .eq('success', false)
            .gte('created_at', twentyFourHoursAgo.toISOString()),
          supabase
            .from('api_usage')
            .select('*')
            .eq('success', false)
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

        setTotalErrors(totalResult.count ?? 0);
        setRecentCount(recentResult.count ?? 0);

        const errorData = (dataResult.data ?? []) as ApiUsageRow[];
        setErrors(errorData);

        const critical = errorData.filter(
          (r) => (r.processing_time_ms ?? 0) > 5000 && !r.success,
        ).length;
        setCriticalCount(critical);
      } catch {
        console.error('Failed to fetch error log');
      } finally {
        setLoading(false);
      }
    }

    fetchErrors();
  }, []);

  const errorColumns: Column<ApiUsageRow>[] = useMemo(
    () => [
      {
        key: 'endpoint',
        header: 'Endpoint',
        sortable: true,
        width: '180px',
        render: (row) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>
            {row.endpoint ?? '--'}
          </span>
        ),
      },
      {
        key: 'error_message',
        header: 'Error Message',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {row.error_message
              ? row.error_message.length > 60
                ? `${row.error_message.substring(0, 60)}...`
                : row.error_message
              : '--'}
          </span>
        ),
      },
      {
        key: 'model',
        header: 'Model',
        sortable: true,
        width: '120px',
        render: (row) => row.model ?? '--',
      },
      {
        key: 'user_id',
        header: 'User ID',
        width: '80px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {row.user_id ?? '--'}
          </span>
        ),
      },
      {
        key: 'page_tab',
        header: 'Page Tab',
        width: '100px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {row.page_tab ?? '--'}
          </span>
        ),
      },
      {
        key: 'processing_time_ms',
        header: 'Time (ms)',
        sortable: true,
        align: 'right',
        width: '90px',
        render: (row) => (row.processing_time_ms ?? 0).toLocaleString(),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '160px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  if (!loading && errors.length === 0) {
    return (
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          No Errors
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          No API errors recorded. System is running smoothly.
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Errors" value={totalErrors.toLocaleString()} accent="pink" />
        <KpiCard label="Critical (>5s)" value={criticalCount.toLocaleString()} accent="pink" />
        <KpiCard label="Recent (24h)" value={recentCount.toLocaleString()} accent="purple" />
      </div>

      <GlassCard padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Error Log
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Click a row to view full error details
          </p>
        </div>
        <Table<ApiUsageRow>
          columns={errorColumns}
          data={errors}
          loading={loading}
          emptyMessage="No API errors recorded"
          pageSize={15}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedError(row)}
        />
      </GlassCard>

      <Modal
        open={selectedError !== null}
        onClose={() => setSelectedError(null)}
        title="Error Details"
        size="lg"
      >
        {selectedError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Endpoint
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {selectedError.endpoint ?? '--'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Error Message
              </p>
              <p style={{ fontSize: '14px', color: '#EF4444', lineHeight: 1.6 }}>
                {selectedError.error_message ?? 'No error message'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Request Data
              </p>
              <pre
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-input)',
                  padding: '12px',
                  borderRadius: '8px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  fontFamily: 'monospace',
                }}
              >
                {selectedError.request_data
                  ? JSON.stringify(selectedError.request_data, null, 2)
                  : 'No request data'}
              </pre>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Response Data
              </p>
              <pre
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-input)',
                  padding: '12px',
                  borderRadius: '8px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  fontFamily: 'monospace',
                }}
              >
                {selectedError.response_data
                  ? JSON.stringify(selectedError.response_data, null, 2)
                  : 'No response data'}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Model
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedError.model ?? '--'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Processing Time
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {selectedError.processing_time_ms ?? 0} ms
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Created At
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {formatDate(selectedError.created_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Performance                                                 */
/* ------------------------------------------------------------------ */

function PerformanceContent() {
  const [usageData, setUsageData] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const { data, error } = await supabase
          .from('api_usage')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) {
          setUsageData([]);
          return;
        }
        setUsageData((data ?? []) as ApiUsageRow[]);
      } catch {
        setUsageData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  const avgResponseTime = useMemo(() => {
    const withTime = usageData.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    const sum = withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0);
    return Math.round(sum / withTime.length);
  }, [usageData]);

  const p95ResponseTime = useMemo(() => {
    const times = usageData
      .filter((r) => r.processing_time_ms !== null)
      .map((r) => r.processing_time_ms as number)
      .sort((a, b) => a - b);
    if (times.length === 0) return 0;
    const idx = Math.floor(times.length * 0.95);
    return times[Math.min(idx, times.length - 1)];
  }, [usageData]);

  const maxResponseTime = useMemo(() => {
    const times = usageData
      .filter((r) => r.processing_time_ms !== null)
      .map((r) => r.processing_time_ms as number);
    if (times.length === 0) return 0;
    return Math.max(...times);
  }, [usageData]);

  const totalTokens = useMemo(
    () => usageData.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0),
    [usageData],
  );

  const dailyAvgTimes = useMemo<DailyAvgTime[]>(() => {
    const dayMap = new Map<string, { sum: number; count: number }>();
    usageData.forEach((row) => {
      if (row.processing_time_ms === null) return;
      const day = row.created_at.split('T')[0];
      const existing = dayMap.get(day) ?? { sum: 0, count: 0 };
      existing.sum += row.processing_time_ms;
      existing.count += 1;
      dayMap.set(day, existing);
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, { sum, count }]) => ({
        name: formatDateShort(day),
        avgTime: Math.round(sum / count),
      }));
  }, [usageData]);

  const timeBuckets = useMemo<TimeBucket[]>(() => {
    const buckets = { '<100ms': 0, '100-500ms': 0, '500-1000ms': 0, '1000-2000ms': 0, '>2000ms': 0 };
    usageData.forEach((row) => {
      const t = row.processing_time_ms ?? 0;
      if (t < 100) buckets['<100ms']++;
      else if (t < 500) buckets['100-500ms']++;
      else if (t < 1000) buckets['500-1000ms']++;
      else if (t < 2000) buckets['1000-2000ms']++;
      else buckets['>2000ms']++;
    });
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [usageData]);

  const errorRate = useMemo(() => {
    if (usageData.length === 0) return 0;
    return usageData.filter((r) => !r.success).length / usageData.length;
  }, [usageData]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading performance data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Avg Response Time" value={`${avgResponseTime.toLocaleString()} ms`} accent="purple" />
        <KpiCard label="P95 Response Time" value={`${p95ResponseTime.toLocaleString()} ms`} accent="blue" />
        <KpiCard label="Max Response Time" value={`${maxResponseTime.toLocaleString()} ms`} accent="pink" />
        <KpiCard label="Total Tokens Used" value={totalTokens.toLocaleString()} accent="teal" />
      </div>

      <LineChart<DailyAvgTime>
        data={dailyAvgTimes}
        dataKey="avgTime"
        xKey="name"
        title="Average Response Time by Day (ms)"
        color="#3B82F6"
        height={280}
      />

      <BarChart<TimeBucket>
        data={timeBuckets}
        dataKey="count"
        xKey="name"
        title="Response Time Distribution"
        color="#7C3AED"
        height={240}
      />

      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Performance Recommendations
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {avgResponseTime > 1000 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge variant="warning">High latency -- consider optimizing prompts</Badge>
            </div>
          )}
          {errorRate > 0.1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge variant="error">High error rate -- investigate failing endpoints</Badge>
            </div>
          )}
          {avgResponseTime <= 1000 && errorRate <= 0.1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge variant="success">Performance within normal parameters</Badge>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Loading Report                                              */
/* ------------------------------------------------------------------ */

interface TestEndpoint {
  name: string;
  table: string;
}

const TEST_ENDPOINTS: TestEndpoint[] = [
  { name: 'Users Table', table: 'users' },
  { name: 'Transactions Table', table: 'transactions' },
  { name: 'Portfolios Table', table: 'portfolios' },
  { name: 'LLM Mappings', table: 'llm_mappings' },
  { name: 'Notifications', table: 'notifications' },
  { name: 'API Usage', table: 'api_usage' },
];

function LoadingReportContent() {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total] = useState(TEST_ENDPOINTS.length);

  const runTests = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    const newResults: HealthCheckResult[] = [];

    for (let i = 0; i < TEST_ENDPOINTS.length; i++) {
      const endpoint = TEST_ENDPOINTS[i];
      const start = performance.now();

      try {
        const { count } = await supabase
          .from(endpoint.table)
          .select('id', { count: 'exact', head: true });

        const elapsed = Math.round(performance.now() - start);
        const status: 'success' | 'warning' | 'error' =
          elapsed < 500 ? 'success' : elapsed < 2000 ? 'warning' : 'error';

        newResults.push({
          name: endpoint.name,
          responseTime: elapsed,
          rowCount: count,
          status,
        });
      } catch {
        const elapsed = Math.round(performance.now() - start);
        newResults.push({
          name: endpoint.name,
          responseTime: elapsed,
          rowCount: null,
          status: 'error',
        });
      }

      setProgress(i + 1);
      setResults([...newResults]);
    }

    setRunning(false);
  }, []);

  const resultColumns: Column<HealthCheckResult>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Endpoint Name',
        render: (row) => (
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</span>
        ),
      },
      {
        key: 'responseTime',
        header: 'Response Time (ms)',
        sortable: true,
        align: 'right',
        width: '160px',
        render: (row) => (
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.responseTime.toLocaleString()} ms
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: '120px',
        render: (row) => (
          <Badge variant={row.status}>
            {row.status === 'success' ? 'Fast' : row.status === 'warning' ? 'Slow' : 'Timeout'}
          </Badge>
        ),
      },
      {
        key: 'rowCount',
        header: 'Row Count',
        align: 'right',
        width: '120px',
        render: (row) => (
          <span style={{ color: 'var(--text-secondary)' }}>
            {row.rowCount !== null ? row.rowCount.toLocaleString() : 'N/A'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Endpoint Health Check
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          Test API endpoints to measure response times.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button onClick={runTests} loading={running}>
            Run All Tests
          </Button>
          {running && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Test Progress: {progress} of {total} completed
            </span>
          )}
        </div>
      </GlassCard>

      {results.length > 0 && (
        <GlassCard padding="0">
          <Table<HealthCheckResult>
            columns={resultColumns}
            data={results}
            loading={false}
            emptyMessage="Run tests to see results"
            pageSize={10}
            rowKey={(row) => row.name}
          />
        </GlassCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5: System Events                                               */
/* ------------------------------------------------------------------ */

function SystemEventsContent() {
  const [events, setEvents] = useState<SystemEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventsToday, setEventsToday] = useState(0);
  const [uniqueTypes, setUniqueTypes] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = useCallback(async (filter?: string) => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalResult, todayResult] = await Promise.all([
        supabase.from('system_events').select('*', { count: 'exact', head: true }),
        supabase
          .from('system_events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
      ]);

      setTotalEvents(totalResult.count ?? 0);
      setEventsToday(todayResult.count ?? 0);

      let query = supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filter && filter.trim().length > 0) {
        query = query.ilike('event_type', `%${filter.trim()}%`);
      }

      const { data } = await query;
      const eventData = (data ?? []) as SystemEventRow[];
      setEvents(eventData);

      const typeSet = new Set(eventData.map((e) => e.event_type).filter(Boolean));
      setUniqueTypes(typeSet.size);
    } catch {
      console.error('Failed to fetch system events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSearch = useCallback(() => {
    fetchEvents(searchTerm);
  }, [fetchEvents, searchTerm]);

  const eventColumns: Column<SystemEventRow>[] = useMemo(
    () => [
      {
        key: 'event_type',
        header: 'Event Type',
        sortable: true,
        width: '180px',
        render: (row) => <Badge variant="info">{row.event_type ?? 'Unknown'}</Badge>,
      },
      {
        key: 'tenant_type',
        header: 'Tenant Type',
        sortable: true,
        width: '120px',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.tenant_type ?? '--'}
          </span>
        ),
      },
      {
        key: 'source',
        header: 'Source',
        sortable: true,
        width: '120px',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.source ?? '--'}
          </span>
        ),
      },
      {
        key: 'data',
        header: 'Data',
        render: (row) => {
          const text = row.data ? JSON.stringify(row.data) : '--';
          return (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {text.length > 80 ? `${text.substring(0, 80)}...` : text}
            </span>
          );
        },
      },
      {
        key: 'correlation_id',
        header: 'Correlation ID',
        width: '130px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {row.correlation_id ? row.correlation_id.substring(0, 12) : '--'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '160px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Events" value={totalEvents.toLocaleString()} accent="purple" />
        <KpiCard label="Events Today" value={eventsToday.toLocaleString()} accent="teal" />
        <KpiCard label="Unique Event Types" value={uniqueTypes.toLocaleString()} accent="blue" />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', maxWidth: '400px' }}>
        <Input
          label="Search by Event Type"
          placeholder="e.g., auth, security, admin..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <Button variant="secondary" onClick={handleSearch} size="md">
          Search
        </Button>
      </div>

      <GlassCard padding="0">
        <Table<SystemEventRow>
          columns={eventColumns}
          data={events}
          loading={loading}
          emptyMessage="No system events found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 6: Cost Analysis                                               */
/* ------------------------------------------------------------------ */

function CostAnalysisContent() {
  const [usageData, setUsageData] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiBalance, setApiBalance] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usageResult, balanceResult] = await Promise.all([
          supabase
            .from('api_usage')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000),
          supabase
            .from('api_balance')
            .select('balance')
            .order('updated_at', { ascending: false })
            .limit(1),
        ]);

        setUsageData((usageResult.data ?? []) as ApiUsageRow[]);

        if (balanceResult.data && balanceResult.data.length > 0) {
          setApiBalance((balanceResult.data[0] as { balance: number }).balance);
        }
      } catch {
        console.error('Failed to fetch cost data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalCost = useMemo(
    () => usageData.reduce((sum, r) => sum + (r.cost ?? 0), 0),
    [usageData],
  );

  const dailyAverage = useMemo(() => {
    const days = new Set(usageData.map((r) => r.created_at.split('T')[0]));
    if (days.size === 0) return 0;
    return totalCost / days.size;
  }, [usageData, totalCost]);

  const mostExpensiveEndpoint = useMemo(() => {
    const map = new Map<string, number>();
    usageData.forEach((r) => {
      const endpoint = r.endpoint ?? 'unknown';
      map.set(endpoint, (map.get(endpoint) ?? 0) + (r.cost ?? 0));
    });
    let maxEndpoint = '--';
    let maxCost = 0;
    for (const [endpoint, cost] of map) {
      if (cost > maxCost) {
        maxCost = cost;
        maxEndpoint = endpoint;
      }
    }
    return maxEndpoint;
  }, [usageData]);

  const costByEndpoint = useMemo<EndpointCost[]>(() => {
    const map = new Map<string, number>();
    usageData.forEach((r) => {
      const endpoint = r.endpoint ?? 'unknown';
      map.set(endpoint, (map.get(endpoint) ?? 0) + (r.cost ?? 0));
    });
    return Array.from(map.entries())
      .map(([name, cost]) => ({ name, cost: parseFloat(cost.toFixed(4)) }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [usageData]);

  const dailyCostTrend = useMemo<DailyCost[]>(() => {
    const dayMap = new Map<string, number>();
    usageData.forEach((r) => {
      const day = r.created_at.split('T')[0];
      dayMap.set(day, (dayMap.get(day) ?? 0) + (r.cost ?? 0));
    });
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, cost]) => ({
        name: formatDateShort(day),
        cost: parseFloat(cost.toFixed(4)),
      }));
  }, [usageData]);

  const optimizationTips = [
    'Use smaller models for simple tasks',
    'Cache frequent queries to reduce API calls',
    'Set daily cost limits to prevent overspending',
    'Monitor token usage -- reduce prompt sizes where possible',
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading cost data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total API Cost" value={usd(totalCost)} accent="purple" />
        <KpiCard label="Daily Average" value={usd(dailyAverage)} accent="teal" />
        <KpiCard
          label="Most Expensive Endpoint"
          value={mostExpensiveEndpoint.length > 20 ? `${mostExpensiveEndpoint.substring(0, 20)}...` : mostExpensiveEndpoint}
          accent="pink"
        />
        <KpiCard
          label="API Balance"
          value={apiBalance !== null ? usd(apiBalance) : 'N/A'}
          accent="blue"
        />
      </div>

      <BarChart<EndpointCost>
        data={costByEndpoint}
        dataKey="cost"
        xKey="name"
        title="Cost by Endpoint"
        color="#7C3AED"
        height={260}
      />

      <LineChart<DailyCost>
        data={dailyCostTrend}
        dataKey="cost"
        xKey="name"
        title="Daily Cost Trend"
        color="#06B6D4"
        height={280}
      />

      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Cost Optimization Tips
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {optimizationTips.map((tip, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ color: '#06B6D4', fontSize: '14px' }}>{'\u2022'}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {tip}
              </span>
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

export function MonitoringTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'usage', label: 'API Usage', content: <ApiUsageContent /> },
      { key: 'errors', label: 'Error Log', content: <ErrorLogContent /> },
      { key: 'performance', label: 'Performance', content: <PerformanceContent /> },
      { key: 'loading-report', label: 'Loading Report', content: <LoadingReportContent /> },
      { key: 'system-events', label: 'System Events', content: <SystemEventsContent /> },
      { key: 'cost-analysis', label: 'Cost Analysis', content: <CostAnalysisContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Tabs tabs={tabs} defaultTab="usage" />
    </div>
  );
}

export default MonitoringTab;
