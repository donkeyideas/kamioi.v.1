import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import type { Column, TabItem } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ApiUsageRow = Database['public']['Tables']['api_usage']['Row'];

interface EndpointCount {
  name: string;
  count: number;
}

interface DailyAvgTime {
  name: string;
  avgTime: number;
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
/*  API Usage tab                                                      */
/* ------------------------------------------------------------------ */

const usageColumns: Column<ApiUsageRow>[] = [
  {
    key: 'endpoint',
    header: 'Endpoint',
    sortable: true,
    width: '180px',
    render: (row) => row.endpoint ?? '--',
  },
  {
    key: 'model',
    header: 'Model',
    sortable: true,
    width: '140px',
    render: (row) => row.model ?? '--',
  },
  {
    key: 'total_tokens',
    header: 'Tokens',
    sortable: true,
    align: 'right',
    width: '100px',
    render: (row) => (row.total_tokens ?? 0).toLocaleString(),
  },
  {
    key: 'cost',
    header: 'Cost',
    sortable: true,
    align: 'right',
    width: '100px',
    render: (row) => usd(row.cost ?? 0),
  },
  {
    key: 'processing_time_ms',
    header: 'Time (ms)',
    sortable: true,
    align: 'right',
    width: '100px',
    render: (row) => (row.processing_time_ms ?? 0).toLocaleString(),
  },
  {
    key: 'success',
    header: 'Success',
    sortable: true,
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
    width: '180px',
    render: (row) => formatDate(row.created_at),
  },
];

function ApiUsageContent() {
  const [usageData, setUsageData] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCalls, setTotalCalls] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    async function fetchUsage() {
      try {
        // Fetch total count
        const { count: total } = await supabase
          .from('api_usage')
          .select('*', { count: 'exact', head: true });
        setTotalCalls(total ?? 0);

        // Fetch success count
        const { count: success } = await supabase
          .from('api_usage')
          .select('*', { count: 'exact', head: true })
          .eq('success', true);
        setSuccessCount(success ?? 0);

        // Fetch failed count
        const { count: failed } = await supabase
          .from('api_usage')
          .select('*', { count: 'exact', head: true })
          .eq('success', false);
        setFailedCount(failed ?? 0);

        // Fetch recent records
        const { data, error } = await supabase
          .from('api_usage')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Failed to fetch API usage:', error.message);
          setUsageData([]);
          return;
        }

        setUsageData(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching API usage:', err);
        setUsageData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  const totalCost = useMemo(() => {
    return usageData.reduce((sum, row) => sum + (row.cost ?? 0), 0);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Calls" value={totalCalls.toLocaleString()} accent="purple" />
        <KpiCard label="Successful" value={successCount.toLocaleString()} accent="teal" />
        <KpiCard label="Failed" value={failedCount.toLocaleString()} accent="pink" />
        <KpiCard label="Total Cost" value={usd(totalCost)} accent="blue" />
      </div>

      <BarChart<EndpointCount>
        data={endpointCounts}
        dataKey="count"
        xKey="name"
        title="Calls by Endpoint"
        color="#7C3AED"
        height={260}
      />

      <GlassCard padding="0">
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
/*  Error Log tab                                                      */
/* ------------------------------------------------------------------ */

const errorColumns: Column<ApiUsageRow>[] = [
  {
    key: 'endpoint',
    header: 'Endpoint',
    sortable: true,
    width: '180px',
    render: (row) => row.endpoint ?? '--',
  },
  {
    key: 'error_message',
    header: 'Error Message',
    render: (row) => (
      <span style={{ fontSize: '12px', color: 'rgba(248,250,252,0.6)' }}>
        {row.error_message ?? '--'}
      </span>
    ),
  },
  {
    key: 'model',
    header: 'Model',
    sortable: true,
    width: '140px',
    render: (row) => row.model ?? '--',
  },
  {
    key: 'user_id',
    header: 'User ID',
    sortable: true,
    width: '90px',
    render: (row) => row.user_id !== null ? String(row.user_id) : '--',
  },
  {
    key: 'created_at',
    header: 'Created At',
    sortable: true,
    width: '180px',
    render: (row) => formatDate(row.created_at),
  },
];

function ErrorLogContent() {
  const [errors, setErrors] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchErrors() {
      try {
        const { data, error } = await supabase
          .from('api_usage')
          .select('*')
          .eq('success', false)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.error('Failed to fetch error log:', error.message);
          setErrors([]);
          return;
        }

        setErrors(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching error log:', err);
        setErrors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchErrors();
  }, []);

  if (!loading && errors.length === 0) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)' }}>
          No API errors recorded.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="0">
      <Table<ApiUsageRow>
        columns={errorColumns}
        data={errors}
        loading={loading}
        emptyMessage="No API errors recorded"
        pageSize={15}
        rowKey={(row) => row.id}
      />
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Performance tab                                                    */
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
          console.error('Failed to fetch API usage for performance:', error.message);
          setUsageData([]);
          return;
        }

        setUsageData(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching performance data:', err);
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

  const totalTokens = useMemo(() => {
    return usageData.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0);
  }, [usageData]);

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
      .map(([day, { sum, count }]) => ({
        name: formatDateShort(day),
        avgTime: Math.round(sum / count),
      }))
      .reverse();
  }, [usageData]);

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)' }}>
          Loading performance data...
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard
          label="Avg Response Time"
          value={`${avgResponseTime.toLocaleString()} ms`}
          accent="purple"
        />
        <KpiCard
          label="P95 Response Time"
          value={`${p95ResponseTime.toLocaleString()} ms`}
          accent="blue"
        />
        <KpiCard
          label="Total Tokens Used"
          value={totalTokens.toLocaleString()}
          accent="teal"
        />
      </div>

      <LineChart<DailyAvgTime>
        data={dailyAvgTimes}
        dataKey="avgTime"
        xKey="name"
        title="Average Response Time by Day (ms)"
        color="#3B82F6"
        height={280}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MonitoringTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'usage', label: 'API Usage', content: <ApiUsageContent /> },
      { key: 'errors', label: 'Error Log', content: <ErrorLogContent /> },
      { key: 'performance', label: 'Performance', content: <PerformanceContent /> },
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
