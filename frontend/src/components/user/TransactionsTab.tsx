import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard, Table, Badge, Input, KpiCard } from '@/components/ui';
import type { Column } from '@/components/ui';

/* ---- Types ---- */

interface Transaction {
  id: number;
  user_id: number;
  date: string;
  merchant: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  investable: boolean | null;
  round_up: number | null;
  total_debit: number | null;
  ticker: string | null;
  shares: number | null;
  price_per_share: number | null;
  stock_price: number | null;
  status: 'pending' | 'completed' | 'failed';
  fee: number | null;
  transaction_type: string | null;
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

/* ---- Formatting helpers ---- */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/* ---- Inline styles ---- */

const filtersRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '12px',
};

const pillGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
};

const pillBaseStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  padding: '6px 14px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(248,250,252,0.5)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
  whiteSpace: 'nowrap',
};

const pillActiveStyle: React.CSSProperties = {
  ...pillBaseStyle,
  background: 'rgba(124,58,237,0.2)',
  borderColor: 'rgba(124,58,237,0.4)',
  color: '#A78BFA',
  fontWeight: 600,
};

const kpiRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '20px',
};

const sortToggleStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(248,250,252,0.5)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
  whiteSpace: 'nowrap',
  marginLeft: 'auto',
};

/* ---- Table columns ---- */

const columns: Column<Transaction>[] = [
  {
    key: 'date',
    header: 'Date',
    width: '130px',
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.7)' }}>
        {row.date ? formatDate(row.date) : '--'}
      </span>
    ),
  },
  {
    key: 'merchant',
    header: 'Merchant',
    render: (row) => (
      <span style={{ fontWeight: 600, color: '#F8FAFC' }}>
        {row.merchant ?? '--'}
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    render: (row) =>
      row.category ? (
        <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.4)' }}>
          {row.category}
        </span>
      ) : null,
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    width: '110px',
    render: (row) => (
      <span style={{ fontWeight: 500 }}>
        {row.amount != null ? formatCurrency(row.amount) : '--'}
      </span>
    ),
  },
  {
    key: 'round_up',
    header: 'Round-Up',
    align: 'right',
    width: '100px',
    render: (row) =>
      row.round_up != null ? (
        <span style={{ fontWeight: 500, color: '#06B6D4' }}>
          {formatCurrency(row.round_up)}
        </span>
      ) : (
        <span style={{ color: 'rgba(248,250,252,0.25)' }}>--</span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (row) => {
      const variantMap: Record<Transaction['status'], 'success' | 'warning' | 'error'> = {
        completed: 'success',
        pending: 'warning',
        failed: 'error',
      };
      return (
        <Badge variant={variantMap[row.status]}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      );
    },
  },
  {
    key: 'ticker',
    header: 'Ticker',
    width: '90px',
    render: (row) =>
      row.ticker ? (
        <span style={{ fontWeight: 600, color: '#A78BFA', fontSize: '13px' }}>
          {row.ticker}
        </span>
      ) : null,
  },
];

/* ---- Component ---- */

export function TransactionsTab() {
  const { profile } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);

  /* ---- Data fetching ---- */

  useEffect(() => {
    async function fetchTransactions() {
      if (!profile?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false });
      setTransactions((data as Transaction[] | null) ?? []);
      setLoading(false);
    }
    fetchTransactions();
  }, [profile?.id]);

  /* ---- Derived data ---- */

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of transactions) {
      if (t.category) cats.add(t.category);
    }
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;

    // Search by merchant
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) => t.merchant && t.merchant.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Sort by date
    result = [...result].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortNewest ? db - da : da - db;
    });

    return result;
  }, [transactions, search, statusFilter, categoryFilter, sortNewest]);

  /* ---- KPI calculations ---- */

  const totalTransactions = filtered.length;

  const totalInvested = useMemo(
    () =>
      filtered
        .filter((t) => t.status === 'completed' && t.amount != null)
        .reduce((sum, t) => sum + (t.amount ?? 0), 0),
    [filtered],
  );

  const totalRoundUps = useMemo(
    () =>
      filtered
        .filter((t) => t.round_up != null)
        .reduce((sum, t) => sum + (t.round_up ?? 0), 0),
    [filtered],
  );

  /* ---- Status pill options ---- */

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
  ];

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters bar */}
      <GlassCard padding="16px 20px">
        <div style={filtersRowStyle}>
          {/* Search */}
          <div style={{ flex: '1 1 220px', maxWidth: '320px' }}>
            <Input
              placeholder="Search by merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>

          {/* Status pills */}
          <div style={pillGroupStyle}>
            {statusOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                style={statusFilter === opt.key ? pillActiveStyle : pillBaseStyle}
                onClick={() => setStatusFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {uniqueCategories.length > 0 && (
            <div style={pillGroupStyle}>
              <button
                type="button"
                style={categoryFilter === 'all' ? pillActiveStyle : pillBaseStyle}
                onClick={() => setCategoryFilter('all')}
              >
                All Categories
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  style={categoryFilter === cat ? pillActiveStyle : pillBaseStyle}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Date sort toggle */}
          <button
            type="button"
            style={sortToggleStyle}
            onClick={() => setSortNewest((prev) => !prev)}
          >
            {sortNewest ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </GlassCard>

      {/* KPI summary row */}
      <div style={kpiRowStyle}>
        <KpiCard
          label="Total Transactions"
          value={totalTransactions.toLocaleString()}
          accent="purple"
        />
        <KpiCard
          label="Total Invested"
          value={formatCurrency(totalInvested)}
          accent="blue"
        />
        <KpiCard
          label="Total Round-Ups"
          value={formatCurrency(totalRoundUps)}
          accent="teal"
        />
      </div>

      {/* Transactions table */}
      <GlassCard padding="0">
        <Table<Transaction>
          columns={columns}
          data={filtered}
          loading={loading}
          pageSize={15}
          emptyMessage="No transactions found"
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

export default TransactionsTab;
