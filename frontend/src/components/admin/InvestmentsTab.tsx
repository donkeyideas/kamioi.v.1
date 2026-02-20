import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Select } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import AreaChart from '@/components/charts/AreaChart';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import { fetchStockPrices, type StockQuote } from '@/services/stockPrices';
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

interface InvestmentDisplayRow {
  id: number;
  accountId: string;
  ticker: string;
  merchant: string;
  amount: number;
  roundUp: number;
  currentPrice: number;
  date: string;
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
  const [rows, setRows] = useState<InvestmentDisplayRow[]>([]);
  const [stockPrices, setStockPrices] = useState<Map<string, StockQuote>>(new Map());
  const [accountFilter, setAccountFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch matched transactions (individual purchases) + users for account IDs
        const [txRes, usersRes] = await Promise.all([
          supabaseAdmin
            .from('transactions')
            .select('id, date, user_id, merchant, ticker, amount, round_up, status')
            .eq('status', 'mapped')
            .not('ticker', 'is', null)
            .order('date', { ascending: false })
            .limit(500),
          supabaseAdmin
            .from('users')
            .select('id, account_id, account_type')
            .limit(500),
        ]);

        if (txRes.error) console.error('Failed to fetch transactions:', txRes.error.message);
        if (usersRes.error) console.error('Failed to fetch users:', usersRes.error.message);

        // Build user_id -> account_id lookup
        const accountMap = new Map<number, string>();
        const accountTypeMap = new Map<number, string>();
        for (const u of (usersRes.data ?? [])) {
          accountTypeMap.set(u.id, u.account_type);
          if (u.account_id) {
            accountMap.set(u.id, u.account_id);
          } else {
            const prefix = u.account_type === 'admin' ? 'A'
              : u.account_type === 'family' ? 'F'
              : u.account_type === 'business' ? 'B'
              : 'I';
            accountMap.set(u.id, prefix + String(u.id).padStart(9, '0'));
          }
        }

        const txData = (txRes.data ?? []).map((tx) => ({
          id: tx.id,
          accountId: accountMap.get(tx.user_id) ?? `I${String(tx.user_id).padStart(9, '0')}`,
          ticker: tx.ticker as string,
          merchant: tx.merchant,
          amount: tx.amount,
          roundUp: tx.round_up,
          currentPrice: 0,
          date: tx.date,
          _accountType: accountTypeMap.get(tx.user_id) ?? 'individual',
        }));

        setRows(txData);

        // Fetch live stock prices for unique tickers
        const tickers = [...new Set(txData.map((t) => t.ticker))];
        if (tickers.length > 0) {
          setPricesLoading(true);
          try {
            const prices = await fetchStockPrices(tickers);
            setStockPrices(prices);
          } catch (err) {
            console.error('Failed to fetch stock prices:', err);
          } finally {
            setPricesLoading(false);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching investment summary:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* Filter by account type using the prefix of account_id */
  const filtered = useMemo(() => {
    if (accountFilter === 'all') return rows;
    const prefixMap: Record<string, string> = { individual: 'I', family: 'F', business: 'B' };
    const prefix = prefixMap[accountFilter];
    if (!prefix) return rows;
    return rows.filter((r) => r.accountId.startsWith(prefix));
  }, [rows, accountFilter]);

  /* Attach live prices */
  const displayRows = useMemo<InvestmentDisplayRow[]>(() => {
    return filtered.map((r) => ({
      ...r,
      currentPrice: stockPrices.get(r.ticker)?.price ?? 0,
    }));
  }, [filtered, stockPrices]);

  /* KPIs */
  const matchedCount = displayRows.length;
  const totalRoundUps = useMemo(
    () => displayRows.reduce((s, r) => s + r.roundUp, 0),
    [displayRows],
  );
  const activeInvestors = useMemo(
    () => new Set(displayRows.map((r) => r.accountId)).size,
    [displayRows],
  );
  const uniqueTickers = useMemo(
    () => new Set(displayRows.map((r) => r.ticker)).size,
    [displayRows],
  );

  /* Chart data -- round-ups by ticker (top 10) */
  const chartData = useMemo<TickerChartItem[]>(() => {
    const tickerMap = new Map<string, number>();
    for (const row of displayRows) {
      tickerMap.set(row.ticker, (tickerMap.get(row.ticker) ?? 0) + row.roundUp);
    }
    return [...tickerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [displayRows]);

  /* Table columns */
  const columns: Column<InvestmentDisplayRow>[] = useMemo(
    () => [
      {
        key: 'ticker',
        header: 'Ticker',
        sortable: true,
        width: '130px',
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CompanyLogo name={row.ticker} size={20} />
            <span style={{ fontWeight: 600 }}>{row.ticker}</span>
          </div>
        ),
      },
      {
        key: 'accountId',
        header: 'Account ID',
        sortable: true,
        width: '140px',
        render: (row) => {
          const prefix = row.accountId[0];
          const color = prefix === 'F' ? '#3B82F6' : prefix === 'B' ? '#06B6D4' : '#A78BFA';
          return <span style={{ fontWeight: 500, color }}>{row.accountId}</span>;
        },
      },
      {
        key: 'merchant',
        header: 'Merchant',
        sortable: true,
        width: '150px',
      },
      {
        key: 'amount',
        header: 'Purchase',
        sortable: true,
        align: 'right',
        width: '110px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'roundUp',
        header: 'Round-Up',
        sortable: true,
        align: 'right',
        width: '110px',
        render: (row) => (
          <span style={{ fontWeight: 600, color: '#7C3AED' }}>{usd(row.roundUp)}</span>
        ),
      },
      {
        key: 'currentPrice',
        header: 'Current Price',
        sortable: true,
        align: 'right',
        width: '130px',
        render: (row) =>
          row.currentPrice > 0 ? (
            usd(row.currentPrice)
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>{pricesLoading ? '...' : '--'}</span>
          ),
      },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        width: '120px',
        render: (row) => formatDate(row.date),
      },
    ],
    [pricesLoading],
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
        <KpiCard label="Matched Transactions" value={matchedCount.toLocaleString()} accent="purple" />
        <KpiCard label="Total Round-Ups" value={usd(totalRoundUps)} accent="teal" />
        <KpiCard label="Active Investors" value={activeInvestors.toLocaleString()} accent="blue" />
        <KpiCard label="Unique Tickers" value={uniqueTickers.toLocaleString()} accent="teal" />
      </div>

      {/* Matched transactions table */}
      <GlassCard padding="0">
        <Table<InvestmentDisplayRow>
          columns={columns}
          data={displayRows}
          loading={loading}
          emptyMessage="No matched transactions found"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Bar chart -- round-ups by ticker top 10 */}
      <BarChart<TickerChartItem>
        data={chartData}
        dataKey="value"
        xKey="name"
        title="Round-Up Investment by Ticker (Top 10)"
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
      const { data, error } = await supabaseAdmin
        .from('market_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

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
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select(
          'id, date, user_id, merchant, ticker, amount, round_up, shares, status',
        )
        .not('ticker', 'is', null)
        .eq('status', 'mapped')
        .order('date', { ascending: false })
        .limit(500);

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

      const { error } = await supabaseAdmin.from('market_queue').insert(inserts);

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
        const { data, error } = await supabaseAdmin
          .from('market_queue')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

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
        const { data, error } = await supabaseAdmin
          .from('roundup_ledger')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

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
