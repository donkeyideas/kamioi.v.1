import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Select, Modal } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

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
  updated_at: string | null;
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

interface DailyVolumePoint {
  [key: string]: unknown;
  name: string;
  count: number;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface ManualLearningForm {
  merchant_name: string;
  ticker: string;
  category: string;
  confidence: string;
}

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function dayKey(dateString: string): string {
  return new Date(dateString).toISOString().slice(0, 10);
}

function dayLabel(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Food', label: 'Food' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Bills', label: 'Bills' },
  { value: 'Health', label: 'Health' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Other', label: 'Other' },
];

/* ========================================================================== */
/*  Shared sub-components                                                     */
/* ========================================================================== */

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(124,58,237,0.2)',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'ai-center-spin 700ms linear infinite',
        }}
      />
      <span style={{ color: 'rgba(248,250,252,0.4)', fontSize: '14px' }}>
        {message}
      </span>
      <style>{`
        @keyframes ai-center-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null || confidence === undefined) {
    return <Badge variant="default">N/A</Badge>;
  }
  const pct = `${(confidence * 100).toFixed(1)}%`;
  if (confidence > 0.8) return <Badge variant="success">{pct}</Badge>;
  if (confidence >= 0.5) return <Badge variant="warning">{pct}</Badge>;
  return <Badge variant="error">{pct}</Badge>;
}

function BooleanBadge({ value, trueLabel, falseLabel, nullLabel }: {
  value: boolean | null;
  trueLabel: string;
  falseLabel: string;
  nullLabel: string;
}) {
  if (value === null || value === undefined) {
    return <Badge variant="default">{nullLabel}</Badge>;
  }
  return value
    ? <Badge variant="success">{trueLabel}</Badge>
    : <Badge variant="error">{falseLabel}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'approved'
    ? 'success'
    : status === 'rejected'
      ? 'error'
      : status === 'pending'
        ? 'warning'
        : 'default';
  return (
    <Badge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#F8FAFC',
        marginBottom: '4px',
      }}
    >
      {children}
    </p>
  );
}

function ToastMessage({ message, variant }: { message: string; variant: 'success' | 'error' }) {
  const bg = variant === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)';
  const borderColor = variant === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)';
  const color = variant === 'success' ? '#34D399' : '#EF4444';
  return (
    <div
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        background: bg,
        border: `1px solid ${borderColor}`,
        color,
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      {message}
    </div>
  );
}

/* ========================================================================== */
/*  Tab 1: LLM Center                                                        */
/* ========================================================================== */

function LlmCenterContent() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [responses, setResponses] = useState<AiResponse[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mappingsResult, responsesResult] = await Promise.all([
        supabase.from('llm_mappings').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_responses').select('*').order('created_at', { ascending: false }),
      ]);
      setMappings((mappingsResult.data ?? []) as LlmMapping[]);
      setResponses((responsesResult.data ?? []) as AiResponse[]);
    } catch (err) {
      console.error('LlmCenterContent fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* KPI computations */
  const totalMappings = mappings.length;
  const approvedCount = useMemo(() => mappings.filter((m) => m.status === 'approved').length, [mappings]);
  const rejectedCount = useMemo(() => mappings.filter((m) => m.status === 'rejected').length, [mappings]);
  const avgConfidence = useMemo(() => {
    const withConf = mappings.filter((m) => m.confidence !== null);
    if (withConf.length === 0) return 0;
    return withConf.reduce((acc, m) => acc + (m.confidence ?? 0), 0) / withConf.length;
  }, [mappings]);

  /* Model performance stats */
  const totalCalls = responses.length;
  const errorRate = useMemo(() => {
    if (responses.length === 0) return 0;
    return responses.filter((r) => r.is_error).length / responses.length;
  }, [responses]);
  const avgProcessingTime = useMemo(() => {
    const withTime = responses.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    return Math.round(withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0) / withTime.length);
  }, [responses]);
  const accuracy = useMemo(() => {
    const evaluated = responses.filter((r) => r.was_ai_correct !== null);
    if (evaluated.length === 0) return 0;
    return evaluated.filter((r) => r.was_ai_correct === true).length / evaluated.length;
  }, [responses]);

  /* Model version counts */
  const modelVersionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of responses) {
      const model = r.model_version ?? 'Unknown';
      map.set(model, (map.get(model) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count);
  }, [responses]);

  /* Recent 20 AI responses */
  const recentResponses = useMemo(() => responses.slice(0, 20), [responses]);

  const responseColumns: Column<AiResponse>[] = useMemo(
    () => [
      { key: 'merchant_name', header: 'Merchant', sortable: true },
      { key: 'category', header: 'Category', sortable: true, width: '120px' },
      { key: 'model_version', header: 'Model Version', sortable: true, width: '140px' },
      {
        key: 'processing_time_ms',
        header: 'Time (ms)',
        sortable: true,
        width: '100px',
        align: 'right',
        render: (row) => (
          <span>{row.processing_time_ms !== null ? formatNumber(row.processing_time_ms) : '--'}</span>
        ),
      },
      {
        key: 'is_error',
        header: 'Error',
        width: '90px',
        render: (row) => (
          <Badge variant={row.is_error ? 'error' : 'success'}>
            {row.is_error ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'was_ai_correct',
        header: 'Correct',
        width: '100px',
        render: (row) => (
          <BooleanBadge value={row.was_ai_correct} trueLabel="Yes" falseLabel="No" nullLabel="N/A" />
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '160px',
        render: (row) => formatDateTime(row.created_at),
      },
    ],
    [],
  );

  if (loading) {
    return <LoadingSpinner message="Loading LLM Center..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard label="Total Mappings" value={formatNumber(totalMappings)} accent="purple" />
        <KpiCard label="Approved" value={formatNumber(approvedCount)} accent="teal" />
        <KpiCard label="Rejected" value={formatNumber(rejectedCount)} accent="pink" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="blue" />
      </KpiGrid>

      {/* Model Performance */}
      <GlassCard accent="purple">
        <SectionTitle>Model Performance</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
              {formatNumber(totalCalls)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Total API Calls
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: errorRate > 0.1 ? '#EF4444' : '#34D399' }}>
              {formatPercent(errorRate)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Error Rate
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
              {formatNumber(avgProcessingTime)}ms
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Avg Processing Time
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: accuracy > 0.8 ? '#34D399' : '#FBBF24' }}>
              {formatPercent(accuracy)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Accuracy
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Prompt Template / Model Versions */}
      <GlassCard accent="blue">
        <SectionTitle>Model Versions in Use</SectionTitle>
        {modelVersionCounts.length === 0 ? (
          <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '14px', marginTop: '12px' }}>
            No AI responses recorded yet.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            {modelVersionCounts.map((mv) => (
              <div
                key={mv.version}
                style={{
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
                  {mv.version}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
                  {formatNumber(mv.count)} call{mv.count !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Recent AI Responses Table */}
      <GlassCard accent="teal" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <SectionTitle>Recent AI Responses</SectionTitle>
        </div>
        <Table<AiResponse>
          columns={responseColumns}
          data={recentResponses}
          loading={false}
          emptyMessage="No AI responses recorded yet"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ========================================================================== */
/*  Tab 2: Pending Mappings                                                   */
/* ========================================================================== */

function PendingMappingsContent() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabase
        .from('llm_mappings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setMappings((result.data ?? []) as LlmMapping[]);
    } catch (err) {
      console.error('PendingMappingsContent fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = useCallback(async (id: number) => {
    setActionLoading(id);
    try {
      await supabase
        .from('llm_mappings')
        .update({ status: 'approved', admin_approved: true })
        .eq('id', id);
      await fetchPending();
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchPending]);

  const handleReject = useCallback(async (id: number) => {
    setActionLoading(id);
    try {
      await supabase
        .from('llm_mappings')
        .update({ status: 'rejected', admin_approved: false })
        .eq('id', id);
      await fetchPending();
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchPending]);

  /* KPI computations */
  const pendingCount = mappings.length;
  const highConfidence = useMemo(
    () => mappings.filter((m) => m.confidence !== null && m.confidence > 0.8).length,
    [mappings],
  );
  const lowConfidence = useMemo(
    () => mappings.filter((m) => m.confidence !== null && m.confidence < 0.5).length,
    [mappings],
  );
  const avgConfidence = useMemo(() => {
    const withConf = mappings.filter((m) => m.confidence !== null);
    if (withConf.length === 0) return 0;
    return withConf.reduce((acc, m) => acc + (m.confidence ?? 0), 0) / withConf.length;
  }, [mappings]);

  const columns: Column<LlmMapping>[] = useMemo(
    () => [
      { key: 'merchant_name', header: 'Merchant Name', sortable: true },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      { key: 'category', header: 'Category', sortable: true, width: '130px' },
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
      {
        key: 'actions',
        header: 'Actions',
        width: '200px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading === row.id}
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(row.id);
              }}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading === row.id}
              onClick={(e) => {
                e.stopPropagation();
                handleReject(row.id);
              }}
            >
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [actionLoading, handleApprove, handleReject],
  );

  if (loading) {
    return <LoadingSpinner message="Loading pending mappings..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <KpiGrid>
        <KpiCard label="Pending Count" value={formatNumber(pendingCount)} accent="pink" />
        <KpiCard label="High Confidence (>0.8)" value={formatNumber(highConfidence)} accent="teal" />
        <KpiCard label="Low Confidence (<0.5)" value={formatNumber(lowConfidence)} accent="purple" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="blue" />
      </KpiGrid>

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

/* ========================================================================== */
/*  Tab 3: All Mappings                                                       */
/* ========================================================================== */

function AllMappingsContent() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    let result = mappings;
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((m) => m.merchant_name.toLowerCase().includes(term));
    }
    return result;
  }, [mappings, statusFilter, searchTerm]);

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
        render: (row) => <StatusBadge status={row.status} />,
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

  const filterPills: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading all mappings..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filter pills + search */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
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
        <div style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <Input
            placeholder="Search merchant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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

/* ========================================================================== */
/*  Tab 4: ML Dashboard                                                       */
/* ========================================================================== */

function MlDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<AiResponse[]>([]);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);

  /* Test Merchant Mapping state */
  const [testMerchant, setTestMerchant] = useState('');
  const [testResults, setTestResults] = useState<LlmMapping[] | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  /* Manual Learning state */
  const [manualForm, setManualForm] = useState<ManualLearningForm>({
    merchant_name: '',
    ticker: '',
    category: '',
    confidence: '0.9',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualToast, setManualToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [respResult, mapResult] = await Promise.all([
        supabase.from('ai_responses').select('*').order('created_at', { ascending: false }),
        supabase.from('llm_mappings').select('*').order('created_at', { ascending: false }),
      ]);
      setResponses((respResult.data ?? []) as AiResponse[]);
      setMappings((mapResult.data ?? []) as LlmMapping[]);
    } catch (err) {
      console.error('MlDashboardContent fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* KPI computations */
  const totalCalls = responses.length;
  const successRate = useMemo(() => {
    if (responses.length === 0) return 0;
    return responses.filter((r) => !r.is_error).length / responses.length;
  }, [responses]);
  const learningProgress = useMemo(() => {
    if (mappings.length === 0) return 0;
    return mappings.filter((m) => m.status === 'approved').length / mappings.length;
  }, [mappings]);
  const avgResponseTime = useMemo(() => {
    const withTime = responses.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    return Math.round(withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0) / withTime.length);
  }, [responses]);

  /* Bar chart data: calls by model */
  const callsByModel = useMemo<ModelCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const r of responses) {
      const model = r.model_version ?? 'Unknown';
      map.set(model, (map.get(model) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, calls]) => ({ name, calls }))
      .sort((a, b) => b.calls - a.calls);
  }, [responses]);

  /* Test merchant handler */
  const handleTestMerchant = useCallback(async () => {
    if (!testMerchant.trim()) return;
    setTestLoading(true);
    setTestResults(null);
    try {
      const result = await supabase
        .from('llm_mappings')
        .select('*')
        .eq('merchant_name', testMerchant.trim())
        .limit(5);
      setTestResults((result.data ?? []) as LlmMapping[]);
    } catch (err) {
      console.error('Test merchant error:', err);
      setTestResults([]);
    } finally {
      setTestLoading(false);
    }
  }, [testMerchant]);

  /* Manual learning handler */
  const handleManualSubmit = useCallback(async () => {
    if (!manualForm.merchant_name.trim() || !manualForm.ticker.trim() || !manualForm.category) {
      setManualToast({ message: 'Please fill in merchant name, ticker, and category.', variant: 'error' });
      setTimeout(() => setManualToast(null), 4000);
      return;
    }
    const confidenceNum = parseFloat(manualForm.confidence);
    if (isNaN(confidenceNum) || confidenceNum < 0 || confidenceNum > 1) {
      setManualToast({ message: 'Confidence must be a number between 0 and 1.', variant: 'error' });
      setTimeout(() => setManualToast(null), 4000);
      return;
    }
    setManualSubmitting(true);
    try {
      const { error } = await supabase.from('llm_mappings').insert({
        merchant_name: manualForm.merchant_name.trim(),
        ticker: manualForm.ticker.trim(),
        category: manualForm.category,
        confidence: confidenceNum,
        status: 'approved',
        admin_approved: true,
        ai_processed: false,
      });
      if (error) {
        setManualToast({ message: `Insert failed: ${error.message}`, variant: 'error' });
      } else {
        setManualToast({ message: 'Mapping inserted successfully.', variant: 'success' });
        setManualForm({ merchant_name: '', ticker: '', category: '', confidence: '0.9' });
        fetchData();
      }
    } catch (err) {
      setManualToast({ message: 'Unexpected error inserting mapping.', variant: 'error' });
      console.error('Manual learning insert error:', err);
    } finally {
      setManualSubmitting(false);
      setTimeout(() => setManualToast(null), 4000);
    }
  }, [manualForm, fetchData]);

  /* Test results mini-table columns */
  const testColumns: Column<LlmMapping>[] = useMemo(
    () => [
      { key: 'merchant_name', header: 'Merchant', sortable: false },
      { key: 'ticker', header: 'Ticker', width: '90px' },
      { key: 'category', header: 'Category', width: '120px' },
      {
        key: 'confidence',
        header: 'Confidence',
        width: '110px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.confidence} />,
      },
      {
        key: 'status',
        header: 'Status',
        width: '110px',
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  if (loading) {
    return <LoadingSpinner message="Loading ML Dashboard..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard label="Total AI Calls" value={formatNumber(totalCalls)} accent="purple" />
        <KpiCard label="Success Rate" value={formatPercent(successRate)} accent="teal" />
        <KpiCard label="Learning Progress" value={formatPercent(learningProgress)} accent="blue" />
        <KpiCard label="Avg Response Time" value={`${formatNumber(avgResponseTime)}ms`} accent="pink" />
      </KpiGrid>

      {/* Test Merchant Mapping */}
      <GlassCard accent="purple">
        <SectionTitle>Test Merchant Mapping</SectionTitle>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Merchant Name"
              placeholder="Enter merchant name to test..."
              value={testMerchant}
              onChange={(e) => setTestMerchant(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTestMerchant();
              }}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            loading={testLoading}
            onClick={handleTestMerchant}
            disabled={!testMerchant.trim()}
          >
            Test Mapping
          </Button>
        </div>
        {testResults !== null && (
          <div style={{ marginTop: '16px' }}>
            {testResults.length === 0 ? (
              <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '14px' }}>
                No existing mappings found for this merchant.
              </p>
            ) : (
              <Table<LlmMapping>
                columns={testColumns}
                data={testResults}
                loading={false}
                emptyMessage="No results"
                pageSize={5}
                rowKey={(row) => row.id}
              />
            )}
          </div>
        )}
      </GlassCard>

      {/* Manual Learning */}
      <GlassCard accent="teal">
        <SectionTitle>Manual Learning</SectionTitle>
        <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginTop: '4px', marginBottom: '16px' }}>
          Manually add a merchant-to-ticker mapping to train the system.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <Input
            label="Merchant Name"
            placeholder="e.g. Starbucks"
            value={manualForm.merchant_name}
            onChange={(e) => setManualForm((prev) => ({ ...prev, merchant_name: e.target.value }))}
          />
          <Input
            label="Ticker"
            placeholder="e.g. SBUX"
            value={manualForm.ticker}
            onChange={(e) => setManualForm((prev) => ({ ...prev, ticker: e.target.value }))}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            placeholder="Select category"
            value={manualForm.category}
            onChange={(e) => setManualForm((prev) => ({ ...prev, category: e.target.value }))}
          />
          <Input
            label="Confidence (0-1)"
            placeholder="0.9"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={manualForm.confidence}
            onChange={(e) => setManualForm((prev) => ({ ...prev, confidence: e.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
          <Button
            variant="primary"
            size="md"
            loading={manualSubmitting}
            onClick={handleManualSubmit}
          >
            Submit Mapping
          </Button>
          {manualToast && <ToastMessage message={manualToast.message} variant={manualToast.variant} />}
        </div>
      </GlassCard>

      {/* Bar Chart: Calls by model */}
      <BarChart<ModelCallPoint>
        data={callsByModel}
        dataKey="calls"
        xKey="name"
        title="AI Calls by Model Version"
        color="#7C3AED"
        height={260}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Tab 5: Data Management                                                    */
/* ========================================================================== */

function DataManagementContent() {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<AiResponse[]>([]);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [respResult, mapResult] = await Promise.all([
        supabase.from('ai_responses').select('*').order('created_at', { ascending: false }),
        supabase.from('llm_mappings').select('*').order('created_at', { ascending: false }),
      ]);
      setResponses((respResult.data ?? []) as AiResponse[]);
      setMappings((mapResult.data ?? []) as LlmMapping[]);
    } catch (err) {
      console.error('DataManagementContent fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  /* KPI computations */
  const totalResponses = responses.length;
  const totalMappings = mappings.length;
  const errorResponses = useMemo(() => responses.filter((r) => r.is_error).length, [responses]);
  const feedbackGiven = useMemo(() => responses.filter((r) => r.admin_feedback !== null).length, [responses]);

  /* Data quality stats */
  const noTickerCount = useMemo(() => mappings.filter((m) => !m.ticker).length, [mappings]);
  const lowConfCount = useMemo(() => mappings.filter((m) => m.confidence !== null && m.confidence < 0.3).length, [mappings]);

  /* Processing time trend (line chart) */
  const processingTrend = useMemo<ProcessingTrendPoint[]>(() => {
    const dayMap = new Map<string, { sum: number; count: number; sortKey: string }>();
    for (const r of responses) {
      if (r.processing_time_ms === null) continue;
      const dk = dayKey(r.created_at);
      const dl = dayLabel(r.created_at);
      const existing = dayMap.get(dk) ?? { sum: 0, count: 0, sortKey: dk };
      existing.sum += r.processing_time_ms;
      existing.count += 1;
      dayMap.set(dk, existing);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dk, data]) => ({
        name: dayLabel(dk + 'T00:00:00Z'),
        avg_ms: Math.round(data.sum / data.count),
      }));
  }, [responses]);

  /* AI Response History columns */
  const responseColumns: Column<AiResponse>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px', align: 'right' },
      { key: 'merchant_name', header: 'Merchant', sortable: true },
      { key: 'category', header: 'Category', sortable: true, width: '120px' },
      { key: 'model_version', header: 'Model', sortable: true, width: '130px' },
      {
        key: 'processing_time_ms',
        header: 'Time (ms)',
        sortable: true,
        width: '100px',
        align: 'right',
        render: (row) => (
          <span>{row.processing_time_ms !== null ? formatNumber(row.processing_time_ms) : '--'}</span>
        ),
      },
      {
        key: 'is_error',
        header: 'Error',
        width: '80px',
        render: (row) => (
          <Badge variant={row.is_error ? 'error' : 'success'}>
            {row.is_error ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'was_ai_correct',
        header: 'Correct',
        width: '90px',
        render: (row) => (
          <BooleanBadge value={row.was_ai_correct} trueLabel="Yes" falseLabel="No" nullLabel="N/A" />
        ),
      },
      {
        key: 'admin_feedback',
        header: 'Feedback',
        width: '120px',
        render: (row) => (
          <span style={{ color: row.admin_feedback ? '#F8FAFC' : 'rgba(248,250,252,0.3)', fontSize: '13px' }}>
            {row.admin_feedback ?? '--'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '160px',
        render: (row) => formatDateTime(row.created_at),
      },
    ],
    [],
  );

  if (loading) {
    return <LoadingSpinner message="Loading data management..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard label="Total AI Responses" value={formatNumber(totalResponses)} accent="purple" />
        <KpiCard label="Total Mappings" value={formatNumber(totalMappings)} accent="blue" />
        <KpiCard label="Error Responses" value={formatNumber(errorResponses)} accent="pink" />
        <KpiCard label="Feedback Given" value={formatNumber(feedbackGiven)} accent="teal" />
      </KpiGrid>

      {/* AI Response History */}
      <GlassCard accent="purple" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <SectionTitle>AI Response History</SectionTitle>
        </div>
        <Table<AiResponse>
          columns={responseColumns}
          data={responses}
          loading={false}
          emptyMessage="No AI responses recorded yet"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Data Quality */}
      <GlassCard accent="teal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Data Quality</SectionTitle>
          <Button variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh}>
            Refresh Stats
          </Button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          <div
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: noTickerCount > 0 ? '#FBBF24' : '#34D399' }}>
              {formatNumber(noTickerCount)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Mappings with no ticker
            </p>
          </div>
          <div
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: lowConfCount > 0 ? '#EF4444' : '#34D399' }}>
              {formatNumber(lowConfCount)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Confidence below 0.3
            </p>
          </div>
          <div
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: errorResponses > 0 ? '#EF4444' : '#34D399' }}>
              {formatNumber(errorResponses)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', marginTop: '4px' }}>
              Error responses
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Processing time trend */}
      <LineChart<ProcessingTrendPoint>
        data={processingTrend}
        dataKey="avg_ms"
        xKey="name"
        title="Avg Processing Time Trend (ms)"
        color="#06B6D4"
        height={260}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Tab 6: AI Analytics                                                       */
/* ========================================================================== */

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

  /* KPI computations */
  const accuracyRate = useMemo(() => {
    const evaluated = responses.filter((r) => r.was_ai_correct !== null);
    if (evaluated.length === 0) return 0;
    return evaluated.filter((r) => r.was_ai_correct === true).length / evaluated.length;
  }, [responses]);

  const errorRate = useMemo(() => {
    if (responses.length === 0) return 0;
    return responses.filter((r) => r.is_error).length / responses.length;
  }, [responses]);

  const avgProcessingTime = useMemo(() => {
    const withTime = responses.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return 0;
    return Math.round(withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0) / withTime.length);
  }, [responses]);

  /* Bar chart: calls by model */
  const callsByModel = useMemo<ModelCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const r of responses) {
      const model = r.model_version ?? 'Unknown';
      map.set(model, (map.get(model) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, calls]) => ({ name, calls }))
      .sort((a, b) => b.calls - a.calls);
  }, [responses]);

  /* Line chart: daily call volume */
  const dailyVolume = useMemo<DailyVolumePoint[]>(() => {
    const dayMap = new Map<string, number>();
    for (const r of responses) {
      const dk = dayKey(r.created_at);
      dayMap.set(dk, (dayMap.get(dk) ?? 0) + 1);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dk, count]) => ({
        name: dayLabel(dk + 'T00:00:00Z'),
        count,
      }));
  }, [responses]);

  /* Feedback summary */
  const feedbackSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of responses) {
      if (r.admin_feedback !== null && r.admin_feedback !== '') {
        const fb = r.admin_feedback.toLowerCase();
        map.set(fb, (map.get(fb) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [responses]);

  const totalFeedback = useMemo(
    () => feedbackSummary.reduce((acc, fb) => acc + fb.count, 0),
    [feedbackSummary],
  );

  if (loading) {
    return <LoadingSpinner message="Loading AI analytics..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard label="Accuracy Rate" value={formatPercent(accuracyRate)} accent="teal" />
        <KpiCard label="Error Rate" value={formatPercent(errorRate)} accent="pink" />
        <KpiCard label="Avg Processing Time" value={`${formatNumber(avgProcessingTime)}ms`} accent="blue" />
        <KpiCard label="Total Cost" value="N/A -- Edge Function" accent="purple" />
      </KpiGrid>

      {/* Charts */}
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
          title="Calls by Model Version"
          color="#7C3AED"
          height={260}
        />
        <LineChart<DailyVolumePoint>
          data={dailyVolume}
          dataKey="count"
          xKey="name"
          title="Daily Call Volume"
          color="#3B82F6"
          height={260}
        />
      </div>

      {/* Feedback Summary */}
      <GlassCard accent="teal">
        <SectionTitle>Feedback Summary</SectionTitle>
        {feedbackSummary.length === 0 ? (
          <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '14px', marginTop: '12px' }}>
            No admin feedback recorded yet.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            {feedbackSummary.map((fb) => {
              const accentColor =
                fb.label === 'approve'
                  ? '#34D399'
                  : fb.label === 'reject'
                    ? '#EF4444'
                    : fb.label === 'correct'
                      ? '#3B82F6'
                      : '#FBBF24';
              return (
                <div
                  key={fb.label}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '28px', fontWeight: 700, color: accentColor }}>
                    {formatNumber(fb.count)}
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', marginTop: '4px', textTransform: 'capitalize' }}>
                    {fb.label}
                  </p>
                </div>
              );
            })}
            <div
              style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#F8FAFC' }}>
                {formatNumber(totalFeedback)}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', marginTop: '4px' }}>
                Total Feedback
              </p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ========================================================================== */
/*  Main Component                                                            */
/* ========================================================================== */

export function AiCenterTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      {
        key: 'llm-center',
        label: 'LLM Center',
        content: <LlmCenterContent />,
      },
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
        key: 'ml-dashboard',
        label: 'ML Dashboard',
        content: <MlDashboardContent />,
      },
      {
        key: 'data-management',
        label: 'Data Management',
        content: <DataManagementContent />,
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
      <Tabs tabs={tabs} defaultTab="llm-center" />
    </div>
  );
}
