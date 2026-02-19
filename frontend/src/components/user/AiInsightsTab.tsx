import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(255,255,255,0.1)',
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
  accent: 'purple' | 'blue' | 'teal';
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
                  : 'rgba(6,182,212,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color:
              accent === 'purple'
                ? '#7C3AED'
                : accent === 'blue'
                  ? '#3B82F6'
                  : '#06B6D4',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
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

interface CategorySpend {
  category: string;
  total: number;
}

export function AiInsightsTab() {
  const { profile } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data ?? []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px 0' }}>
          AI Insights
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', margin: 0, maxWidth: '600px' }}>
          Personalized insights powered by AI analysis of your spending patterns and portfolio.
        </p>
      </div>

      {/* Insight Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Spending Pattern */}
        <InsightCard title="Spending Pattern" accent="purple" icon={<SpendingPatternIcon />}>
          {!hasTransactions ? (
            <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', margin: 0 }}>
              Not enough data for spending analysis.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', margin: 0 }}>
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
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)',
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
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC' }}>
                      {cat.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
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
            <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', margin: 0 }}>
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
                <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', margin: '0 0 4px 0' }}>
                  Total Round-Ups
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
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
                <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', margin: '0 0 4px 0' }}>
                  Avg per Transaction
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
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
                <p style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)', margin: '0 0 4px 0' }}>
                  Projected Annual
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  {formatCurrency(roundUpStats.projectedAnnual)}
                </p>
              </div>
            </div>
          )}
        </InsightCard>

        {/* 3. Investment Suggestion */}
        <InsightCard title="Investment Suggestion" accent="teal" icon={<SuggestionIcon />}>
          {!hasTransactions ? (
            <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', margin: 0 }}>
              Not enough transaction data to generate suggestions. Link more cards and make purchases to get started.
            </p>
          ) : transactions.length < 10 ? (
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.6)', margin: '0 0 8px 0' }}>
                Your activity is still building up. Here are some tips:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)' }}>
                  Consider linking additional payment cards to increase round-up volume.
                </li>
                <li style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)' }}>
                  The more transactions you make, the better your insights become.
                </li>
                <li style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)' }}>
                  Set up automatic round-ups to build your investment portfolio passively.
                </li>
              </ul>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.6)', margin: '0 0 12px 0' }}>
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
                <p style={{ fontSize: '14px', color: '#F8FAFC', margin: '0 0 6px 0', fontWeight: 600 }}>
                  Increase your round-up multiplier
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', margin: 0 }}>
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
