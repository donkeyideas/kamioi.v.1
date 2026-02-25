import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useUserId } from '@/hooks/useUserId';
import { GlassCard, Table, Badge } from '@/components/ui';
import type { Column } from '@/components/ui';
import { CompanyLogo, formatMerchantName } from '@/components/common/CompanyLogo';
import BarChart from '@/components/charts/BarChart';
import { getAiRecommendations } from '@/services/api';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'];

interface Recommendation {
  type: string;
  title: string;
  description: string;
  confidence: number;
}

interface SubmittedMapping {
  id: number;
  merchant_name: string;
  ticker: string | null;
  company_name: string | null;
  confidence: number | null;
  status: string;
  admin_approved: boolean | null;
  ai_processed: boolean;
  created_at: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'insights-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes insights-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  accent: 'purple' | 'blue' | 'teal' | 'pink';
  icon: React.ReactNode;
  children: React.ReactNode;
}

function InsightCard({ title, accent, icon, children }: InsightCardProps) {
  return (
    <GlassCard accent={accent} padding="24px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background:
              accent === 'purple'
                ? 'rgba(124,58,237,0.15)'
                : accent === 'blue'
                  ? 'rgba(59,130,246,0.15)'
                  : accent === 'pink'
                    ? 'rgba(236,72,153,0.15)'
                    : 'rgba(6,182,212,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color:
              accent === 'purple'
                ? '#7C3AED'
                : accent === 'blue'
                  ? '#3B82F6'
                  : accent === 'pink'
                    ? '#EC4899'
                    : '#06B6D4',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
      {children}
    </GlassCard>
  );
}

function SpendingPatternIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
    </svg>
  );
}

function RoundUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function SuggestionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function AiRecommendationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
      <line x1="9" y1="21" x2="15" y2="21" />
      <line x1="10" y1="24" x2="14" y2="24" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  );
}

interface CategorySpend {
  category: string;
  total: number;
}

function MappingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

export function AiInsightsTab() {
  const { userId, loading: userLoading } = useUserId();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data ?? []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userLoading) fetchTransactions();
  }, [fetchTransactions, userLoading]);

  const fetchRecommendations = useCallback(async () => {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const { data, error } = await getAiRecommendations();
      if (error) {
        setRecsError(error);
        return;
      }
      setRecommendations(data?.recommendations ?? []);
    } catch (err) {
      setRecsError(err instanceof Error ? err.message : 'Failed to load AI recommendations.');
    } finally {
      setRecsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const [mappings, setMappings] = useState<SubmittedMapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(true);

  useEffect(() => {
    async function fetchMappings() {
      if (!userId) { setMappingsLoading(false); return; }
      try {
        const { data, error } = await supabaseAdmin
          .from('llm_mappings')
          .select('id, merchant_name, ticker, company_name, confidence, status, admin_approved, ai_processed, created_at')
          .eq('category', 'user_submitted')
          .or(`user_id.eq.${userId},user_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setMappings((data ?? []) as SubmittedMapping[]);
      } catch (err) {
        console.error('Failed to fetch user mappings:', err);
      } finally {
        setMappingsLoading(false);
      }
    }
    if (!userLoading) fetchMappings();
  }, [userId, userLoading]);

  const mappingColumns: Column<SubmittedMapping>[] = useMemo(() => [
    {
      key: 'merchant_name',
      header: 'Merchant',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatMerchantName(row.merchant_name)}</span>
      ),
    },
    {
      key: 'ticker',
      header: 'Ticker',
      sortable: true,
      width: '110px',
      render: (row) => row.ticker ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CompanyLogo name={row.ticker} size={18} />
          <span style={{ fontWeight: 600, color: '#A78BFA' }}>{row.ticker}</span>
        </div>
      ) : <span style={{ color: 'var(--text-muted)' }}>--</span>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      sortable: true,
      width: '110px',
      align: 'right',
      render: (row) => row.confidence != null ? (
        <span style={{ color: row.confidence > 0.8 ? '#34D399' : row.confidence > 0.5 ? '#FBBF24' : '#EF4444', fontWeight: 600 }}>
          {(row.confidence * 100).toFixed(1)}%
        </span>
      ) : <span style={{ color: 'var(--text-muted)' }}>--</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (row) => {
        const variant = row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'error' : 'warning';
        return <Badge variant={variant}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Submitted',
      sortable: true,
      width: '130px',
      render: (row) => new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
  ], []);

  // Compute category totals
  const categorySpend = useMemo<CategorySpend[]>(() => {
    const map = new Map<string, number>();
    for (const txn of transactions) {
      const cat = txn.category ?? 'Uncategorized';
      map.set(cat, (map.get(cat) ?? 0) + txn.amount);
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Top 3 categories
  const topCategories = categorySpend.slice(0, 3);

  // Round-up stats
  const roundUpStats = useMemo(() => {
    const roundUps = transactions.filter((t) => t.round_up > 0);
    const totalRoundUps = roundUps.reduce((sum, t) => sum + t.round_up, 0);
    const avgRoundUp = roundUps.length > 0 ? totalRoundUps / roundUps.length : 0;

    // Calculate monthly average for projection
    const months = new Set<string>();
    for (const t of transactions) {
      const d = new Date(t.date);
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    const monthCount = Math.max(1, months.size);
    const monthlyAvg = totalRoundUps / monthCount;
    const projectedAnnual = monthlyAvg * 12;

    return { totalRoundUps, avgRoundUp, projectedAnnual, count: roundUps.length };
  }, [transactions]);

  // Bar chart data
  const chartData = useMemo(() => {
    return categorySpend.map((c) => ({
      name: c.category,
      amount: Math.round(c.total * 100) / 100,
    }));
  }, [categorySpend]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const hasTransactions = transactions.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          AI Insights
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
          Personalized insights powered by AI analysis of your spending patterns and portfolio.
        </p>
      </div>

      {/* AI Recommendations */}
      <InsightCard title="AI Recommendations" accent="pink" icon={<AiRecommendationIcon />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--border-subtle)',
                  borderTopColor: '#EC4899',
                  borderRadius: '50%',
                  animation: 'insights-spin 700ms linear infinite',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Generating personalized recommendations...
              </span>
            </div>
          ) : recsError ? (
            <div
              style={{
                padding: '14px',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {recsError}
              </p>
              <button
                onClick={fetchRecommendations}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#EC4899',
                  background: 'rgba(236,72,153,0.1)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <RefreshIcon /> Retry
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              No recommendations available yet. Check back after more activity.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  {recommendations.length} personalized recommendation{recommendations.length !== 1 ? 's' : ''} based on your activity:
                </p>
                <button
                  onClick={fetchRecommendations}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'transparent',
                    border: '1px solid var(--border-divider)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <RefreshIcon /> Refresh
                </button>
              </div>
              {recommendations.map((rec, idx) => {
                const accentColor =
                  rec.type === 'saving' ? '#7C3AED'
                    : rec.type === 'investing' ? '#3B82F6'
                      : rec.type === 'spending' ? '#06B6D4'
                        : '#EC4899';
                const accentBg =
                  rec.type === 'saving' ? 'rgba(124,58,237,0.08)'
                    : rec.type === 'investing' ? 'rgba(59,130,246,0.08)'
                      : rec.type === 'spending' ? 'rgba(6,182,212,0.08)'
                        : 'rgba(236,72,153,0.08)';
                const accentBorder =
                  rec.type === 'saving' ? 'rgba(124,58,237,0.15)'
                    : rec.type === 'investing' ? 'rgba(59,130,246,0.15)'
                      : rec.type === 'spending' ? 'rgba(6,182,212,0.15)'
                        : 'rgba(236,72,153,0.15)';

                return (
                  <div
                    key={`${rec.type}-${idx}`}
                    style={{
                      padding: '14px',
                      background: accentBg,
                      borderRadius: '10px',
                      border: `1px solid ${accentBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {rec.title}
                      </p>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: accentColor,
                          background: accentBg,
                          border: `1px solid ${accentBorder}`,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'capitalize',
                          flexShrink: 0,
                        }}
                      >
                        {rec.type}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                      {rec.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <div
                        style={{
                          width: '60px',
                          height: '4px',
                          background: 'var(--border-subtle)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(rec.confidence * 100)}%`,
                            height: '100%',
                            background: accentColor,
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {Math.round(rec.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </InsightCard>

      {/* Insight Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Spending Pattern */}
        <InsightCard title="Spending Pattern" accent="purple" icon={<SpendingPatternIcon />}>
          {!hasTransactions ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Not enough data for spending analysis.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Top spending categories based on your transaction history:
              </p>
              {topCategories.map((cat, idx) => (
                <div
                  key={cat.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--surface-input)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-divider)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(124,58,237,0.15)',
                        color: '#7C3AED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {cat.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </InsightCard>

        {/* 2. Round-Up Impact */}
        <InsightCard title="Round-Up Impact" accent="blue" icon={<RoundUpIcon />}>
          {roundUpStats.count === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              No round-up data available yet. Start making purchases to see your round-up impact.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(59,130,246,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(59,130,246,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  Total Round-Ups
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(roundUpStats.totalRoundUps)}
                </p>
              </div>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(59,130,246,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(59,130,246,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  Avg per Transaction
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(roundUpStats.avgRoundUp)}
                </p>
              </div>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(59,130,246,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(59,130,246,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  Projected Annual
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(roundUpStats.projectedAnnual)}
                </p>
              </div>
            </div>
          )}
        </InsightCard>

        {/* 3. Investment Suggestion */}
        <InsightCard title="Investment Suggestion" accent="teal" icon={<SuggestionIcon />}>
          {!hasTransactions ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Not enough transaction data to generate suggestions. Link more cards and make purchases to get started.
            </p>
          ) : transactions.length < 10 ? (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                Your activity is still building up. Here are some tips:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Consider linking additional payment cards to increase round-up volume.
                </li>
                <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  The more transactions you make, the better your insights become.
                </li>
                <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Set up automatic round-ups to build your investment portfolio passively.
                </li>
              </ul>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Based on your round-up volume of {formatCurrency(roundUpStats.totalRoundUps)} across{' '}
                {roundUpStats.count} transactions:
              </p>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(6,182,212,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(6,182,212,0.12)',
                }}
              >
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: 600 }}>
                  Increase your round-up multiplier
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Your average round-up is {formatCurrency(roundUpStats.avgRoundUp)} per transaction.
                  Increasing your round-up amount could boost your projected annual savings from{' '}
                  {formatCurrency(roundUpStats.projectedAnnual)} to{' '}
                  {formatCurrency(roundUpStats.projectedAnnual * 2)} with a 2x multiplier.
                </p>
              </div>
            </div>
          )}
        </InsightCard>
      </div>

      {/* My Submitted Mappings */}
      <InsightCard title="My Submitted Mappings" accent="teal" icon={<MappingIcon />}>
        {mappings.length === 0 && !mappingsLoading ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            No mappings submitted yet. When a transaction fails to match, use the "Map" button on the Transactions page to submit your own mapping.
          </p>
        ) : (
          <div style={{ margin: '0 -24px -24px', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <Table<SubmittedMapping>
              columns={mappingColumns}
              data={mappings}
              loading={mappingsLoading}
              emptyMessage="No submitted mappings"
              pageSize={10}
              rowKey={(row) => row.id}
            />
          </div>
        )}
      </InsightCard>

      {/* Spending by Category Chart */}
      <BarChart
        data={chartData}
        dataKey="amount"
        xKey="name"
        title="Spending by Category"
        color="#7C3AED"
        height={280}
      />
    </div>
  );
}
