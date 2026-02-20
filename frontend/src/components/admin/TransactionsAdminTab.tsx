import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Input, Select, Modal } from '@/components/ui';
import type { Column, SelectOption } from '@/components/ui';
import { COMPANY_LOOKUP, CompanyLogo, CompanyLink } from '@/components/common/CompanyLogo';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TransactionRow {
  id: number;
  user_id: number;
  account_id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  status: 'pending' | 'mapped' | 'completed' | 'failed';
  round_up: number;
  ticker: string | null;
  shares: number | null;
  price_per_share: number | null;
  stock_price: number | null;
  transaction_type: string | null;
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'mapped' | 'completed' | 'failed';

interface KpiTotals {
  count: number;
  totalSpent: number;
  roundUps: number;
  invested: number;
  mapped: number;
  completed: number;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'mapped', label: 'Mapped' },
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
    case 'mapped':
      return 'default';
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
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-input)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
};

const pillActive: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))',
  borderColor: 'rgba(124,58,237,0.4)',
  color: 'var(--text-primary)',
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
  borderBottom: '1px solid var(--border-divider)',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  fontWeight: 500,
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-primary)',
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
    {
      key: 'account_id',
      header: 'Account ID',
      sortable: true,
      width: '130px',
      render: (row) => {
        const prefix = row.account_id?.[0] ?? 'I'
        const prefixColor = prefix === 'F' ? '#3B82F6' : prefix === 'B' ? '#06B6D4' : prefix === 'A' ? '#EC4899' : '#A78BFA'
        return (
          <span style={{ fontWeight: 500, fontSize: '13px', color: prefixColor }}>
            {row.account_id}
          </span>
        )
      },
    },
    {
      key: 'merchant',
      header: 'Merchant',
      sortable: true,
      render: (row) => {
        const content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {row.merchant && <CompanyLogo name={row.merchant} size={22} />}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {row.merchant ?? '--'}
            </span>
          </div>
        );
        if (row.merchant && COMPANY_LOOKUP[row.merchant]) {
          return <CompanyLink name={row.merchant}>{content}</CompanyLink>;
        }
        return content;
      },
    },
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
      width: '110px',
      render: (row) => {
        if (!row.ticker) return <span style={{ color: 'var(--text-muted)' }}>--</span>;
        const content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CompanyLogo name={row.ticker} size={18} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.ticker}</span>
          </div>
        );
        if (COMPANY_LOOKUP[row.ticker]) {
          return <CompanyLink name={row.ticker}>{content}</CompanyLink>;
        }
        return content;
      },
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
    'ID', 'Date', 'Account ID', 'Merchant', 'Category', 'Amount', 'Round-Up',
    'Status', 'Ticker', 'Shares', 'Price Per Share', 'Stock Price',
    'Transaction Type', 'Created At',
  ];

  const csvRows = rows.map((r) => [
    r.id,
    r.date,
    r.account_id,
    `"${(r.merchant ?? '').replace(/"/g, '""')}"`,
    `"${(r.category ?? '').replace(/"/g, '""')}"`,
    r.amount,
    r.round_up,
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

  /* Fetch all transactions + user account_ids + family/business membership */
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      try {
        const [txRes, usersRes, familyMembersRes, businessMembersRes] = await Promise.all([
          supabaseAdmin
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500),
          supabaseAdmin
            .from('users')
            .select('id, account_id, account_type')
            .limit(500),
          supabaseAdmin
            .from('family_members')
            .select('user_id, family_id')
            .limit(500),
          supabaseAdmin
            .from('business_members')
            .select('user_id, business_id')
            .limit(500),
        ]);

        if (txRes.error) {
          console.error('Failed to fetch transactions:', txRes.error.message);
          setTransactions([]);
          return;
        }

        // Build lookup sets for family/business membership
        const familyUserIds = new Set((familyMembersRes.data ?? []).map(fm => fm.user_id as number));
        const businessUserIds = new Set((businessMembersRes.data ?? []).map(bm => bm.user_id as number));

        // Build user_id -> account_id lookup (prefer family > business > individual)
        const accountMap = new Map<number, string>();
        for (const u of (usersRes.data ?? [])) {
          if (u.account_id) {
            accountMap.set(u.id, u.account_id);
          } else {
            const prefix = u.account_type === 'admin' ? 'A'
              : familyUserIds.has(u.id) ? 'F'
              : businessUserIds.has(u.id) ? 'B'
              : 'I';
            accountMap.set(u.id, prefix + String(u.id).padStart(9, '0'));
          }
        }

        const rows = ((txRes.data ?? []) as Omit<TransactionRow, 'account_id'>[]).map(tx => ({
          ...tx,
          account_id: accountMap.get(tx.user_id) ?? `I${String(tx.user_id).padStart(9, '0')}`,
        }));

        setTransactions(rows);
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

    if (dashboardType !== 'all') {
      const prefixMap: Record<string, string> = { individual: 'I', family: 'F', business: 'B' };
      const prefix = prefixMap[dashboardType];
      if (prefix) {
        list = list.filter((t) => t.account_id?.startsWith(prefix));
      }
    }

    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.merchant.toLowerCase().includes(q));
    }

    return list;
  }, [transactions, statusFilter, dashboardType, search]);

  /* Derived: KPI totals from filtered set */
  const kpis = useMemo<KpiTotals>(() => {
    return filtered.reduce<KpiTotals>(
      (acc, t) => ({
        count: acc.count + 1,
        totalSpent: acc.totalSpent + t.amount,
        roundUps: acc.roundUps + t.round_up,
        invested: acc.invested + (t.status === 'completed' ? t.round_up : 0),
        mapped: acc.mapped + (t.status === 'mapped' ? 1 : 0),
        completed: acc.completed + (t.status === 'completed' ? 1 : 0),
      }),
      { count: 0, totalSpent: 0, roundUps: 0, invested: 0, mapped: 0, completed: 0 },
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        <KpiCard label="Total Transactions" value={kpis.count.toLocaleString()} accent="purple" />
        <KpiCard label="Total Spent" value={usd(kpis.totalSpent)} accent="blue" />
        <KpiCard label="Total Round-Ups" value={usd(kpis.roundUps)} accent="teal" />
        <KpiCard label="Total Invested" value={usd(kpis.invested)} accent="pink" />
        <KpiCard label="Mapped" value={kpis.mapped.toLocaleString()} accent="teal" />
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
            <DetailRow label="Account ID" value={selectedTx.account_id} />
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
