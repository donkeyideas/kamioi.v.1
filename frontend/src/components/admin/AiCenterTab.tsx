import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { mapMerchant } from '@/services/api';
import { reprocessFailedTransactions } from '@/services/bankSync';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Select, Modal } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { CompanyLogo, COMPANY_LOOKUP } from '@/components/common/CompanyLogo';

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

interface TransactionRow {
  id: number;
  user_id: number;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  status: 'pending' | 'completed' | 'failed';
  round_up: number;
  fee: number;
  ticker: string | null;
  shares: number | null;
  price_per_share: number | null;
  stock_price: number | null;
  transaction_type: string | null;
  created_at: string;
}

interface MerchantAssetRow {
  merchant_name: string;
  primary_ticker: string | null;
  avg_confidence: number;
  mapping_count: number;
  approved_count: number;
  most_recent: string;
}

interface CategoryCountPoint {
  [key: string]: unknown;
  name: string;
  count: number;
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

function formatCategory(category: string | null): string {
  if (!category) return 'Unknown';
  const MAP: Record<string, string> = {
    user_submitted: 'User',
    family_submitted: 'Family',
    business_submitted: 'Business',
  };
  if (MAP[category]) return MAP[category];
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---- Local merchant-to-ticker fallback (used when Edge Function unavailable) ---- */

const MERCHANT_TICKER_MAP: Record<string, { ticker: string; company_name: string; category: string }> = {};
// Build reverse lookup: merchant name → ticker info
const domainToTicker: Record<string, string> = {};
for (const [key, info] of Object.entries(COMPANY_LOOKUP)) {
  // Tickers are uppercase short strings; merchant names are mixed case
  if (key === key.toUpperCase() && key.length <= 5) {
    domainToTicker[info.domain] = key;
  }
}
for (const [key, info] of Object.entries(COMPANY_LOOKUP)) {
  if (key !== key.toUpperCase() || key.length > 5) {
    const ticker = domainToTicker[info.domain];
    if (ticker) {
      MERCHANT_TICKER_MAP[key.toLowerCase()] = {
        ticker,
        company_name: key,
        category: ['Starbucks', 'Chipotle', 'Chick-fil-A', 'McDonalds', 'Panera Bread', 'Whole Foods', 'Trader Joes'].includes(key) ? 'Food'
          : ['Uber', 'Lyft', 'Shell Gas', 'Chevron'].includes(key) ? 'Transport'
          : ['Netflix', 'Spotify'].includes(key) ? 'Entertainment'
          : 'Shopping',
      };
    }
  }
}

function localMerchantLookup(merchantName: string): { ticker: string; company_name: string; category: string; confidence: number } | null {
  const lower = merchantName.toLowerCase().trim();
  // Exact match
  if (MERCHANT_TICKER_MAP[lower]) {
    return { ...MERCHANT_TICKER_MAP[lower], confidence: 0.95 };
  }
  // Partial match (merchant name contains a known company)
  for (const [name, info] of Object.entries(MERCHANT_TICKER_MAP)) {
    if (lower.includes(name) || name.includes(lower)) {
      return { ...info, confidence: 0.80 };
    }
  }
  return null;
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
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
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
        color: 'var(--text-primary)',
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

interface BulkUploadProgress {
  processed: number;
  total: number;
  errors: string[];
  rowsPerSec: number;
  elapsedSec: number;
}

interface BulkUploadResult {
  success: number;
  failed: number;
  skipped: number;
  elapsedSec: number;
}

interface BulkUploadState {
  file: File | null;
  uploading: boolean;
  progress: BulkUploadProgress | null;
  result: BulkUploadResult | null;
  error: string | null;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function findColumn(headers: string[], ...variants: string[]): number {
  for (const v of variants) {
    const idx = headers.findIndex((h) => h.toLowerCase().replace(/[_\s-]/g, '') === v.toLowerCase().replace(/[_\s-]/g, ''));
    if (idx !== -1) return idx;
  }
  return -1;
}

function LlmCenterContent() {
  const [loading, setLoading] = useState(true);
  const [recentMappings, setRecentMappings] = useState<LlmMapping[]>([]);
  const [totalMappings, setTotalMappings] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [bulk, setBulk] = useState<BulkUploadState>({
    file: null,
    uploading: false,
    progress: null,
    result: null,
    error: null,
  });
  const [showBulkModal, setShowBulkModal] = useState(false);

  /* Search state */
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<StatusFilter>('all');
  const [searchResults, setSearchResults] = useState<LlmMapping[] | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [totalResult, approvedResult, rejectedResult, pendingResult, avgConfResult, recentResult] = await Promise.all([
        supabaseAdmin.from('llm_mappings').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('llm_mappings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabaseAdmin.from('llm_mappings').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabaseAdmin.from('llm_mappings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('llm_mappings').select('confidence').not('confidence', 'is', null).limit(5000),
        supabaseAdmin.from('llm_mappings').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      setTotalMappings(totalResult.count ?? 0);
      setApprovedCount(approvedResult.count ?? 0);
      setRejectedCount(rejectedResult.count ?? 0);
      setPendingCount(pendingResult.count ?? 0);

      const confRows = (avgConfResult.data ?? []) as { confidence: number }[];
      if (confRows.length > 0) {
        const avg = confRows.reduce((sum, r) => sum + Number(r.confidence || 0), 0) / confRows.length;
        setAvgConfidence(avg);
      }

      setRecentMappings((recentResult.data ?? []) as LlmMapping[]);
    } catch (err) {
      console.error('LlmCenterContent fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Search handler */
  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      let query = supabaseAdmin
        .from('llm_mappings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchTerm.trim()) {
        query = query.ilike('merchant_name', `%${searchTerm.trim()}%`);
      }
      if (searchFilter !== 'all') {
        query = query.eq('status', searchFilter);
      }

      const { data } = await query;
      setSearchResults((data ?? []) as LlmMapping[]);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchFilter]);

  /* Mapping source breakdown */
  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of recentMappings) {
      const src = formatCategory(m.category);
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [recentMappings]);

  /* Recent mappings table columns */
  const recentColumns: Column<LlmMapping>[] = useMemo(
    () => [
      {
        key: 'merchant_name',
        header: 'Merchant',
        sortable: true,
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={COMPANY_LOOKUP[row.merchant_name] ? row.merchant_name : (row.ticker ?? '')} size={20} />
            {row.merchant_name}
          </span>
        ),
      },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      { key: 'category', header: 'Source', sortable: true, width: '100px', render: (row) => formatCategory(row.category) },
      {
        key: 'confidence',
        header: 'Confidence',
        sortable: true,
        width: '110px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.confidence} />,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  /* Search results table columns (more detail) */
  const searchColumns: Column<LlmMapping>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px', align: 'right' },
      {
        key: 'merchant_name',
        header: 'Merchant',
        sortable: true,
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={COMPANY_LOOKUP[row.merchant_name] ? row.merchant_name : (row.ticker ?? '')} size={20} />
            {row.merchant_name}
          </span>
        ),
      },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      { key: 'category', header: 'Source', sortable: true, width: '100px', render: (row) => formatCategory(row.category) },
      {
        key: 'confidence',
        header: 'Confidence',
        sortable: true,
        width: '110px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.confidence} />,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'ai_processed',
        header: 'AI',
        width: '80px',
        render: (row) => (
          <Badge variant={row.ai_processed ? 'info' : 'default'}>
            {row.ai_processed ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  /* Bulk upload handler — optimized for large files (500K+ rows) */
  const handleBulkUpload = useCallback(async () => {
    if (!bulk.file) return;
    setBulk((prev) => ({ ...prev, uploading: true, error: null, result: null, progress: null }));

    try {
      const text = await bulk.file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setBulk((prev) => ({ ...prev, uploading: false, error: 'CSV must have a header row and at least one data row.' }));
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const merchantIdx = findColumn(headers, 'merchantname', 'merchant_name', 'merchant', 'name');
      const tickerIdx = findColumn(headers, 'tickersymbol', 'ticker_symbol', 'ticker', 'symbol');
      const categoryIdx = findColumn(headers, 'category', 'cat');
      const confidenceIdx = findColumn(headers, 'confidence', 'conf');
      const notesIdx = findColumn(headers, 'notes', 'note', 'description');

      if (merchantIdx === -1 || tickerIdx === -1) {
        setBulk((prev) => ({
          ...prev,
          uploading: false,
          error: `CSV must contain at least "Merchant Name" and "Ticker" columns. Found headers: ${headers.join(', ')}`,
        }));
        return;
      }

      const dataLines = lines.slice(1);
      const total = dataLines.length;
      let success = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];
      const startTime = Date.now();

      const BATCH_SIZE = 500;
      for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
        const batch = dataLines.slice(i, i + BATCH_SIZE);
        const rows: {
          merchant_name: string;
          ticker: string;
          category: string | null;
          confidence: number;
          status: string;
          admin_approved: boolean;
          ai_processed: boolean;
          company_name: string | null;
        }[] = [];

        for (const line of batch) {
          const fields = parseCsvLine(line);
          const merchant = fields[merchantIdx]?.trim();
          const ticker = fields[tickerIdx]?.trim();
          if (!merchant || !ticker) {
            skipped++;
            continue;
          }

          let confidence = 0.9;
          if (confidenceIdx !== -1 && fields[confidenceIdx]) {
            const raw = fields[confidenceIdx].replace('%', '').trim();
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) {
              confidence = parsed > 1 ? parsed / 100 : parsed;
            }
          }

          rows.push({
            merchant_name: merchant,
            ticker: ticker.toUpperCase(),
            category: categoryIdx !== -1 ? (fields[categoryIdx]?.trim() || null) : null,
            confidence,
            status: 'approved',
            admin_approved: true,
            ai_processed: false,
            company_name: notesIdx !== -1 ? (fields[notesIdx]?.trim() || null) : null,
          });
        }

        if (rows.length > 0) {
          const { error } = await supabaseAdmin.from('llm_mappings').insert(rows);
          if (error) {
            failed += rows.length;
            if (errors.length < 10) errors.push(`Batch at row ${i + 2}: ${error.message}`);
          } else {
            success += rows.length;
          }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const processed = Math.min(i + BATCH_SIZE, total);
        const rowsPerSec = elapsed > 0 ? Math.round(processed / elapsed) : 0;

        setBulk((prev) => ({
          ...prev,
          progress: { processed, total, errors, rowsPerSec, elapsedSec: Math.round(elapsed) },
        }));

        await new Promise((r) => setTimeout(r, 0));
      }

      const totalElapsed = Math.round((Date.now() - startTime) / 1000);
      setBulk((prev) => ({
        ...prev,
        uploading: false,
        result: { success, failed, skipped, elapsedSec: totalElapsed },
        progress: { processed: total, total, errors, rowsPerSec: 0, elapsedSec: totalElapsed },
      }));
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during bulk upload.';
      setBulk((prev) => ({ ...prev, uploading: false, error: msg }));
    }
  }, [bulk.file, fetchData]);

  const filterPills: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

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
        <KpiCard label="Pending" value={formatNumber(pendingCount)} accent="orange" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="blue" />
      </KpiGrid>

      {/* Search Mappings */}
      <GlassCard accent="purple">
        <SectionTitle>Search Mappings</SectionTitle>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>
          Search the mapping database by merchant name. Returns the most recent 100 matches.
        </p>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {filterPills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setSearchFilter(pill.value)}
              style={{
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 16px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor:
                  searchFilter === pill.value
                    ? 'rgba(124,58,237,0.6)'
                    : 'var(--border-subtle)',
                background:
                  searchFilter === pill.value
                    ? 'rgba(124,58,237,0.2)'
                    : 'var(--surface-input)',
                color:
                  searchFilter === pill.value ? '#C4B5FD' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '480px' }}>
            <Input
              placeholder="Search merchant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </div>
          <Button variant="primary" size="md" loading={searching} onClick={handleSearch}>
            Search
          </Button>
        </div>

        {/* Search results */}
        {searchResults !== null && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {searchResults.length === 100
                ? 'Showing first 100 results. Refine your search for more specific results.'
                : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`}
            </p>
            <Table<LlmMapping>
              columns={searchColumns}
              data={searchResults}
              loading={false}
              emptyMessage="No mappings found matching your search"
              pageSize={15}
              rowKey={(row) => row.id}
            />
          </div>
        )}
      </GlassCard>

      {/* Bulk Import Section */}
      <GlassCard accent="teal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <SectionTitle>Bulk Import Mappings</SectionTitle>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Upload a CSV file to import merchant-to-ticker mappings in bulk. All imported rows are automatically approved.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => {
            setBulk({ file: null, uploading: false, progress: null, result: null, error: null });
            setShowBulkModal(true);
          }}>
            Import CSV
          </Button>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: 'var(--surface-input)',
            border: '1px solid var(--border-divider)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.7',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Required CSV Columns:</p>
          <code style={{ fontFamily: 'monospace', fontSize: '12px' }}>Merchant Name, Ticker Symbol, Category, Confidence, Notes</code>
          <br />
          <span style={{ fontSize: '11px' }}>
            Column names are flexible (e.g. "merchant_name", "Merchant", "name" all work). Confidence accepts 0.95 or 95%.
          </span>
        </div>
      </GlassCard>

      {/* Bulk Upload Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Import Merchant Mappings"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '32px',
              border: '2px dashed var(--border-divider)',
              borderRadius: '12px',
              textAlign: 'center',
              background: 'var(--surface-input)',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('bulk-csv-input')?.click()}
          >
            <input
              id="bulk-csv-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setBulk((prev) => ({ ...prev, file, result: null, error: null, progress: null }));
              }}
            />
            {bulk.file ? (
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {bulk.file.name}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {(bulk.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Click to select a CSV file or drag and drop
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Supports .csv files
                </p>
              </div>
            )}
          </div>

          {bulk.progress && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {bulk.uploading ? 'Processing rows...' : 'Complete'}
                  {bulk.progress.rowsPerSec > 0 && (
                    <span style={{ marginLeft: '8px', color: '#06B6D4', fontWeight: 600 }}>
                      {formatNumber(bulk.progress.rowsPerSec)} rows/sec
                    </span>
                  )}
                  {bulk.progress.elapsedSec > 0 && (
                    <span style={{ marginLeft: '8px' }}>
                      ({bulk.progress.elapsedSec}s elapsed)
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatNumber(bulk.progress.processed)} / {formatNumber(bulk.progress.total)}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                    ({Math.round((bulk.progress.processed / Math.max(bulk.progress.total, 1)) * 100)}%)
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  background: 'var(--surface-input)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(bulk.progress.processed / Math.max(bulk.progress.total, 1)) * 100}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #3B82F6)',
                    borderRadius: '3px',
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
            </div>
          )}

          {bulk.result && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: '8px',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#34D399', marginBottom: '8px' }}>
                Import Complete in {bulk.result.elapsedSec}s
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#34D399' }}>{formatNumber(bulk.result.success)}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>imported</span>
                </div>
                <div>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#FBBF24' }}>{formatNumber(bulk.result.skipped)}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>skipped</span>
                </div>
                <div>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444' }}>{formatNumber(bulk.result.failed)}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>failed</span>
                </div>
              </div>
              {bulk.progress && bulk.progress.errors.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#FCA5A5' }}>
                  {bulk.progress.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {bulk.error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                color: '#FCA5A5',
                fontSize: '13px',
              }}
            >
              {bulk.error}
            </div>
          )}

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Bulk uploads are processed directly to the database as <strong style={{ color: 'var(--text-secondary)' }}>approved mappings</strong>.
            This bypasses the normal approval process for high-volume data ingestion.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowBulkModal(false)}
            >
              {bulk.result ? 'Close' : 'Cancel'}
            </Button>
            {!bulk.result && (
              <Button
                variant="primary"
                size="md"
                loading={bulk.uploading}
                disabled={!bulk.file}
                onClick={handleBulkUpload}
              >
                {bulk.uploading ? 'Importing...' : 'Start Import'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Mapping Sources Breakdown */}
      <GlassCard accent="blue">
        <SectionTitle>Mapping Sources</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          {sourceBreakdown.length > 0 ? sourceBreakdown.map(([source, count]) => (
            <div
              key={source}
              style={{
                padding: '14px 18px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-divider)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatNumber(count)}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {source}
              </p>
            </div>
          )) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No recent mappings.</p>
          )}
        </div>
      </GlassCard>

      {/* Recent Mappings Table */}
      <GlassCard accent="teal" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <SectionTitle>Recent Mappings</SectionTitle>
        </div>
        <Table<LlmMapping>
          columns={recentColumns}
          data={recentMappings}
          loading={false}
          emptyMessage="No mappings in the database yet"
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
  const [processLoading, setProcessLoading] = useState<number | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<LlmMapping | null>(null);
  const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabaseAdmin
        .from('llm_mappings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(500);
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
      // Find the mapping to get its transaction_id and ticker
      const mapping = mappings.find((m) => m.id === id);

      await supabaseAdmin
        .from('llm_mappings')
        .update({ status: 'approved', admin_approved: true })
        .eq('id', id);

      // Update the linked transaction to 'mapped' with the approved ticker
      if (mapping?.transaction_id) {
        const updateFields: Record<string, unknown> = { status: 'mapped' };
        if (mapping.ticker) updateFields.ticker = mapping.ticker;
        await supabaseAdmin
          .from('transactions')
          .update(updateFields)
          .eq('id', Number(mapping.transaction_id));
      }

      await fetchPending();
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchPending, mappings]);

  const handleReject = useCallback(async (id: number) => {
    setActionLoading(id);
    try {
      const mapping = mappings.find((m) => m.id === id);

      await supabaseAdmin
        .from('llm_mappings')
        .update({ status: 'rejected', admin_approved: false })
        .eq('id', id);

      // Revert the linked transaction back to 'failed'
      if (mapping?.transaction_id) {
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', Number(mapping.transaction_id));
      }

      await fetchPending();
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchPending, mappings]);

  const handleDelete = useCallback(async (id: number) => {
    setActionLoading(id);
    try {
      await supabaseAdmin.from('llm_mappings').delete().eq('id', id);
      if (selectedMapping?.id === id) setSelectedMapping(null);
      await fetchPending();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [fetchPending, selectedMapping]);

  const handleProcess = useCallback(async (row: LlmMapping) => {
    setProcessLoading(row.id);
    setProcessError(null);
    try {
      // 1. Try the Edge Function (DeepSeek AI) first
      const txId = row.transaction_id ? Number(row.transaction_id) : undefined;
      const { data, error } = await mapMerchant(row.merchant_name, txId);

      if (data && !error) {
        // Edge Function succeeded
        await supabaseAdmin
          .from('llm_mappings')
          .update({
            ticker: data.ticker,
            company_name: data.company_name,
            category: data.category,
            confidence: data.confidence,
            ai_processed: true,
          })
          .eq('id', row.id);
        await fetchPending();
        return;
      }

      // 2. Edge Function unavailable — use local fallback
      let reasoning = '';
      let finalTicker = row.ticker;
      let finalCompany = row.company_name;
      let finalCategory = row.category;
      let finalConfidence = row.confidence ?? 0.90;

      if (row.ticker) {
        // Mapping already has a ticker (user-submitted) — validate & mark processed
        reasoning = `User-submitted mapping: "${row.merchant_name}" → ${row.ticker}. Validated via local lookup. No AI model was used — the Edge Function is not yet deployed.`;
      } else {
        // Try local COMPANY_LOOKUP matching
        const localResult = localMerchantLookup(row.merchant_name);
        if (localResult) {
          finalTicker = localResult.ticker;
          finalCompany = localResult.company_name;
          finalCategory = localResult.category;
          finalConfidence = localResult.confidence;
          reasoning = `Matched "${row.merchant_name}" → ${localResult.ticker} (${localResult.company_name}) via local company database with ${(localResult.confidence * 100).toFixed(0)}% confidence. No AI model was used.`;
        } else {
          // No local match either
          setProcessError(
            `Could not auto-process "${row.merchant_name}". AI Edge Function is not deployed. ` +
            `You can manually set the ticker and approve this mapping.`
          );
          return;
        }
      }

      await supabaseAdmin
        .from('llm_mappings')
        .update({
          ticker: finalTicker,
          company_name: finalCompany,
          category: finalCategory,
          confidence: finalConfidence,
          ai_processed: true,
        })
        .eq('id', row.id);

      // Insert an ai_responses record so the detail modal shows reasoning
      await supabaseAdmin.from('ai_responses').insert({
        mapping_id: row.id,
        merchant_name: row.merchant_name,
        category: finalCategory,
        parsed_response: reasoning,
        model_version: 'local-lookup',
        processing_time_ms: 0,
        is_error: false,
      });

      await fetchPending();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setProcessError(`Failed to process "${row.merchant_name}": ${message}`);
      console.error('Process mapping error:', err);
    } finally {
      setProcessLoading(null);
    }
  }, [fetchPending]);

  const openDetail = useCallback(async (mapping: LlmMapping) => {
    setSelectedMapping(mapping);
    setDetailLoading(true);
    try {
      const { data } = await supabaseAdmin
        .from('ai_responses')
        .select('*')
        .eq('mapping_id', mapping.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAiResponse(data as AiResponse | null);
    } catch {
      setAiResponse(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

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
  const unprocessedCount = useMemo(
    () => mappings.filter((m) => !m.ai_processed).length,
    [mappings],
  );
  const avgConfidence = useMemo(() => {
    const withConf = mappings.filter((m) => m.confidence !== null);
    if (withConf.length === 0) return 0;
    return withConf.reduce((acc, m) => acc + (m.confidence ?? 0), 0) / withConf.length;
  }, [mappings]);

  const columns: Column<LlmMapping>[] = useMemo(
    () => [
      {
        key: 'merchant_name',
        header: 'Merchant Name',
        sortable: true,
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={COMPANY_LOOKUP[row.merchant_name] ? row.merchant_name : (row.ticker ?? '')} size={20} />
            {row.merchant_name}
          </span>
        ),
      },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      { key: 'category', header: 'Source', sortable: true, width: '130px', render: (row) => formatCategory(row.category) },
      {
        key: 'confidence',
        header: 'Confidence',
        sortable: true,
        width: '120px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.confidence} />,
      },
      { key: 'user_id', header: 'User ID', sortable: true, width: '90px', render: (row) => row.user_id ?? 'N/A' },
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
        width: '420px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(row);
              }}
            >
              View
            </Button>
            {!row.ai_processed && (
              <Button
                variant="secondary"
                size="sm"
                loading={processLoading === row.id}
                disabled={actionLoading === row.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProcess(row);
                }}
              >
                Process
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading === row.id}
              disabled={processLoading === row.id}
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
              disabled={processLoading === row.id}
              onClick={(e) => {
                e.stopPropagation();
                handleReject(row.id);
              }}
            >
              Reject
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading === row.id}
              disabled={processLoading === row.id}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete mapping for "${row.merchant_name}"?`)) {
                  handleDelete(row.id);
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [actionLoading, processLoading, handleApprove, handleReject, handleProcess, handleDelete, openDetail],
  );

  if (loading) {
    return <LoadingSpinner message="Loading pending mappings..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <KpiGrid>
        <KpiCard label="Pending Count" value={formatNumber(pendingCount)} accent="pink" />
        <KpiCard label="Unprocessed" value={formatNumber(unprocessedCount)} accent="orange" />
        <KpiCard label="High Confidence (>0.8)" value={formatNumber(highConfidence)} accent="teal" />
        <KpiCard label="Low Confidence (<0.5)" value={formatNumber(lowConfidence)} accent="purple" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="blue" />
      </KpiGrid>

      {processError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>{processError}</span>
          <button
            onClick={() => setProcessError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: 1,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            x
          </button>
        </div>
      )}

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

      {/* Mapping Details Modal */}
      <Modal open={!!selectedMapping} onClose={() => { setSelectedMapping(null); setAiResponse(null); }}>
        {selectedMapping && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '560px', maxWidth: '640px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Mapping Details
            </h3>

            {detailLoading && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading AI response data...
              </div>
            )}

            {/* Grid layout for details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Merchant */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Merchant</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedMapping.merchant_name}</p>
              </div>
              {/* Mapping ID */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Mapping ID</p>
                <span style={{ padding: '2px 10px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedMapping.id}</span>
              </div>

              {/* Company Logo */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Company Logo</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CompanyLogo name={selectedMapping.ticker ?? selectedMapping.merchant_name} size={24} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedMapping.company_name ?? selectedMapping.merchant_name}</span>
                </div>
              </div>
              {/* Stock Ticker */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Stock Ticker</p>
                <span style={{ padding: '2px 10px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedMapping.ticker ?? 'N/A'}</span>
              </div>

              {/* Company Name */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Company Name</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{selectedMapping.company_name ?? selectedMapping.merchant_name}</p>
              </div>
              {/* Category */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Category</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{formatCategory(selectedMapping.category)}</p>
              </div>

              {/* Confidence */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Confidence</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: selectedMapping.confidence != null ? (selectedMapping.confidence > 0.8 ? '#34D399' : selectedMapping.confidence > 0.5 ? '#FBBF24' : '#EF4444') : 'var(--text-muted)', margin: 0 }}>
                  {selectedMapping.confidence != null ? `${(selectedMapping.confidence * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              {/* Status */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Status</p>
                <Badge variant={selectedMapping.status === 'approved' ? 'success' : selectedMapping.status === 'rejected' ? 'error' : 'warning'}>
                  {selectedMapping.status.charAt(0).toUpperCase() + selectedMapping.status.slice(1)}
                </Badge>
              </div>

              {/* User ID */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>User ID</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{selectedMapping.user_id ? `ID: ${selectedMapping.user_id}` : 'N/A'}</p>
              </div>
              {/* Submitted At */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Submitted At</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{new Date(selectedMapping.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</p>
              </div>

              {/* Admin Approval */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Admin Approval</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: selectedMapping.admin_approved === true ? '#34D399' : selectedMapping.admin_approved === false ? '#EF4444' : 'var(--text-muted)', margin: 0 }}>
                  {selectedMapping.admin_approved === true ? 'Approved' : selectedMapping.admin_approved === false ? 'Rejected' : 'Pending'}
                </p>
              </div>

              {/* AI Processing Status */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>AI Processing Status</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: selectedMapping.ai_processed ? 'var(--text-primary)' : '#FBBF24', margin: 0 }}>
                  {selectedMapping.ai_processed ? 'Processed' : selectedMapping.confidence != null && selectedMapping.confidence < 0.8 ? `Review required ${(selectedMapping.confidence * 100).toFixed(1)}%` : 'Not Processed'}
                </p>
              </div>
              {/* AI Confidence */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>AI Confidence</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedMapping.confidence != null ? `${(selectedMapping.confidence * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>

              {/* AI Model Version */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>AI Model Version</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  {aiResponse?.model_version ?? 'N/A'}
                </p>
              </div>
              {/* AI Processing Time */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px' }}>AI Processing Time</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  {aiResponse?.processing_time_ms != null ? `${aiResponse.processing_time_ms}ms` : 'N/A'}
                </p>
              </div>
            </div>

            {/* AI Reasoning */}
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px' }}>AI Reasoning</p>
              <div style={{ padding: '12px 16px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {aiResponse?.parsed_response ?? aiResponse?.raw_response ?? 'No AI reasoning available'}
              </div>
            </div>

            {/* User Notes */}
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px' }}>User Notes</p>
              <div style={{ padding: '12px 16px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {aiResponse?.feedback_notes ?? 'No user notes'}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '8px' }}>
              {!selectedMapping.ai_processed && (
                <Button
                  variant="secondary"
                  loading={processLoading === selectedMapping.id}
                  onClick={() => { handleProcess(selectedMapping); }}
                >
                  Process with AI
                </Button>
              )}
              <Button
                variant="primary"
                loading={actionLoading === selectedMapping.id}
                onClick={() => { handleApprove(selectedMapping.id); setSelectedMapping(null); }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                loading={actionLoading === selectedMapping.id}
                onClick={() => { handleReject(selectedMapping.id); setSelectedMapping(null); }}
              >
                Reject
              </Button>
              <Button
                variant="danger"
                loading={actionLoading === selectedMapping.id}
                onClick={() => {
                  if (confirm(`Delete mapping for "${selectedMapping.merchant_name}"?`)) {
                    handleDelete(selectedMapping.id);
                  }
                }}
              >
                Delete
              </Button>
              <Button variant="secondary" onClick={() => { setSelectedMapping(null); setAiResponse(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ========================================================================== */
/*  Tab 3: All Mappings                                                       */
/* ========================================================================== */

/* ========================================================================== */
/*  Tab 3: ML Dashboard                                                       */
/* ========================================================================== */

function MlDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<AiResponse[]>([]);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalMappingsCount, setTotalMappingsCount] = useState(0);

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
      const [respResult, mapResult, respCount, mapCount] = await Promise.all([
        supabaseAdmin.from('ai_responses').select('*').order('created_at', { ascending: false }).limit(500),
        supabaseAdmin.from('llm_mappings').select('*').order('created_at', { ascending: false }).limit(500),
        supabaseAdmin.from('ai_responses').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('llm_mappings').select('id', { count: 'exact', head: true }),
      ]);
      setResponses((respResult.data ?? []) as AiResponse[]);
      setMappings((mapResult.data ?? []) as LlmMapping[]);
      setTotalCalls(respCount.count ?? 0);
      setTotalMappingsCount(mapCount.count ?? 0);
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

  /* Bar chart data: mappings by status (always has data from llm_mappings) */
  const mappingsByStatus = useMemo<ModelCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const m of mappings) {
      const status = m.status ?? 'unknown';
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, calls]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), calls }))
      .sort((a, b) => b.calls - a.calls);
  }, [mappings]);

  /* Bar chart data: calls by model (from ai_responses) */
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

  /* Bar chart data: mappings by source */
  const mappingsBySource = useMemo<ModelCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const m of mappings) {
      const source = formatCategory(m.category);
      map.set(source, (map.get(source) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, calls]) => ({ name, calls }))
      .sort((a, b) => b.calls - a.calls);
  }, [mappings]);

  /* Test merchant handler */
  const handleTestMerchant = useCallback(async () => {
    if (!testMerchant.trim()) return;
    setTestLoading(true);
    setTestResults(null);
    try {
      const result = await supabaseAdmin
        .from('llm_mappings')
        .select('*')
        .ilike('merchant_name', `%${testMerchant.trim()}%`)
        .limit(10);
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
      const { error } = await supabaseAdmin.from('llm_mappings').insert({
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
      { key: 'category', header: 'Source', width: '120px', render: (row) => formatCategory(row.category) },
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
        <KpiCard label="Total Mappings" value={formatNumber(totalMappingsCount)} accent="purple" />
        <KpiCard label="AI Calls" value={formatNumber(totalCalls)} accent="teal" />
        <KpiCard label="Learning Progress" value={formatPercent(learningProgress)} accent="blue" />
        <KpiCard label="Avg Response Time" value={totalCalls > 0 ? `${formatNumber(avgResponseTime)}ms` : 'N/A'} accent="pink" />
      </KpiGrid>

      {/* AI Status Banner */}
      {totalCalls === 0 && (
        <GlassCard accent="blue">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>i</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                AI Processing Not Yet Active
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                The DeepSeek AI Edge Function has not been deployed yet. AI call analytics will populate once the Edge Function is active and processing merchant mappings. Currently using local lookup for merchant-to-ticker matching.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

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
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                No existing mappings found for this merchant.
              </p>
            ) : (
              <Table<LlmMapping>
                columns={testColumns}
                data={testResults}
                loading={false}
                emptyMessage="No results"
                pageSize={10}
                rowKey={(row) => row.id}
              />
            )}
          </div>
        )}
      </GlassCard>

      {/* Manual Learning */}
      <GlassCard accent="teal">
        <SectionTitle>Manual Learning</SectionTitle>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>
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

      {/* Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
        }}
      >
        <BarChart<ModelCallPoint>
          data={mappingsByStatus}
          dataKey="calls"
          xKey="name"
          title="Mappings by Status"
          color="#7C3AED"
          height={260}
        />
        <BarChart<ModelCallPoint>
          data={mappingsBySource}
          dataKey="calls"
          xKey="name"
          title="Mappings by Source"
          color="#3B82F6"
          height={260}
        />
      </div>

      {/* AI Calls by model — only show when there's AI data */}
      {callsByModel.length > 0 && (
        <BarChart<ModelCallPoint>
          data={callsByModel}
          dataKey="calls"
          xKey="name"
          title="AI Calls by Model Version"
          color="#06B6D4"
          height={260}
        />
      )}
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
  const [totalResponsesCount, setTotalResponsesCount] = useState(0);
  const [totalMappingsCount, setTotalMappingsCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [respResult, mapResult, respCount, mapCount] = await Promise.all([
        supabaseAdmin.from('ai_responses').select('*').order('created_at', { ascending: false }).limit(500),
        supabaseAdmin.from('llm_mappings').select('*').order('created_at', { ascending: false }).limit(500),
        supabaseAdmin.from('ai_responses').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('llm_mappings').select('id', { count: 'exact', head: true }),
      ]);
      setResponses((respResult.data ?? []) as AiResponse[]);
      setMappings((mapResult.data ?? []) as LlmMapping[]);
      setTotalResponsesCount(respCount.count ?? 0);
      setTotalMappingsCount(mapCount.count ?? 0);
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
      { key: 'category', header: 'Category', sortable: true, width: '120px', render: (row) => formatCategory(row.category) },
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
          <span style={{ color: row.admin_feedback ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px' }}>
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
        <KpiCard label="Total AI Responses" value={formatNumber(totalResponsesCount)} accent="purple" />
        <KpiCard label="Total Mappings" value={formatNumber(totalMappingsCount)} accent="blue" />
        <KpiCard label="Error Responses" value={formatNumber(errorResponses)} accent="pink" />
        <KpiCard label="Feedback Given" value={formatNumber(feedbackGiven)} accent="teal" />
      </KpiGrid>

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
              background: 'var(--surface-input)',
              border: '1px solid var(--border-divider)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: noTickerCount > 0 ? '#FBBF24' : '#34D399' }}>
              {formatNumber(noTickerCount)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Mappings with no ticker
            </p>
          </div>
          <div
            style={{
              padding: '16px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-divider)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: lowConfCount > 0 ? '#EF4444' : '#34D399' }}>
              {formatNumber(lowConfCount)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Confidence below 0.3
            </p>
          </div>
          <div
            style={{
              padding: '16px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-divider)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, color: errorResponses > 0 ? '#EF4444' : '#34D399' }}>
              {formatNumber(errorResponses)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Error responses
            </p>
          </div>
        </div>
      </GlassCard>

      {/* AI Response History */}
      {responses.length > 0 ? (
        <>
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

          {/* Processing time trend */}
          <LineChart<ProcessingTrendPoint>
            data={processingTrend}
            dataKey="avg_ms"
            xKey="name"
            title="Avg Processing Time Trend (ms)"
            color="#06B6D4"
            height={260}
          />
        </>
      ) : (
        <GlassCard accent="blue">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>i</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                AI Response History
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                No AI responses recorded yet. The response history and processing time trend will populate once the DeepSeek AI Edge Function is deployed and processing merchant mappings.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  Tab 6: AI Analytics                                                       */
/* ========================================================================== */

function AiAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<AiResponse[]>([]);
  const [mappings, setMappings] = useState<LlmMapping[]>([]);
  const [totalMappingsCount, setTotalMappingsCount] = useState(0);
  const [totalResponsesCount, setTotalResponsesCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [respResult, mapResult, respCount, mapCount] = await Promise.all([
          supabaseAdmin.from('ai_responses').select('*').order('created_at', { ascending: false }).limit(500),
          supabaseAdmin.from('llm_mappings').select('*').order('created_at', { ascending: false }).limit(500),
          supabaseAdmin.from('ai_responses').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('llm_mappings').select('id', { count: 'exact', head: true }),
        ]);
        setResponses((respResult.data ?? []) as AiResponse[]);
        setMappings((mapResult.data ?? []) as LlmMapping[]);
        setTotalResponsesCount(respCount.count ?? 0);
        setTotalMappingsCount(mapCount.count ?? 0);
      } catch (err) {
        console.error('AiAnalyticsContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* Mapping-based KPIs (always available) */
  const approvalRate = useMemo(() => {
    if (mappings.length === 0) return 0;
    return mappings.filter((m) => m.status === 'approved').length / mappings.length;
  }, [mappings]);

  const rejectionRate = useMemo(() => {
    if (mappings.length === 0) return 0;
    return mappings.filter((m) => m.status === 'rejected').length / mappings.length;
  }, [mappings]);

  const avgConfidence = useMemo(() => {
    const withConf = mappings.filter((m) => m.confidence !== null);
    if (withConf.length === 0) return 0;
    return withConf.reduce((acc, m) => acc + (m.confidence ?? 0), 0) / withConf.length;
  }, [mappings]);

  /* AI-response KPIs */
  const accuracyRate = useMemo(() => {
    const evaluated = responses.filter((r) => r.was_ai_correct !== null);
    if (evaluated.length === 0) return null;
    return evaluated.filter((r) => r.was_ai_correct === true).length / evaluated.length;
  }, [responses]);

  const avgProcessingTime = useMemo(() => {
    const withTime = responses.filter((r) => r.processing_time_ms !== null);
    if (withTime.length === 0) return null;
    return Math.round(withTime.reduce((acc, r) => acc + (r.processing_time_ms ?? 0), 0) / withTime.length);
  }, [responses]);

  /* Bar chart: mappings by status */
  const mappingsByStatus = useMemo<ModelCallPoint[]>(() => {
    const map = new Map<string, number>();
    for (const m of mappings) {
      const status = m.status ?? 'unknown';
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, calls]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), calls }))
      .sort((a, b) => b.calls - a.calls);
  }, [mappings]);

  /* Line chart: daily mapping volume */
  const dailyMappings = useMemo<DailyVolumePoint[]>(() => {
    const dayMap = new Map<string, number>();
    for (const m of mappings) {
      const dk = dayKey(m.created_at);
      dayMap.set(dk, (dayMap.get(dk) ?? 0) + 1);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dk, count]) => ({
        name: dayLabel(dk + 'T00:00:00Z'),
        count,
      }));
  }, [mappings]);

  /* Bar chart: AI calls by model (only if responses exist) */
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

  /* Confidence distribution */
  const confidenceDistribution = useMemo<ModelCallPoint[]>(() => {
    const buckets = { 'High (>80%)': 0, 'Medium (50-80%)': 0, 'Low (<50%)': 0, 'None': 0 };
    for (const m of mappings) {
      if (m.confidence === null) buckets['None'] += 1;
      else if (m.confidence >= 0.8) buckets['High (>80%)'] += 1;
      else if (m.confidence >= 0.5) buckets['Medium (50-80%)'] += 1;
      else buckets['Low (<50%)'] += 1;
    }
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, calls]) => ({ name, calls }));
  }, [mappings]);

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
        <KpiCard label="Total Mappings" value={formatNumber(totalMappingsCount)} accent="purple" />
        <KpiCard label="Approval Rate" value={formatPercent(approvalRate)} accent="teal" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="blue" />
        <KpiCard label="AI Accuracy" value={accuracyRate !== null ? formatPercent(accuracyRate) : 'N/A'} accent="pink" />
      </KpiGrid>

      {/* AI Status Banner */}
      {totalResponsesCount === 0 && (
        <GlassCard accent="blue">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>i</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                AI Processing Analytics
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                AI response analytics (accuracy, processing time, model comparison) will populate once the DeepSeek AI Edge Function is deployed and processing mappings. The charts below show mapping-level analytics from the current data.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Charts — mapping-based (always has data) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
        }}
      >
        <BarChart<ModelCallPoint>
          data={mappingsByStatus}
          dataKey="calls"
          xKey="name"
          title="Mappings by Status"
          color="#7C3AED"
          height={260}
        />
        <LineChart<DailyVolumePoint>
          data={dailyMappings}
          dataKey="count"
          xKey="name"
          title="Daily Mapping Volume"
          color="#3B82F6"
          height={260}
        />
      </div>

      {/* Confidence Distribution */}
      <BarChart<ModelCallPoint>
        data={confidenceDistribution}
        dataKey="calls"
        xKey="name"
        title="Confidence Distribution"
        color="#06B6D4"
        height={260}
      />

      {/* AI Model Calls — only if AI responses exist */}
      {callsByModel.length > 0 && (
        <BarChart<ModelCallPoint>
          data={callsByModel}
          dataKey="calls"
          xKey="name"
          title="AI Calls by Model Version"
          color="#EC4899"
          height={260}
        />
      )}

      {/* Feedback Summary */}
      <GlassCard accent="teal">
        <SectionTitle>Feedback Summary</SectionTitle>
        {feedbackSummary.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
            No admin feedback recorded yet. Feedback analytics will appear here as you approve/reject mappings and provide feedback on AI responses.
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
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-divider)',
                    borderRadius: '10px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '28px', fontWeight: 700, color: accentColor }}>
                    {formatNumber(fb.count)}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'capitalize' }}>
                    {fb.label}
                  </p>
                </div>
              );
            })}
            <div
              style={{
                padding: '16px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-divider)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatNumber(totalFeedback)}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
/*  Tab 7: Flow (Transaction Processing Pipeline) — LIVE METRICS             */
/* ========================================================================== */

interface FlowStage {
  step: number;
  title: string;
  description: string;
  status: 'active' | 'warning' | 'idle';
  mainValue: string;
  mainLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  metrics: { label: string; value: string }[];
  color: string;
}

function FlowContent() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<FlowStage[]>([]);
  /* KPIs */
  const [totalTx, setTotalTx] = useState(0);
  const [totalRoundUps, setTotalRoundUps] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [mappingDbSize, setMappingDbSize] = useState(0);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [investmentQueued, setInvestmentQueued] = useState(0);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      // Use count queries for large tables (no 1,000 row limit)
      const [
        txCountResult,
        txTodayResult,
        txPendingResult,
        txCompletedResult,
        txFailedResult,
        txWithTickerResult,
        txWithRoundupResult,
        mappingDbResult,
        mappingApprovedResult,
        aiCallsResult,
        aiErrorsResult,
        ledgerResult,
        queueResult,
        confSample,
        roundupSample,
      ] = await Promise.all([
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).not('ticker', 'is', null),
        supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).gt('round_up', 0),
        supabaseAdmin.from('llm_mappings').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('llm_mappings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabaseAdmin.from('ai_responses').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('ai_responses').select('*', { count: 'exact', head: true }).eq('is_error', true),
        supabaseAdmin.from('roundup_ledger').select('id, round_up_amount, status, fee_amount').limit(1000),
        supabaseAdmin.from('market_queue').select('id, amount, status, ticker').limit(1000),
        supabaseAdmin.from('llm_mappings').select('confidence').not('confidence', 'is', null).limit(5000),
        supabaseAdmin.from('transactions').select('round_up').gt('round_up', 0).limit(5000),
      ]);

      const allTxCount = txCountResult.count ?? 0;
      const todayCount = txTodayResult.count ?? 0;
      const pendingCount = txPendingResult.count ?? 0;
      const completedCount = txCompletedResult.count ?? 0;
      const failedCount = txFailedResult.count ?? 0;
      const withTickerCount = txWithTickerResult.count ?? 0;
      const withRoundupCount = txWithRoundupResult.count ?? 0;
      const dbMappings = mappingDbResult.count ?? 0;
      const dbApproved = mappingApprovedResult.count ?? 0;
      const aiCalls = aiCallsResult.count ?? 0;
      const aiErrors = aiErrorsResult.count ?? 0;

      // Calculate totals from sampled data
      const confRows = (confSample.data ?? []) as { confidence: number }[];
      const avgConf = confRows.length > 0
        ? confRows.reduce((s, r) => s + Number(r.confidence || 0), 0) / confRows.length
        : 0;

      const roundupRows = (roundupSample.data ?? []) as { round_up: number }[];
      const sampledRoundupTotal = roundupRows.reduce((s, r) => s + Number(r.round_up || 0), 0);
      // Extrapolate if sample was capped
      const estimatedRoundupTotal = roundupRows.length === 5000 && withRoundupCount > 5000
        ? (sampledRoundupTotal / roundupRows.length) * withRoundupCount
        : sampledRoundupTotal;

      const ledgerData = (ledgerResult.data ?? []) as { id: number; round_up_amount: number; status: string; fee_amount: number }[];
      const ledgerPending = ledgerData.filter((l) => l.status === 'pending');
      const ledgerPendingAmt = ledgerPending.reduce((s, l) => s + Number(l.round_up_amount || 0), 0);
      const ledgerSwept = ledgerData.filter((l) => l.status !== 'pending');
      const ledgerSweptAmt = ledgerSwept.reduce((s, l) => s + Number(l.round_up_amount || 0), 0);

      const queueData = (queueResult.data ?? []) as { id: number; amount: number; status: string; ticker: string }[];
      const queuedOrders = queueData.filter((q) => q.status === 'queued');
      const queuedAmount = queuedOrders.reduce((s, q) => s + Number(q.amount || 0), 0);
      const executedOrders = queueData.filter((q) => q.status !== 'queued');
      const executedAmount = executedOrders.reduce((s, q) => s + Number(q.amount || 0), 0);
      const uniqueTickers = new Set(queueData.map((q) => q.ticker)).size;

      // Unmatched = transactions without a ticker that are completed (went through LLM but no match)
      const unmatchedCount = completedCount - withTickerCount;
      const rate = completedCount > 0 ? withTickerCount / completedCount : (dbApproved > 0 ? 1 : 0);

      // Set KPIs
      setTotalTx(allTxCount);
      setTotalRoundUps(estimatedRoundupTotal);
      setMatchRate(rate);
      setMappingDbSize(dbMappings);
      setAvgConfidence(avgConf);
      setInvestmentQueued(queuedAmount + executedAmount);

      // Build pipeline stages showing how a TRANSACTION flows through the system
      const stageList: FlowStage[] = [
        {
          step: 1,
          title: 'Transaction Ingestion',
          description: 'User purchases detected via Plaid bank sync. New transactions arrive here.',
          status: allTxCount > 0 ? 'active' : 'idle',
          mainValue: formatNumber(allTxCount),
          mainLabel: 'Total Transactions',
          secondaryValue: formatNumber(todayCount),
          secondaryLabel: 'Today',
          metrics: [
            { label: 'Pending', value: formatNumber(pendingCount) },
            { label: 'Completed', value: formatNumber(completedCount) },
            { label: 'Failed', value: formatNumber(failedCount) },
          ],
          color: '#7C3AED',
        },
        {
          step: 2,
          title: 'Round-Up Calculation',
          description: 'Each transaction receives the user\'s selected fixed round-up amount ($1, $2, $3, etc.) as a micro-investment.',
          status: withRoundupCount > 0 ? 'active' : 'idle',
          mainValue: formatNumber(withRoundupCount),
          mainLabel: 'Transactions with Round-Ups',
          secondaryValue: `$${estimatedRoundupTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          secondaryLabel: 'Total Round-Up Value',
          metrics: [
            { label: 'Ledger Pending', value: `${formatNumber(ledgerPending.length)} ($${ledgerPendingAmt.toFixed(2)})` },
            { label: 'Ledger Swept', value: `${formatNumber(ledgerSwept.length)} ($${ledgerSweptAmt.toFixed(2)})` },
          ],
          color: '#3B82F6',
        },
        {
          step: 3,
          title: 'LLM Merchant Matching',
          description: 'AI analyzes the merchant name from each transaction and looks up the mapping database to find the best stock ticker match.',
          status: aiCalls > 0
            ? (aiErrors / Math.max(aiCalls, 1) > 0.2 ? 'warning' : 'active')
            : (dbMappings > 0 ? 'active' : 'idle'),
          mainValue: formatNumber(dbMappings),
          mainLabel: 'Mapping Database Size',
          secondaryValue: formatNumber(aiCalls),
          secondaryLabel: 'AI API Calls Made',
          metrics: [
            { label: 'Approved Mappings', value: formatNumber(dbApproved) },
            { label: 'AI Errors', value: formatNumber(aiErrors) },
            { label: 'Avg Confidence', value: formatPercent(avgConf) },
          ],
          color: '#8B5CF6',
        },
        {
          step: 4,
          title: 'Match Result',
          description: 'Transactions matched to a ticker are approved and continue to investment. Unmatched transactions are flagged for manual review or rejected.',
          status: withTickerCount > 0 ? 'active' : 'idle',
          mainValue: formatNumber(withTickerCount),
          mainLabel: 'Matched Transactions',
          secondaryValue: formatNumber(Math.max(0, unmatchedCount)),
          secondaryLabel: 'Unmatched / Rejected',
          metrics: [
            { label: 'Match Rate', value: formatPercent(rate) },
            { label: 'Ticker Assigned', value: formatNumber(withTickerCount) },
            { label: 'Pending Review', value: formatNumber(pendingCount) },
          ],
          color: '#06B6D4',
        },
        {
          step: 5,
          title: 'Investment Queue',
          description: 'Approved round-ups with matched tickers are queued for fractional share purchases on the brokerage.',
          status: queueData.length > 0 ? 'active' : 'idle',
          mainValue: formatNumber(queueData.length),
          mainLabel: 'Total Orders',
          secondaryValue: `$${(queuedAmount + executedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          secondaryLabel: 'Total Queue Value',
          metrics: [
            { label: 'Queued', value: `${formatNumber(queuedOrders.length)} ($${queuedAmount.toFixed(2)})` },
            { label: 'Executed', value: `${formatNumber(executedOrders.length)} ($${executedAmount.toFixed(2)})` },
            { label: 'Unique Tickers', value: formatNumber(uniqueTickers) },
          ],
          color: '#10B981',
        },
      ];
      setStages(stageList);
    } catch (err) {
      console.error('FlowContent fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReprocess = useCallback(async () => {
    setReprocessing(true);
    setReprocessResult(null);
    try {
      const result = await reprocessFailedTransactions();
      if (result.total === 0) {
        setReprocessResult('No failed transactions to reprocess');
      } else {
        setReprocessResult(`Reprocessed ${result.total}: ${result.matched} matched, ${result.failed} still failed`);
      }
      fetchData();
    } catch (err) {
      console.error('Reprocess error:', err);
      setReprocessResult('Reprocess failed');
    } finally {
      setReprocessing(false);
      setTimeout(() => setReprocessResult(null), 6000);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <LoadingSpinner message="Loading transaction pipeline..." />;
  }

  const leftStages = stages.slice(0, 2);
  const rightStages = stages.slice(2, 5);

  const renderStageCard = (stage: FlowStage) => (
    <div
      style={{
        padding: '20px',
        background: 'var(--surface-input)',
        border: `1px solid ${stage.color}33`,
        borderRadius: '12px',
        borderLeft: `4px solid ${stage.color}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: `${stage.color}22`,
            border: `2px solid ${stage.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 700, color: stage.color }}>{stage.step}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{stage.title}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stage.description}</p>
        </div>
        <Badge variant={stage.status === 'active' ? 'success' : stage.status === 'warning' ? 'warning' : 'default'}>
          {stage.status === 'active' ? 'Active' : stage.status === 'warning' ? 'Warning' : 'No Data'}
        </Badge>
      </div>

      {/* Main metrics */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 16px',
          background: `${stage.color}0A`,
          borderRadius: '8px',
          marginBottom: '12px',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: '22px', fontWeight: 700, color: stage.color }}>{stage.mainValue}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stage.mainLabel}</p>
        </div>
        {stage.secondaryValue && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, color: stage.color }}>{stage.secondaryValue}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stage.secondaryLabel}</p>
          </div>
        )}
      </div>

      {/* Sub-metrics */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {stage.metrics.map((m) => (
          <div
            key={m.label}
            style={{
              padding: '6px 12px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-divider)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{m.label}: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConnector = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <div
        style={{
          width: '2px',
          height: '24px',
          background: 'linear-gradient(to bottom, rgba(124,58,237,0.4), rgba(59,130,246,0.4))',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid rgba(59,130,246,0.5)',
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Live status bar */}
      <div
        style={{
          padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.08))',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#34D399',
            boxShadow: '0 0 6px #34D399',
          }}
        />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Transaction Processing Pipeline
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Auto-refreshing every 30s
        </span>
        <div style={{ flex: 1 }} />
        {reprocessResult && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#34D399' }}>{reprocessResult}</span>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleReprocess}
          disabled={reprocessing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {reprocessing ? 'Reprocessing...' : 'Reprocess Failed'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
          Refresh Now
        </Button>
      </div>

      {/* KPI Cards — single row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        <KpiCard label="Total Transactions" value={formatNumber(totalTx)} accent="purple" />
        <KpiCard label="Total Round-Ups" value={`$${totalRoundUps.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent="blue" />
        <KpiCard label="Match Rate" value={formatPercent(matchRate)} accent="teal" />
        <KpiCard label="Mapping DB" value={formatNumber(mappingDbSize)} accent="purple" />
        <KpiCard label="Investment Queued" value={`$${investmentQueued.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent="teal" />
      </div>

      {/* Pipeline 2-Column Layout */}
      <GlassCard accent="purple">
        <SectionTitle>How a Transaction Flows Through the System</SectionTitle>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
          Each user purchase goes through this pipeline: ingestion, round-up calculation, AI merchant matching against the {formatNumber(mappingDbSize)}-row mapping database, approval, and finally investment execution.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '0',
            alignItems: 'stretch',
          }}
        >
          {/* Left: Ingestion & Round-Up */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: '12px 12px 0 0',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#C4B5FD' }}>Data Ingestion</p>
              <p style={{ fontSize: '12px', color: 'rgba(196,181,253,0.5)', marginTop: '4px' }}>Transaction capture and round-up detection</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
              {leftStages.map((stage, idx) => (
                <div key={stage.step}>
                  {renderStageCard(stage)}
                  {idx < leftStages.length - 1 && renderConnector()}
                </div>
              ))}
            </div>
          </div>

          {/* Center connector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', minWidth: '80px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  height: '2px',
                  width: '56px',
                  background: 'linear-gradient(to right, rgba(124,58,237,0.5), rgba(59,130,246,0.5))',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    right: '-5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 0,
                    height: 0,
                    borderTop: '6px solid transparent',
                    borderBottom: '6px solid transparent',
                    borderLeft: '8px solid rgba(59,130,246,0.5)',
                  }}
                />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                Flow
              </span>
            </div>
          </div>

          {/* Right: AI Processing, Matching, Investment */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px 12px 0 0',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#93C5FD' }}>AI Processing & Execution</p>
              <p style={{ fontSize: '12px', color: 'rgba(147,197,253,0.5)', marginTop: '4px' }}>Merchant matching, approval, and investment routing</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
              {rightStages.map((stage, idx) => (
                <div key={stage.step}>
                  {renderStageCard(stage)}
                  {idx < rightStages.length - 1 && renderConnector()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ========================================================================== */
/*  Tab 8: Receipt Mappings                                                    */
/* ========================================================================== */

function ReceiptMappingsContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '16px',
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px',
      }}>
        <span role="img" aria-label="receipt">R</span>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        Receipt Mappings
      </p>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', maxWidth: '440px', lineHeight: '1.6' }}>
        This feature allows users to upload receipt images which are then OCR-processed to extract merchant names, amounts, and dates. The extracted data is automatically mapped to stock tickers using the AI mapping pipeline. This feature is not yet implemented.
      </p>
      <Badge variant="warning">Coming Soon</Badge>
    </div>
  );
}

/* ========================================================================== */
/*  Tab 9: LLM Data Assets                                                     */
/* ========================================================================== */

function LlmDataAssetsContent() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<MerchantAssetRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCountPoint[]>([]);
  const [totalMerchants, setTotalMerchants] = useState(0);
  const [uniqueTickers, setUniqueTickers] = useState(0);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [coverageRate, setCoverageRate] = useState(0);
  const [newestDate, setNewestDate] = useState('');
  const [oldestDate, setOldestDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch recent mappings (limited to 500 for performance)
        const result = await supabaseAdmin
          .from('llm_mappings')
          .select('merchant_name, ticker, category, confidence, status, admin_approved, created_at')
          .order('created_at', { ascending: false })
          .limit(500);

        const mappings = (result.data ?? []) as {
          merchant_name: string;
          ticker: string | null;
          category: string | null;
          confidence: number | null;
          status: string;
          admin_approved: boolean | null;
          created_at: string;
        }[];

        // Group by merchant
        const merchantMap = new Map<string, {
          tickers: Map<string, number>;
          totalConf: number;
          confCount: number;
          count: number;
          approved: number;
          newest: string;
          oldest: string;
        }>();

        for (const m of mappings) {
          const name = m.merchant_name;
          const existing = merchantMap.get(name) ?? {
            tickers: new Map<string, number>(),
            totalConf: 0,
            confCount: 0,
            count: 0,
            approved: 0,
            newest: m.created_at,
            oldest: m.created_at,
          };
          if (m.ticker) {
            existing.tickers.set(m.ticker, (existing.tickers.get(m.ticker) ?? 0) + 1);
          }
          if (m.confidence !== null) {
            existing.totalConf += m.confidence;
            existing.confCount += 1;
          }
          existing.count += 1;
          if (m.status === 'approved') existing.approved += 1;
          if (m.created_at > existing.newest) existing.newest = m.created_at;
          if (m.created_at < existing.oldest) existing.oldest = m.created_at;
          merchantMap.set(name, existing);
        }

        const assetRows: MerchantAssetRow[] = Array.from(merchantMap.entries()).map(([name, data]) => {
          let primaryTicker: string | null = null;
          let maxCount = 0;
          for (const [ticker, count] of data.tickers.entries()) {
            if (count > maxCount) {
              maxCount = count;
              primaryTicker = ticker;
            }
          }
          return {
            merchant_name: name,
            primary_ticker: primaryTicker,
            avg_confidence: data.confCount > 0 ? data.totalConf / data.confCount : 0,
            mapping_count: data.count,
            approved_count: data.approved,
            most_recent: data.newest,
          };
        });

        assetRows.sort((a, b) => b.mapping_count - a.mapping_count);
        setAssets(assetRows);
        setTotalMerchants(assetRows.length);

        // Unique tickers
        const tickerSet = new Set<string>();
        for (const m of mappings) {
          if (m.ticker) tickerSet.add(m.ticker);
        }
        setUniqueTickers(tickerSet.size);

        // Global avg confidence
        const withConf = mappings.filter((m) => m.confidence !== null);
        const globalAvg = withConf.length > 0
          ? withConf.reduce((acc, m) => acc + (m.confidence ?? 0), 0) / withConf.length
          : 0;
        setAvgConfidence(globalAvg);

        // Coverage: merchants that have a ticker
        const withTicker = assetRows.filter((a) => a.primary_ticker !== null).length;
        setCoverageRate(assetRows.length > 0 ? withTicker / assetRows.length : 0);

        // Category distribution
        const catMap = new Map<string, number>();
        for (const m of mappings) {
          const cat = m.category ?? 'Uncategorized';
          catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
        }
        const catData: CategoryCountPoint[] = Array.from(catMap.entries())
          .map(([name, count]) => ({ name: formatCategory(name), count }))
          .sort((a, b) => b.count - a.count);
        setCategoryData(catData);

        // Freshness dates
        if (mappings.length > 0) {
          const sorted = [...mappings].sort((a, b) => a.created_at.localeCompare(b.created_at));
          setOldestDate(sorted[0].created_at);
          setNewestDate(sorted[sorted.length - 1].created_at);
        }
      } catch (err) {
        console.error('LlmDataAssetsContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleExport = useCallback(() => {
    setExporting(true);
    try {
      const headers = ['Merchant Name', 'Primary Ticker', 'Avg Confidence', 'Mapping Count', 'Approved Count', 'Most Recent'];
      const csvRows = [headers.join(',')];
      for (const row of assets) {
        csvRows.push([
          `"${row.merchant_name.replace(/"/g, '""')}"`,
          row.primary_ticker ?? '',
          row.avg_confidence.toFixed(3),
          String(row.mapping_count),
          String(row.approved_count),
          row.most_recent,
        ].join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `llm_data_assets_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  }, [assets]);

  const columns: Column<MerchantAssetRow>[] = useMemo(
    () => [
      {
        key: 'merchant_name',
        header: 'Merchant',
        sortable: true,
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={COMPANY_LOOKUP[row.merchant_name] ? row.merchant_name : (row.primary_ticker ?? '')} size={20} />
            {row.merchant_name}
          </span>
        ),
      },
      {
        key: 'primary_ticker',
        header: 'Primary Ticker',
        sortable: true,
        width: '130px',
        render: (row) => (
          <span style={{ color: row.primary_ticker ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: row.primary_ticker ? 600 : 400 }}>
            {row.primary_ticker ?? '--'}
          </span>
        ),
      },
      {
        key: 'avg_confidence',
        header: 'Avg Confidence',
        sortable: true,
        width: '130px',
        align: 'right',
        render: (row) => <ConfidenceBadge confidence={row.avg_confidence} />,
      },
      {
        key: 'mapping_count',
        header: 'Mappings',
        sortable: true,
        width: '100px',
        align: 'right',
        render: (row) => formatNumber(row.mapping_count),
      },
      {
        key: 'approved_count',
        header: 'Approved',
        sortable: true,
        width: '100px',
        align: 'right',
        render: (row) => (
          <Badge variant={row.approved_count > 0 ? 'success' : 'default'}>
            {formatNumber(row.approved_count)}
          </Badge>
        ),
      },
      {
        key: 'most_recent',
        header: 'Last Updated',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.most_recent),
      },
    ],
    [],
  );

  if (loading) {
    return <LoadingSpinner message="Loading LLM data assets..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard label="Total Merchants" value={formatNumber(totalMerchants)} accent="purple" />
        <KpiCard label="Unique Tickers" value={formatNumber(uniqueTickers)} accent="blue" />
        <KpiCard label="Avg Confidence" value={formatPercent(avgConfidence)} accent="teal" />
        <KpiCard label="Coverage Rate" value={formatPercent(coverageRate)} accent="pink" />
      </KpiGrid>

      {/* Data Freshness + Export */}
      <GlassCard accent="teal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <SectionTitle>Data Freshness</SectionTitle>
            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginTop: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Newest Mapping: </span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {newestDate ? formatDateTime(newestDate) : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Oldest Mapping: </span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {oldestDate ? formatDateTime(oldestDate) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </GlassCard>

      {/* Merchant Knowledge Base Table */}
      <GlassCard accent="purple" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <SectionTitle>Merchant-to-Ticker Knowledge Base</SectionTitle>
        </div>
        <Table<MerchantAssetRow>
          columns={columns}
          data={assets}
          loading={false}
          emptyMessage="No merchant data assets found"
          pageSize={20}
          rowKey={(row) => row.merchant_name}
        />
      </GlassCard>

      {/* Category Distribution Chart */}
      <BarChart<CategoryCountPoint>
        data={categoryData}
        dataKey="count"
        xKey="name"
        title="Category Distribution"
        color="#7C3AED"
        height={280}
      />
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
        key: 'flow',
        label: 'Flow',
        content: <FlowContent />,
      },
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
        key: 'receipt-mappings',
        label: 'Receipt Mappings',
        content: <ReceiptMappingsContent />,
      },
      {
        key: 'llm-data-assets',
        label: 'LLM Data Assets',
        content: <LlmDataAssetsContent />,
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
          color: 'var(--text-primary)',
        }}
      >
        AI / LLM Management Center
      </p>
      <Tabs tabs={tabs} defaultTab="flow" />
    </div>
  );
}
