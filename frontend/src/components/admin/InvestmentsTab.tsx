import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Select } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import AreaChart from '@/components/charts/AreaChart';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Database row types                                                  */
/* ------------------------------------------------------------------ */

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type PortfolioRow = Database['public']['Tables']['portfolios']['Row'];
type MarketQueueRow = Database['public']['Tables']['market_queue']['Row'];
type RoundupLedgerRow = Database['public']['Tables']['roundup_ledger']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

/* ------------------------------------------------------------------ */
/*  Derived / view types                                                */
/* ------------------------------------------------------------------ */

interface AggregatedPortfolio {
  ticker: string;
  totalShares: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
}

interface TickerChartItem extends Record<string, unknown> {
  name: string;
  value: number;
}

interface RoundupMonthItem extends Record<string, unknown> {
  name: string;
  amount: number;
}

interface StagedTransaction {
  id: number;
  date: string;
  user_id: number;
  merchant: string;
  ticker: string;
  amount: number;
  round_up: number;
  shares: number | null;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatDatetime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function queueBadgeVariant(
  status: string,
): 'success' | 'warning' | 'info' | 'error' | 'default' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'processing':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function ledgerBadgeVariant(
  status: string,
): 'success' | 'warning' | 'info' | 'error' | 'default' {
  switch (status) {
    case 'swept':
      return 'success';
    case 'pending':
      return 'warning';
    case 'allocated':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

/* Shared grid for KPI rows */
const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

/* Shared section heading */
function SectionHeading({ children }: { children: string }) {
  return (
    <h3
      style={{
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0,
      }}
    >
      {children}
    </h3>
  );
}

/* Inline notification banner */
function ToastBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderRadius: '8px',
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.3)',
        color: '#34D399',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#34D399',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 700,
          padding: '0 4px',
        }}
      >
        x
      </button>
    </div>
  );
}

/* ================================================================== */
/*  TAB 1 -- Investment Summary                                        */
/* ================================================================== */

const accountTypeOptions: SelectOption[] = [
  { value: 'all', label: 'All Account Types' },
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'business', label: 'Business' },
];

function InvestmentSummaryTab() {
  const [portfolios, setPortfolios] = useState<PortfolioRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [accountFilter, setAccountFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const [pRes, uRes] = await Promise.all([
          supabase.from('portfolios').select('*'),
          supabase.from('users').select('id, account_type'),
        ]);

        if (pRes.error) {
          console.error('Failed to fetch portfolios:', pRes.error.message);
        }
        if (uRes.error) {
          console.error('Failed to fetch users:', uRes.error.message);
        }

        setPortfolios(pRes.data ?? []);
        setUsers((uRes.data as UserRow[]) ?? []);
      } catch (err) {
        console.error('Unexpected error fetching investment summary:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  /* Build a lookup: user_id -> account_type */
  const userAccountMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of users) {
      m.set(u.id, u.account_type);
    }
    return m;
  }, [users]);

  /* Filter portfolios by account type */
  const filtered = useMemo(() => {
    if (accountFilter === 'all') return portfolios;
    return portfolios.filter(
      (p) => userAccountMap.get(p.user_id) === accountFilter,
    );
  }, [portfolios, accountFilter, userAccountMap]);

  /* Aggregate by ticker */
  const aggregated = useMemo<AggregatedPortfolio[]>(() => {
    const map = new Map<
      string,
      {
        totalShares: number;
        weightedCost: number;
        currentPrice: number;
        totalValue: number;
      }
    >();

    for (const p of filtered) {
      const existing = map.get(p.ticker);
      if (existing) {
        existing.totalShares += p.shares;
        existing.weightedCost += p.average_price * p.shares;
        existing.totalValue += p.total_value;
        existing.currentPrice = p.current_price;
      } else {
        map.set(p.ticker, {
          totalShares: p.shares,
          weightedCost: p.average_price * p.shares,
          currentPrice: p.current_price,
          totalValue: p.total_value,
        });
      }
    }

    const result: AggregatedPortfolio[] = [];
    map.forEach((val, ticker) => {
      const avgPrice =
        val.totalShares > 0 ? val.weightedCost / val.totalShares : 0;
      result.push({
        ticker,
        totalShares: val.totalShares,
        avgPrice,
        currentPrice: val.currentPrice,
        totalValue: val.totalValue,
        gainLoss: (val.currentPrice - avgPrice) * val.totalShares,
      });
    });

    return result.sort((a, b) => b.totalValue - a.totalValue);
  }, [filtered]);

  /* KPIs */
  const totalInvested = useMemo(
    () => filtered.reduce((s, p) => s + p.total_value, 0),
    [filtered],
  );
  const currentValue = useMemo(
    () => filtered.reduce((s, p) => s + p.total_value, 0),
    [filtered],
  );
  const totalGainLoss = useMemo(
    () => aggregated.reduce((s, a) => s + a.gainLoss, 0),
    [aggregated],
  );
  const uniqueTickers = useMemo(
    () => new Set(filtered.map((p) => p.ticker)).size,
    [filtered],
  );

  /* Chart data -- top 10 by value */
  const chartData = useMemo<TickerChartItem[]>(
    () =>
      aggregated.slice(0, 10).map((a) => ({
        name: a.ticker,
        value: parseFloat(a.totalValue.toFixed(2)),
      })),
    [aggregated],
  );

  /* Table columns */
  const columns: Column<AggregatedPortfolio>[] = useMemo(
    () => [
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      {
        key: 'totalShares',
        header: 'Total Shares',
        sortable: true,
        align: 'right',
        width: '130px',
        render: (row) =>
          row.totalShares.toLocaleString('en-US', {
            maximumFractionDigits: 4,
          }),
      },
      {
        key: 'avgPrice',
        header: 'Avg Price',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) => usd(row.avgPrice),
      },
      {
        key: 'currentPrice',
        header: 'Current Price',
        sortable: true,
        align: 'right',
        width: '130px',
        render: (row) => usd(row.currentPrice),
      },
      {
        key: 'totalValue',
        header: 'Total Value',
        sortable: true,
        align: 'right',
        width: '140px',
        render: (row) => usd(row.totalValue),
      },
      {
        key: 'gainLoss',
        header: 'Gain / Loss',
        sortable: true,
        align: 'right',
        width: '140px',
        render: (row) => (
          <span style={{ color: row.gainLoss >= 0 ? '#34D399' : '#EF4444' }}>
            {row.gainLoss >= 0 ? '+' : ''}
            {usd(row.gainLoss)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Account type filter */}
      <div style={{ maxWidth: '260px' }}>
        <Select
          label="Account Type"
          options={accountTypeOptions}
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
        />
      </div>

      {/* KPI row */}
      <div style={kpiGridStyle}>
        <KpiCard label="Total Invested" value={usd(totalInvested)} accent="purple" />
        <KpiCard label="Current Value" value={usd(currentValue)} accent="blue" />
        <KpiCard
          label="Total Gain / Loss"
          value={usd(totalGainLoss)}
          accent={totalGainLoss >= 0 ? 'teal' : 'pink'}
        />
        <KpiCard
          label="Unique Tickers"
          value={uniqueTickers.toLocaleString()}
          accent="teal"
        />
      </div>

      {/* Portfolio table */}
      <GlassCard padding="0">
        <Table<AggregatedPortfolio>
          columns={columns}
          data={aggregated}
          loading={loading}
          emptyMessage="No portfolio holdings found"
          pageSize={15}
          rowKey={(row) => row.ticker}
        />
      </GlassCard>

      {/* Bar chart -- top 10 */}
      <BarChart<TickerChartItem>
        data={chartData}
        dataKey="value"
        xKey="name"
        title="Portfolio Value by Ticker (Top 10)"
        color="#06B6D4"
        height={280}
      />
    </div>
  );
}

/* ================================================================== */
/*  TAB 2 -- Investment Processing                                     */
/* ================================================================== */

function InvestmentProcessingTab() {
  /* ----- state ----- */
  const [queue, setQueue] = useState<MarketQueueRow[]>([]);
  const [staged, setStaged] = useState<StagedTransaction[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingStaged, setLoadingStaged] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ----- fetchers ----- */
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const { data, error } = await supabase
        .from('market_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch market queue:', error.message);
        setQueue([]);
        return;
      }
      setQueue(data ?? []);
    } catch (err) {
      console.error('Unexpected error fetching market queue:', err);
      setQueue([]);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const fetchStaged = useCallback(async () => {
    setLoadingStaged(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, date, user_id, merchant, ticker, amount, round_up, shares, status',
        )
        .not('ticker', 'is', null)
        .eq('status', 'pending')
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to fetch staged transactions:', error.message);
        setStaged([]);
        return;
      }
      setStaged(
        (data ?? []).map((d) => ({
          ...d,
          ticker: d.ticker as string, // guaranteed non-null by filter
        })),
      );
    } catch (err) {
      console.error('Unexpected error fetching staged transactions:', err);
      setStaged([]);
    } finally {
      setLoadingStaged(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchStaged();
  }, [fetchQueue, fetchStaged]);

  /* ----- execute all staged ----- */
  async function handleExecuteAll() {
    if (staged.length === 0) return;
    setExecuting(true);
    try {
      const inserts = staged.map((txn) => ({
        transaction_id: txn.id,
        user_id: txn.user_id,
        ticker: txn.ticker,
        amount: txn.round_up,
        status: 'pending' as const,
      }));

      const { error } = await supabase.from('market_queue').insert(inserts);

      if (error) {
        console.error('Failed to execute staged transactions:', error.message);
        setToast('Failed to queue transactions');
        return;
      }

      setToast(`${inserts.length} transaction(s) queued for processing`);
      await Promise.all([fetchQueue(), fetchStaged()]);
    } catch (err) {
      console.error('Unexpected error executing staged:', err);
      setToast('Unexpected error during execution');
    } finally {
      setExecuting(false);
    }
  }

  /* ----- derived KPIs ----- */
  const today = todayDateString();
  const totalInQueue = queue.length;
  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const processingCount = queue.filter((q) => q.status === 'processing').length;
  const completedToday = queue.filter(
    (q) => q.status === 'completed' && q.created_at?.startsWith(today),
  ).length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;
  const totalCompleted = queue.filter((q) => q.status === 'completed').length;
  const successRate =
    totalCompleted + failedCount > 0
      ? (totalCompleted / (totalCompleted + failedCount)) * 100
      : 0;

  /* ----- recent completed ----- */
  const recentCompleted = useMemo(
    () =>
      queue
        .filter((q) => q.status === 'completed')
        .sort((a, b) => {
          const aDate = a.processed_at ?? a.created_at;
          const bDate = b.processed_at ?? b.created_at;
          return bDate.localeCompare(aDate);
        })
        .slice(0, 20),
    [queue],
  );

  /* ----- columns: staged ----- */
  const stagedColumns: Column<StagedTransaction>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        width: '120px',
        render: (row) => formatDate(row.date),
      },
      { key: 'user_id', header: 'User ID', sortable: true, width: '90px' },
      { key: 'merchant', header: 'Merchant', sortable: true, width: '160px' },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '90px' },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: '110px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'round_up',
        header: 'Round-Up',
        sortable: true,
        align: 'right',
        width: '100px',
        render: (row) => usd(row.round_up),
      },
      {
        key: 'shares',
        header: 'Shares',
        sortable: true,
        align: 'right',
        width: '90px',
        render: (row) =>
          row.shares != null
            ? row.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })
            : '--',
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => (
          <Badge variant={queueBadgeVariant(row.status)}>{row.status}</Badge>
        ),
      },
    ],
    [],
  );

  /* ----- columns: processing queue ----- */
  const processingColumns: Column<MarketQueueRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      {
        key: 'transaction_id',
        header: 'Txn ID',
        sortable: true,
        width: '90px',
        render: (row) => (row.transaction_id != null ? row.transaction_id : '--'),
      },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '120px',
        render: (row) => (
          <Badge variant={queueBadgeVariant(row.status)}>{row.status}</Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        width: '180px',
        render: (row) => formatDatetime(row.created_at),
      },
      {
        key: 'processed_at',
        header: 'Processed At',
        sortable: true,
        width: '180px',
        render: (row) => formatDatetime(row.processed_at),
      },
    ],
    [],
  );

  /* ----- columns: recent completed ----- */
  const recentCompletedColumns: Column<MarketQueueRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'processed_at',
        header: 'Processed At',
        sortable: true,
        width: '200px',
        render: (row) => formatDatetime(row.processed_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast banner */}
      {toast && (
        <ToastBanner message={toast} onDismiss={() => setToast(null)} />
      )}

      {/* ---- System Status ---- */}
      <GlassCard>
        <SectionHeading>System Status</SectionHeading>
        <div style={{ ...kpiGridStyle, marginTop: '16px' }}>
          <KpiCard label="Total in Queue" value={totalInQueue.toLocaleString()} accent="purple" />
          <KpiCard label="Pending" value={pendingCount.toLocaleString()} accent="blue" />
          <KpiCard label="Processing" value={processingCount.toLocaleString()} accent="teal" />
          <KpiCard label="Completed Today" value={completedToday.toLocaleString()} accent="teal" />
          <KpiCard label="Failed" value={failedCount.toLocaleString()} accent="pink" />
        </div>
      </GlassCard>

      {/* ---- Staged Transactions ---- */}
      <GlassCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <SectionHeading>Staged Transactions</SectionHeading>
          <Button
            variant="primary"
            size="sm"
            loading={executing}
            disabled={staged.length === 0}
            onClick={handleExecuteAll}
          >
            Execute All Staged ({staged.length})
          </Button>
        </div>
        <div style={{ margin: '0 -24px -24px' }}>
          <Table<StagedTransaction>
            columns={stagedColumns}
            data={staged}
            loading={loadingStaged}
            emptyMessage="No staged transactions ready for execution"
            pageSize={10}
            rowKey={(row) => row.id}
          />
        </div>
      </GlassCard>

      {/* ---- Processing Queue ---- */}
      <GlassCard>
        <div style={{ marginBottom: '16px' }}>
          <SectionHeading>Processing Queue</SectionHeading>
        </div>
        <div style={{ margin: '0 -24px -24px' }}>
          <Table<MarketQueueRow>
            columns={processingColumns}
            data={queue}
            loading={loadingQueue}
            emptyMessage="No orders in the processing queue"
            pageSize={10}
            rowKey={(row) => row.id}
          />
        </div>
      </GlassCard>

      {/* ---- Recent Completed ---- */}
      <GlassCard>
        <div style={{ marginBottom: '16px' }}>
          <SectionHeading>Recent Completed</SectionHeading>
        </div>
        <div style={{ margin: '0 -24px -24px' }}>
          <Table<MarketQueueRow>
            columns={recentCompletedColumns}
            data={recentCompleted}
            loading={loadingQueue}
            emptyMessage="No completed orders yet"
            pageSize={20}
            rowKey={(row) => row.id}
          />
        </div>
      </GlassCard>
    </div>
  );
}

/* ================================================================== */
/*  TAB 3 -- Market Queue                                              */
/* ================================================================== */

type QueueStatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

const statusFilters: { key: QueueStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

function MarketQueueTab() {
  const [queue, setQueue] = useState<MarketQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('all');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('market_queue')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch market queue:', error.message);
          setQueue([]);
          return;
        }
        setQueue(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching market queue:', err);
        setQueue([]);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  /* Filtered data */
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return queue;
    return queue.filter((q) => q.status === statusFilter);
  }, [queue, statusFilter]);

  /* KPIs (always computed on full queue) */
  const queueSize = queue.length;
  const pendingOrders = queue.filter((q) => q.status === 'pending').length;
  const avgAmount =
    queue.length > 0
      ? queue.reduce((s, q) => s + q.amount, 0) / queue.length
      : 0;
  const totalAmount = queue.reduce((s, q) => s + q.amount, 0);

  /* Full table columns */
  const columns: Column<MarketQueueRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      {
        key: 'transaction_id',
        header: 'Txn ID',
        sortable: true,
        width: '90px',
        render: (row) => (row.transaction_id != null ? row.transaction_id : '--'),
      },
      { key: 'user_id', header: 'User ID', sortable: true, width: '90px' },
      { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '120px',
        render: (row) => (
          <Badge variant={queueBadgeVariant(row.status)}>{row.status}</Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        width: '180px',
        render: (row) => formatDatetime(row.created_at),
      },
      {
        key: 'processed_at',
        header: 'Processed At',
        sortable: true,
        width: '180px',
        render: (row) => formatDatetime(row.processed_at),
      },
    ],
    [],
  );

  /* Pill styles */
  const pillBase: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-input)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  };

  const pillActive: React.CSSProperties = {
    background: 'rgba(124,58,237,0.2)',
    borderColor: 'rgba(124,58,237,0.5)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPIs */}
      <div style={kpiGridStyle}>
        <KpiCard label="Queue Size" value={queueSize.toLocaleString()} accent="purple" />
        <KpiCard label="Pending Orders" value={pendingOrders.toLocaleString()} accent="blue" />
        <KpiCard label="Avg Amount" value={usd(avgAmount)} accent="teal" />
        <KpiCard label="Total Amount Queued" value={usd(totalAmount)} accent="pink" />
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            style={{
              ...pillBase,
              ...(statusFilter === f.key ? pillActive : {}),
            }}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Full table */}
      <GlassCard padding="0">
        <Table<MarketQueueRow>
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No entries in the market queue"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ================================================================== */
/*  TAB 4 -- Round-Up Ledger                                           */
/* ================================================================== */

function RoundUpLedgerTab() {
  const [ledger, setLedger] = useState<RoundupLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('roundup_ledger')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch roundup ledger:', error.message);
          setLedger([]);
          return;
        }
        setLedger(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching roundup ledger:', err);
        setLedger([]);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  /* KPIs */
  const totalRoundups = ledger.length;
  const totalAmount = ledger.reduce((s, r) => s + r.round_up_amount, 0);
  const totalFees = ledger.reduce((s, r) => s + r.fee_amount, 0);
  const sweptCount = ledger.filter((r) => r.status === 'swept').length;

  /* Chart data: round-up volume grouped by month */
  const chartData = useMemo<RoundupMonthItem[]>(() => {
    const map = new Map<string, number>();

    for (const entry of ledger) {
      const date = new Date(entry.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + entry.round_up_amount);
    }

    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    return sorted.map(([month, amount]) => {
      /* Format key like "Jan 2026" */
      const [yr, mo] = month.split('-');
      const monthLabel = new Date(Number(yr), Number(mo) - 1).toLocaleString(
        'en-US',
        { month: 'short', year: 'numeric' },
      );
      return {
        name: monthLabel,
        amount: parseFloat(amount.toFixed(2)),
      };
    });
  }, [ledger]);

  /* Table columns */
  const columns: Column<RoundupLedgerRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'user_id', header: 'User ID', sortable: true, width: '90px' },
      {
        key: 'transaction_id',
        header: 'Txn ID',
        sortable: true,
        width: '90px',
        render: (row) =>
          row.transaction_id != null ? row.transaction_id : '--',
      },
      {
        key: 'round_up_amount',
        header: 'Round-Up Amount',
        sortable: true,
        align: 'right',
        width: '140px',
        render: (row) => usd(row.round_up_amount),
      },
      {
        key: 'fee_amount',
        header: 'Fee Amount',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) => usd(row.fee_amount),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '120px',
        render: (row) => (
          <Badge variant={ledgerBadgeVariant(row.status)}>{row.status}</Badge>
        ),
      },
      {
        key: 'swept_at',
        header: 'Swept At',
        sortable: true,
        width: '180px',
        render: (row) => formatDatetime(row.swept_at),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        width: '180px',
        render: (row) => formatDatetime(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPIs */}
      <div style={kpiGridStyle}>
        <KpiCard
          label="Total Round-Ups"
          value={totalRoundups.toLocaleString()}
          accent="purple"
        />
        <KpiCard label="Total Amount" value={usd(totalAmount)} accent="blue" />
        <KpiCard label="Total Fees" value={usd(totalFees)} accent="pink" />
        <KpiCard
          label="Swept"
          value={sweptCount.toLocaleString()}
          accent="teal"
        />
      </div>

      {/* Ledger table */}
      <GlassCard padding="0">
        <Table<RoundupLedgerRow>
          columns={columns}
          data={ledger}
          loading={loading}
          emptyMessage="No round-up ledger entries found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Area chart: round-up volume over time */}
      <AreaChart<RoundupMonthItem>
        data={chartData}
        dataKey="amount"
        xKey="name"
        title="Round-Up Volume Over Time"
        color="#7C3AED"
        height={280}
      />
    </div>
  );
}

/* ================================================================== */
/*  Main Exported Component                                            */
/* ================================================================== */

export function InvestmentsTab() {
  const tabs: TabItem[] = [
    {
      key: 'investment-summary',
      label: 'Investment Summary',
      content: <InvestmentSummaryTab />,
    },
    {
      key: 'investment-processing',
      label: 'Investment Processing',
      content: <InvestmentProcessingTab />,
    },
    {
      key: 'market-queue',
      label: 'Market Queue',
      content: <MarketQueueTab />,
    },
    {
      key: 'roundup-ledger',
      label: 'Round-Up Ledger',
      content: <RoundUpLedgerTab />,
    },
  ];

  return <Tabs tabs={tabs} defaultTab="investment-summary" />;
}

export default InvestmentsTab;
