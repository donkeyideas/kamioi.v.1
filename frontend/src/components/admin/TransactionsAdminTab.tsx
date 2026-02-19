import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Input, Select, Modal } from '@/components/ui';
import type { Column, SelectOption } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

interface KpiTotals {
  count: number;
  volume: number;
  roundUps: number;
  fees: number;
  completed: number;
  failed: number;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

const DASHBOARD_TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Dashboard Types' },
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'business', label: 'Business' },
];

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

/* ------------------------------------------------------------------ */
/*  Filter pill styles                                                 */
/* ------------------------------------------------------------------ */

const pillBase: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  padding: '6px 16px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(248,250,252,0.5)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
};

const pillActive: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))',
  borderColor: 'rgba(124,58,237,0.4)',
  color: '#F8FAFC',
  fontWeight: 600,
};

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function usd(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Modal detail row                                                   */
/* ------------------------------------------------------------------ */

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(248,250,252,0.5)',
  fontWeight: 500,
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#F8FAFC',
  fontWeight: 600,
  textAlign: 'right',
};

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={detailRowStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <span style={detailValueStyle}>{value ?? '--'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

function buildColumns(): Column<TransactionRow>[] {
  return [
    { key: 'id', header: 'ID', sortable: true, width: '70px' },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      width: '120px',
      render: (row) => formatDate(row.date),
    },
    { key: 'user_id', header: 'User ID', sortable: true, width: '80px' },
    { key: 'merchant', header: 'Merchant', sortable: true },
    { key: 'category', header: 'Category', sortable: true, width: '110px' },
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
      key: 'fee',
      header: 'Fee',
      sortable: true,
      align: 'right',
      width: '80px',
      render: (row) => usd(row.fee),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (row) => (
        <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'ticker',
      header: 'Ticker',
      sortable: true,
      width: '90px',
      render: (row) => row.ticker ?? '--',
    },
    {
      key: 'transaction_type',
      header: 'Type',
      sortable: true,
      width: '100px',
      render: (row) => row.transaction_type ?? '--',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  CSV Export                                                         */
/* ------------------------------------------------------------------ */

function exportCsv(rows: TransactionRow[]): void {
  const headers = [
    'ID', 'Date', 'User ID', 'Merchant', 'Category', 'Amount', 'Round-Up',
    'Fee', 'Status', 'Ticker', 'Shares', 'Price Per Share', 'Stock Price',
    'Transaction Type', 'Created At',
  ];

  const csvRows = rows.map((r) => [
    r.id,
    r.date,
    r.user_id,
    `"${(r.merchant ?? '').replace(/"/g, '""')}"`,
    `"${(r.category ?? '').replace(/"/g, '""')}"`,
    r.amount,
    r.round_up,
    r.fee,
    r.status,
    r.ticker ?? '',
    r.shares ?? '',
    r.price_per_share ?? '',
    r.stock_price ?? '',
    r.transaction_type ?? '',
    r.created_at,
  ]);

  const csvString = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TransactionsAdminTab() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dashboardType, setDashboardType] = useState('all');
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  const columns = useMemo(() => buildColumns(), []);

  /* Fetch all transactions */
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch transactions:', error.message);
          setTransactions([]);
          return;
        }

        setTransactions((data as TransactionRow[]) ?? []);
      } catch (err) {
        console.error('Unexpected error fetching transactions:', err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  /* Derived: filtered list */
  const filtered = useMemo(() => {
    let list = transactions;

    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.merchant.toLowerCase().includes(q));
    }

    return list;
  }, [transactions, statusFilter, search]);

  /* Derived: KPI totals from filtered set */
  const kpis = useMemo<KpiTotals>(() => {
    return filtered.reduce<KpiTotals>(
      (acc, t) => ({
        count: acc.count + 1,
        volume: acc.volume + t.amount,
        roundUps: acc.roundUps + t.round_up,
        fees: acc.fees + t.fee,
        completed: acc.completed + (t.status === 'completed' ? 1 : 0),
        failed: acc.failed + (t.status === 'failed' ? 1 : 0),
      }),
      { count: 0, volume: 0, roundUps: 0, fees: 0, completed: 0, failed: 0 },
    );
  }, [filtered]);

  const handleRowClick = useCallback((row: TransactionRow) => {
    setSelectedTx(row);
  }, []);

  const handleExport = useCallback(() => {
    exportCsv(filtered);
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filter Bar */}
      <GlassCard padding="20px">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ flex: '1 1 260px', maxWidth: '360px' }}>
            <Input
              placeholder="Search by merchant name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf.key}
                style={{
                  ...pillBase,
                  ...(statusFilter === sf.key ? pillActive : {}),
                }}
                onClick={() => setStatusFilter(sf.key)}
              >
                {sf.label}
              </button>
            ))}
          </div>

          <div style={{ width: '180px' }}>
            <Select
              options={DASHBOARD_TYPE_OPTIONS}
              value={dashboardType}
              onChange={(e) => setDashboardType(e.target.value)}
            />
          </div>

          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </GlassCard>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Transactions" value={kpis.count.toLocaleString()} accent="purple" />
        <KpiCard label="Total Volume" value={usd(kpis.volume)} accent="blue" />
        <KpiCard label="Total Round-Ups" value={usd(kpis.roundUps)} accent="teal" />
        <KpiCard label="Total Fees" value={usd(kpis.fees)} accent="pink" />
        <KpiCard label="Completed" value={kpis.completed.toLocaleString()} accent="teal" />
        <KpiCard label="Failed" value={kpis.failed.toLocaleString()} accent="pink" />
      </div>

      {/* Table */}
      <GlassCard padding="0">
        <Table<TransactionRow>
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No transactions found"
          pageSize={20}
          rowKey={(row) => row.id}
          onRowClick={handleRowClick}
        />
      </GlassCard>

      {/* Transaction Detail Modal */}
      <Modal
        open={selectedTx !== null}
        onClose={() => setSelectedTx(null)}
        title="Transaction Detail"
        size="lg"
      >
        {selectedTx && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <DetailRow label="ID" value={selectedTx.id} />
            <DetailRow label="User ID" value={selectedTx.user_id} />
            <DetailRow label="Date" value={formatDateTime(selectedTx.date)} />
            <DetailRow label="Merchant" value={selectedTx.merchant} />
            <DetailRow label="Category" value={selectedTx.category} />
            <DetailRow label="Amount" value={usd(selectedTx.amount)} />
            <DetailRow label="Round-Up" value={usd(selectedTx.round_up)} />
            <DetailRow label="Total Debit" value={usd(selectedTx.amount + selectedTx.round_up)} />
            <DetailRow label="Ticker" value={selectedTx.ticker} />
            <DetailRow label="Shares" value={selectedTx.shares} />
            <DetailRow label="Price Per Share" value={selectedTx.price_per_share != null ? usd(selectedTx.price_per_share) : null} />
            <DetailRow label="Stock Price" value={selectedTx.stock_price != null ? usd(selectedTx.stock_price) : null} />
            <DetailRow label="Fee" value={usd(selectedTx.fee)} />
            <DetailRow label="Status" value={selectedTx.status} />
            <DetailRow label="Transaction Type" value={selectedTx.transaction_type} />
            <DetailRow label="Created At" value={formatDateTime(selectedTx.created_at)} />
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedTx(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
