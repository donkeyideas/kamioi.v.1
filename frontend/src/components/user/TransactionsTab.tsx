import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useUserId } from '@/hooks/useUserId';
import { GlassCard, Badge, Input, KpiCard, Button, Select, Modal } from '@/components/ui';
import { COMPANY_LOOKUP, CompanyLogo, formatMerchantName } from '@/components/common/CompanyLogo';

/* ---- Types ---- */

interface ReceiptParsedItem {
  name: string;
  brand?: string;
  brandSymbol?: string;
  amount: number;
  brandConfidence?: number;
}

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
  receipt_id: number | null;
  created_at: string;
  receipts?: { parsed_data: { items?: ReceiptParsedItem[]; retailer?: { name: string; stockSymbol?: string }; totalAmount?: number } | null; allocation_data: unknown | null } | null;
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

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  /* ---- Table helpers ---- */
  const variantMap: Record<Transaction['status'], 'success' | 'warning' | 'error' | 'default'> = {
    completed: 'success',
    mapped: 'default',
    pending: 'warning',
    failed: 'error',
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    background: 'var(--surface-row-hover)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    borderBottom: '1px solid var(--border-divider)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-divider)',
  };

  const PAGE_SIZE = 15;

  /* ---- Data fetching ---- */

  const fetchTransactions = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabaseAdmin
      .from('transactions')
      .select('*, receipts(parsed_data, allocation_data)')
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>No transactions found</div>
        ) : (
          <>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '120px' }}>Date</th>
                    <th style={thStyle}>Merchant</th>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '110px' }}>Amount</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '100px' }}>Round-Up</th>
                    <th style={{ ...thStyle, width: '120px' }}>Status</th>
                    <th style={{ ...thStyle, width: '110px' }}>Ticker</th>
                    <th style={{ ...thStyle, width: '90px' }}></th>
                  </tr>
                </thead>
                {(() => {
                  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                  const safePage = Math.min(page, totalPages - 1);
                  const start = safePage * PAGE_SIZE;
                  const end = Math.min(start + PAGE_SIZE, filtered.length);
                  const pageData = filtered.slice(start, end);

                  return pageData.map(tx => {
                    const isReceipt = tx.transaction_type === 'receipt' && tx.receipts?.parsed_data?.items && tx.receipts.parsed_data.items.length > 0;
                    const isExpanded = expandedIds.has(tx.id);
                    const receiptItems = isReceipt ? tx.receipts!.parsed_data!.items! : [];

                    return (
                      <tbody key={tx.id}>
                        {/* Parent row */}
                        <tr
                          style={{
                            cursor: isReceipt ? 'pointer' : 'default',
                            transition: 'background 200ms ease',
                            background: isReceipt && isExpanded ? 'rgba(124,58,237,0.06)' : 'transparent',
                          }}
                          onClick={isReceipt ? () => toggleExpand(tx.id) : undefined}
                          onMouseEnter={(e) => { e.currentTarget.style.background = isReceipt && isExpanded ? 'rgba(124,58,237,0.08)' : 'var(--surface-row-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isReceipt && isExpanded ? 'rgba(124,58,237,0.06)' : 'transparent'; }}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tx.date ? formatDate(tx.date) : '--'}</span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isReceipt && (
                                <svg
                                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                                  stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              )}
                              {tx.merchant && <CompanyLogo name={tx.merchant} size={22} />}
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {tx.merchant ? formatMerchantName(tx.merchant) : '--'}
                              </span>
                              {isReceipt && (
                                <span style={{
                                  fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                                  background: 'rgba(124,58,237,0.15)', color: '#A78BFA',
                                }}>
                                  {receiptItems.length} items
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {tx.category ? <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{tx.category}</span> : null}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <span style={{ fontWeight: 500 }}>{tx.amount != null ? formatCurrency(tx.amount) : '--'}</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {tx.round_up != null ? (
                              <span style={{ fontWeight: 500, color: '#06B6D4' }}>{formatCurrency(tx.round_up)}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>--</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <Badge variant={variantMap[tx.status] ?? 'default'}>
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </Badge>
                          </td>
                          <td style={tdStyle}>
                            {tx.ticker ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CompanyLogo name={tx.ticker} size={18} />
                                <span style={{ fontWeight: 600, color: '#A78BFA', fontSize: '13px' }}>{tx.ticker}</span>
                              </div>
                            ) : null}
                          </td>
                          <td style={tdStyle}>
                            {tx.status === 'failed' ? (
                              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setMapTransaction(tx); setMapForm({ ticker: '', companyName: '', notes: '' }); setMapModalOpen(true); }}>
                                Map
                              </Button>
                            ) : null}
                          </td>
                        </tr>

                        {/* Sub-item rows (receipt items) */}
                        {isReceipt && isExpanded && receiptItems.map((item, i) => {
                          const mappedTotal = receiptItems.filter(si => si.brandSymbol).reduce((s, si) => s + si.amount, 0);
                          const itemRoundUp = item.brandSymbol && mappedTotal > 0 && tx.round_up ? Math.round(tx.round_up * (item.amount / mappedTotal) * 100) / 100 : 0;
                          const borderBot = i === receiptItems.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)';
                          return (
                            <tr
                              key={`${tx.id}-sub-${i}`}
                              style={{ background: i % 2 === 0 ? 'rgba(124,58,237,0.03)' : 'rgba(124,58,237,0.06)' }}
                            >
                              <td style={{ ...tdStyle, borderBottom: borderBot }}>{/* empty */}</td>
                              <td style={{ ...tdStyle, borderBottom: borderBot }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px' }}>
                                  {item.brandSymbol ? (
                                    <CompanyLogo name={item.brandSymbol} size={18} />
                                  ) : (
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                                  )}
                                  <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ ...tdStyle, borderBottom: borderBot }}>
                                {item.brand && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.brand}</span>}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right', borderBottom: borderBot }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatCurrency(item.amount)}</span>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right', borderBottom: borderBot }}>
                                {itemRoundUp > 0 ? (
                                  <span style={{ color: '#06B6D4', fontWeight: 600, fontSize: '12px' }}>{formatCurrency(itemRoundUp)}</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>--</span>
                                )}
                              </td>
                              <td style={{ ...tdStyle, borderBottom: borderBot }}>
                                {item.brandSymbol ? (
                                  <Badge variant="success">mapped</Badge>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>no stock</span>
                                )}
                              </td>
                              <td style={{ ...tdStyle, borderBottom: borderBot }}>
                                {item.brandSymbol ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <CompanyLogo name={item.brandSymbol} size={16} />
                                    <span style={{ fontWeight: 600, color: '#A78BFA', fontSize: '12px' }}>{item.brandSymbol}</span>
                                  </div>
                                ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>--</span>}
                              </td>
                              <td style={{ ...tdStyle, borderBottom: borderBot }}>{/* empty */}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  });
                })()}
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (() => {
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(page, totalPages - 1);
              const start = safePage * PAGE_SIZE;
              const end = Math.min(start + PAGE_SIZE, filtered.length);
              return (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)',
                }}>
                  <span>Showing {start + 1}-{end} of {filtered.length}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{
                        fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
                        padding: '6px 14px', borderRadius: '6px',
                        border: '1px solid var(--border-subtle)', background: 'var(--surface-input)',
                        color: 'var(--text-secondary)', cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                        opacity: safePage === 0 ? 0.4 : 1,
                      }}
                      disabled={safePage === 0}
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      style={{
                        fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
                        padding: '6px 14px', borderRadius: '6px',
                        border: '1px solid var(--border-subtle)', background: 'var(--surface-input)',
                        color: 'var(--text-secondary)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                        opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                      }}
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}
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
