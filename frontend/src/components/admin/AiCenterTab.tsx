import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ---------- Types ---------- */

interface LlmMapping {
  id: number;
  transaction_id: string | null;
  merchant_name: string;
  ticker: string | null;
  category: string | null;
  confidence: number | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_approved: boolean | null;
  ai_processed: boolean;
  company_name: string | null;
  user_id: string | null;
  created_at: string;
}

interface AiResponse {
  id: number;
  mapping_id: number | null;
  merchant_name: string | null;
  category: string | null;
  prompt: string | null;
  raw_response: string | null;
  parsed_response: string | null;
  processing_time_ms: number | null;
  model_version: string | null;
  is_error: boolean;
  admin_feedback: string | null;
  admin_correct_ticker: string | null;
  was_ai_correct: boolean | null;
  feedback_notes: string | null;
  feedback_date: string | null;
  created_at: string;
}

interface ModelCallPoint {
  [key: string]: unknown;
  name: string;
  calls: number;
}

interface ProcessingTrendPoint {
  [key: string]: unknown;
  name: string;
  avg_ms: number;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function dayLabel(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/* ---------- Sub-components ---------- */

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null || confidence === undefined) {
    return <Badge variant="default">N/A</Badge>;
  }
  const pct = `${(confidence * 100).toFixed(1)}%`;
  if (confidence > 0.8) return <Badge variant="success">{pct}</Badge>;
  if (confidence > 0.5) return <Badge variant="warning">{pct}</Badge>;
  return <Badge variant="error">{pct}</Badge>;
}

/* ---------- Pending Mappings Tab ---------- */

function PendingMappingsContent() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedToday, setApprovedToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
          supabase
            .from('llm_mappings')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),

          supabase
            .from('llm_mappings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'approved')
            .gte('created_at', todayISO),

          supabase
            .from('llm_mappings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'rejected')
            .gte('created_at', todayISO),
        ]);

        const pendingData = (pendingResult.data ?? []) as LlmMapping[];
        setMappings(pendingData);
        setPendingCount(pendingData.length);
        setApprovedToday(approvedResult.count ?? 0);
        setRejectedToday(rejectedResult.count ?? 0);
      } catch (err) {
        console.error('PendingMappingsContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const avgConfidence = useMemo(() => {
    const withConfidence = mappings.filter((m) => m.confidence !== null);
    if (withConfidence.length === 0) return 0;
    const sum = withConfidence.reduce((acc, m) => acc + (m.confidence ?? 0), 0);
    return sum / withConfidence.length;
  }, [mappings]);

  const columns: Column<LlmMapping>[] = useMemo(
    () => [
      { key: 'merchant_name', header: 'Merchant Name', sortable: true },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      { key: 'category', header: 'Category', sortable: true, width: '140px' },
      {
        key: 'confidence',
        header: 'Confidence',
        sortable: true,
        width: '120px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.confidence} />,
      },
      { key: 'company_name', header: 'Company Name', sortable: true },
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
        Loading pending mappings...
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
        <KpiCard label="Pending Count" value={formatNumber(pendingCount)} accent="pink" />
        <KpiCard label="Approved Today" value={formatNumber(approvedToday)} accent="teal" />
        <KpiCard label="Rejected Today" value={formatNumber(rejectedToday)} accent="purple" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="blue" />
      </div>

      <GlassCard accent="purple" padding="0">
        <Table<LlmMapping>
          columns={columns}
          data={mappings}
          loading={false}
          emptyMessage="No pending mappings"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ---------- All Mappings Tab ---------- */

function AllMappingsContent() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase
          .from('llm_mappings')
          .select('*')
          .order('created_at', { ascending: false });

        setMappings((result.data ?? []) as LlmMapping[]);
      } catch (err) {
        console.error('AllMappingsContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredMappings = useMemo(() => {
    if (statusFilter === 'all') return mappings;
    return mappings.filter((m) => m.status === statusFilter);
  }, [mappings, statusFilter]);

  const statusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: Column<LlmMapping>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px', align: 'right' },
      { key: 'merchant_name', header: 'Merchant', sortable: true },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      { key: 'category', header: 'Category', sortable: true, width: '130px' },
      {
        key: 'confidence',
        header: 'Confidence %',
        sortable: true,
        width: '120px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.confidence} />,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '120px',
        render: (row) => (
          <Badge variant={statusBadgeVariant(row.status)}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        ),
      },
      {
        key: 'ai_processed',
        header: 'AI Processed',
        width: '120px',
        render: (row) => (
          <Badge variant={row.ai_processed ? 'info' : 'default'}>
            {row.ai_processed ? 'Yes' : 'No'}
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

  const filterPills: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading all mappings...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {filterPills.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setStatusFilter(pill.value)}
            style={{
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor:
                statusFilter === pill.value
                  ? 'rgba(124,58,237,0.6)'
                  : 'rgba(255,255,255,0.08)',
              background:
                statusFilter === pill.value
                  ? 'rgba(124,58,237,0.2)'
                  : 'rgba(255,255,255,0.04)',
              color:
                statusFilter === pill.value ? '#C4B5FD' : 'rgba(248,250,252,0.5)',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <GlassCard accent="blue" padding="0">
        <Table<LlmMapping>
          columns={columns}
          data={filteredMappings}
          loading={false}
          emptyMessage="No mappings found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ---------- AI Analytics Tab ---------- */

function AiAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<AiResponse[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase
          .from('ai_responses')
          .select('*')
          .order('created_at', { ascending: false });

        setResponses((result.data ?? []) as AiResponse[]);
      } catch (err) {
        console.error('AiAnalyticsContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalCalls = useMemo(() => responses.length, [responses]);

  const avgProcessingTime = useMemo(() => {
    const withTime = responses.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    const sum = withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0);
    return Math.round(sum / withTime.length);
  }, [responses]);

  const errorRate = useMemo(() => {
    if (responses.length === 0) return 0;
    const errors = responses.filter((r) => r.is_error).length;
    return errors / responses.length;
  }, [responses]);

  const accuracy = useMemo(() => {
    const evaluated = responses.filter((r) => r.was_ai_correct !== null);
    if (evaluated.length === 0) return 0;
    const correct = evaluated.filter((r) => r.was_ai_correct === true).length;
    return correct / evaluated.length;
  }, [responses]);

  const callsByModel = useMemo<ModelCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const r of responses) {
      const model = r.model_version ?? 'Unknown';
      map.set(model, (map.get(model) ?? 0) + 1);
    }
    const result: ModelCallPoint[] = [];
    for (const [name, calls] of map) {
      result.push({ name, calls });
    }
    return result.sort((a, b) => b.calls - a.calls);
  }, [responses]);

  const processingTrend = useMemo<ProcessingTrendPoint[]>(() => {
    const dayMap = new Map<string, { sum: number; count: number }>();
    for (const r of responses) {
      if (r.processing_time_ms === null) continue;
      const key = dayLabel(r.created_at);
      const existing = dayMap.get(key) ?? { sum: 0, count: 0 };
      existing.sum += r.processing_time_ms;
      existing.count += 1;
      dayMap.set(key, existing);
    }
    const result: ProcessingTrendPoint[] = [];
    for (const [name, data] of dayMap) {
      result.push({ name, avg_ms: Math.round(data.sum / data.count) });
    }
    return result;
  }, [responses]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading AI analytics...
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
        <KpiCard label="Total API Calls" value={formatNumber(totalCalls)} accent="purple" />
        <KpiCard label="Avg Processing Time" value={`${formatNumber(avgProcessingTime)}ms`} accent="blue" />
        <KpiCard label="Error Rate" value={formatPercent(errorRate)} accent="pink" />
        <KpiCard label="Accuracy" value={formatPercent(accuracy)} accent="teal" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
        }}
      >
        <BarChart<ModelCallPoint>
          data={callsByModel}
          dataKey="calls"
          xKey="name"
          title="API Calls by Model"
          color="#7C3AED"
          height={260}
        />
        <LineChart<ProcessingTrendPoint>
          data={processingTrend}
          dataKey="avg_ms"
          xKey="name"
          title="Processing Time Trend (ms)"
          color="#06B6D4"
          height={260}
        />
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function AiCenterTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      {
        key: 'pending',
        label: 'Pending Mappings',
        content: <PendingMappingsContent />,
      },
      {
        key: 'all',
        label: 'All Mappings',
        content: <AllMappingsContent />,
      },
      {
        key: 'analytics',
        label: 'AI Analytics',
        content: <AiAnalyticsContent />,
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
        AI / LLM Management Center
      </p>
      <Tabs tabs={tabs} defaultTab="pending" />
    </div>
  );
}
