import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Input } from '@/components/ui';
import type { Column } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TransactionRow = Database['public']['Tables']['transactions']['Row'];

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

interface KpiTotals {
  count: number;
  volume: number;
  roundUps: number;
  fees: number;
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
/*  Currency formatter                                                 */
/* ------------------------------------------------------------------ */

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

const columns: Column<TransactionRow>[] = [
  { key: 'id', header: 'ID', sortable: true, width: '70px' },
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    width: '120px',
    render: (row) => formatDate(row.date),
  },
  { key: 'user_id', header: 'User', sortable: true, width: '80px' },
  { key: 'merchant', header: 'Merchant', sortable: true },
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
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TransactionsAdminTab() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

        setTransactions(data ?? []);
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
      }),
      { count: 0, volume: 0, roundUps: 0, fees: 0 },
    );
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Transactions" value={kpis.count.toLocaleString()} accent="purple" />
        <KpiCard label="Total Volume" value={usd(kpis.volume)} accent="blue" />
        <KpiCard label="Total Round-Ups" value={usd(kpis.roundUps)} accent="teal" />
        <KpiCard label="Total Fees" value={usd(kpis.fees)} accent="pink" />
      </div>

      {/* Filters */}
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
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard padding="0">
        <Table<TransactionRow>
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No transactions found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

export default TransactionsAdminTab;
