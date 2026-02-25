import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useUserId } from '@/hooks/useUserId';
import { GlassCard, Table, Badge, Input, KpiCard, Button, Select, Modal } from '@/components/ui';
import type { Column } from '@/components/ui';
import { COMPANY_LOOKUP, CompanyLogo, formatMerchantName } from '@/components/common/CompanyLogo';

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
  status: 'pending' | 'mapped' | 'completed' | 'failed';
  fee: number | null;
  transaction_type: string | null;
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'mapped' | 'completed' | 'failed';

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
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-input)',
  color: 'var(--text-muted)',
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
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-input)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
  whiteSpace: 'nowrap',
  marginLeft: 'auto',
};

/* ---- Company logo (shared utility) ---- */
// Imported from @/components/common/CompanyLogo

/* ---- Component ---- */

export function TransactionsTab() {
  const { userId, loading: userLoading } = useUserId();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);

  /* ---- Mapping modal state ---- */
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapTransaction, setMapTransaction] = useState<Transaction | null>(null);
  const [mapForm, setMapForm] = useState({ ticker: '', companyName: '', notes: '' });
  const [mapSubmitting, setMapSubmitting] = useState(false);
  const [mapSuccess, setMapSuccess] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /* Build company lookup: merchant name → ticker */
  const companyOptions = useMemo(() => {
    const merchantEntries: { name: string; domain: string }[] = [];
    const tickerByDomain = new Map<string, string>();
    for (const [key, info] of Object.entries(COMPANY_LOOKUP)) {
      if (key === key.toUpperCase() && key.length <= 5) {
        tickerByDomain.set(info.domain, key);
      } else {
        merchantEntries.push({ name: key, domain: info.domain });
      }
    }
    return merchantEntries
      .map(m => ({ name: m.name, ticker: tickerByDomain.get(m.domain) ?? '' }))
      .filter(m => m.ticker);
  }, []);

  const companySuggestions = useMemo(() => {
    const q = mapForm.companyName.trim().toLowerCase();
    if (q.length < 2) return [];
    return companyOptions.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [mapForm.companyName, companyOptions]);

  /* ---- Mapping submit handler ---- */
  const handleMapSubmit = useCallback(async () => {
    if (!mapTransaction || !mapForm.ticker.trim()) return;
    setMapSubmitting(true);
    try {
      const { error } = await supabaseAdmin.from('llm_mappings').insert({
        merchant_name: mapTransaction.merchant ?? '',
        ticker: mapForm.ticker.trim().toUpperCase(),
        company_name: mapForm.companyName.trim() || null,
        category: 'user_submitted',
        status: 'pending',
        user_id: userId ?? null,
        transaction_id: mapTransaction.id,
        confidence: null,
        ai_processed: false,
        admin_approved: null,
      });
      if (error) throw error;

      // Update transaction status to 'pending' so the Map button disappears
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'pending' })
        .eq('id', mapTransaction.id);

      // Update local state immediately
      const txId = mapTransaction.id;
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'pending' as const } : t));

      setMapSuccess(`Mapping submitted for "${mapTransaction.merchant}" → ${mapForm.ticker.trim().toUpperCase()}`);
      setTimeout(() => {
        setMapModalOpen(false);
        setMapTransaction(null);
        setMapForm({ ticker: '', companyName: '', notes: '' });
        setMapSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit mapping:', err);
    } finally {
      setMapSubmitting(false);
    }
  }, [mapTransaction, mapForm, userId]);

  /* ---- Table columns ---- */
  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: 'Date',
      width: '120px',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {row.date ? formatDate(row.date) : '--'}
        </span>
      ),
    },
    {
      key: 'merchant',
      header: 'Merchant',
      render: (row) => {
        const info = row.merchant ? COMPANY_LOOKUP[row.merchant] : null;
        const content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {row.merchant && <CompanyLogo name={row.merchant} size={22} />}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {row.merchant ? formatMerchantName(row.merchant) : '--'}
            </span>
          </div>
        );
        if (info) {
          return (
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title={`Visit ${row.merchant}`}
            >
              {content}
            </a>
          );
        }
        return content;
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) =>
        row.category ? (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
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
          <span style={{ color: 'var(--text-muted)' }}>--</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => {
        const variantMap: Record<Transaction['status'], 'success' | 'warning' | 'error' | 'default'> = {
          completed: 'success',
          mapped: 'default',
          pending: 'warning',
          failed: 'error',
        };
        return (
          <Badge variant={variantMap[row.status] ?? 'default'}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'ticker',
      header: 'Ticker',
      width: '110px',
      render: (row) => {
        if (!row.ticker) return null;
        const info = COMPANY_LOOKUP[row.ticker];
        const content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CompanyLogo name={row.ticker} size={18} />
            <span style={{ fontWeight: 600, color: '#A78BFA', fontSize: '13px' }}>
              {row.ticker}
            </span>
          </div>
        );
        if (info) {
          return (
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title={`Visit ${row.ticker} website`}
            >
              {content}
            </a>
          );
        }
        return content;
      },
    },
    {
      key: 'action',
      header: '',
      width: '90px',
      render: (row) => row.status === 'failed' ? (
        <Button variant="secondary" size="sm" onClick={() => { setMapTransaction(row); setMapForm({ ticker: '', companyName: '', notes: '' }); setMapModalOpen(true); }}>
          Map
        </Button>
      ) : null,
    },
  ];

  /* ---- Data fetching ---- */

  const fetchTransactions = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(500);
    setTransactions((data as Transaction[] | null) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userLoading) fetchTransactions();
  }, [fetchTransactions, userLoading]);

  // Listen for custom bankSyncComplete events to auto-refresh
  useEffect(() => {
    const handleRefresh = () => { fetchTransactions(); };
    window.addEventListener('bankSyncComplete', handleRefresh);
    return () => window.removeEventListener('bankSyncComplete', handleRefresh);
  }, [fetchTransactions]);

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

  const kpis = useMemo(() => {
    let count = 0;
    let totalSpent = 0;
    let totalRoundUps = 0;
    let invested = 0;

    for (const t of filtered) {
      count++;
      totalSpent += t.amount ?? 0;
      totalRoundUps += t.round_up ?? 0;
      if (t.status === 'completed') {
        invested += t.round_up ?? 0;
      }
    }

    return { count, totalSpent, totalRoundUps, invested  };
  }, [filtered]);

  /* ---- CSV Export ---- */

  const handleExport = useCallback(() => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'Merchant', 'Amount', 'Round-Up', 'Category', 'Ticker', 'Status'];
    const rows = filtered.map((t) => [
      t.date,
      `"${(t.merchant ?? '').replace(/"/g, '""')}"`,
      t.amount?.toFixed(2) ?? '',
      t.round_up?.toFixed(2) ?? '',
      t.category ?? '',
      t.ticker ?? '',
      t.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  /* ---- Status pill options ---- */

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'mapped', label: 'Mapped' },
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
            <div style={{ width: '180px' }}>
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
                ]}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
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

          {/* Export CSV */}
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </GlassCard>

      {/* KPI summary row */}
      <div style={kpiRowStyle}>
        <KpiCard
          label="Total Transactions"
          value={kpis.count.toLocaleString()}
          accent="purple"
        />
        <KpiCard
          label="Total Spent"
          value={formatCurrency(kpis.totalSpent)}
          accent="blue"
        />
        <KpiCard
          label="Total Round-Ups"
          value={formatCurrency(kpis.totalRoundUps)}
          accent="teal"
        />
        <KpiCard
          label="Total Invested"
          value={formatCurrency(kpis.invested)}
          accent="pink"
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

      {/* Merchant Mapping Modal */}
      <Modal
        open={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false);
          setMapTransaction(null);
          setMapForm({ ticker: '', companyName: '', notes: '' });
          setMapSuccess(null);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Submit Merchant Mapping
          </h3>

          {mapSuccess ? (
            <div style={{
              padding: '16px',
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: '10px',
              color: '#34D399',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
            }}>
              {mapSuccess}
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Merchant
                </label>
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}>
                  {mapTransaction?.merchant ?? '--'}
                </div>
              </div>

              {/* Company Name with autocomplete */}
              <div>
                <Input
                  label="Company Name"
                  placeholder="Start typing a company name..."
                  value={mapForm.companyName}
                  onChange={(e) => {
                    setMapForm(prev => ({ ...prev, companyName: e.target.value, ticker: '' }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && companySuggestions.length > 0 && (
                  <div style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    marginTop: '4px',
                  }}>
                    {companySuggestions.map(c => (
                      <div
                        key={c.ticker}
                        onMouseDown={() => {
                          setMapForm(prev => ({ ...prev, companyName: c.name, ticker: c.ticker }));
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderBottom: '1px solid var(--border-divider)',
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <CompanyLogo name={c.name} size={24} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{c.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#A78BFA', fontWeight: 600 }}>{c.ticker}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Ticker (read-only, auto-populated) */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Stock Ticker
                </label>
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '40px',
                }}>
                  {mapForm.ticker ? (
                    <>
                      <CompanyLogo name={mapForm.ticker} size={22} />
                      <span style={{ fontWeight: 600, color: '#A78BFA', fontSize: '14px' }}>{mapForm.ticker}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a company above</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Notes
                </label>
                <textarea
                  placeholder="Explain what this merchant is..."
                  value={mapForm.notes}
                  onChange={(e) => setMapForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMapModalOpen(false);
                    setMapTransaction(null);
                    setMapForm({ ticker: '', companyName: '', notes: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={mapSubmitting}
                  disabled={!mapForm.ticker.trim()}
                  onClick={handleMapSubmit}
                >
                  Submit Mapping
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default TransactionsTab;
