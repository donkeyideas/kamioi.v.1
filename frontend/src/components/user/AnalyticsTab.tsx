import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { KpiCard, GlassCard } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import AreaChart from '@/components/charts/AreaChart';
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
          animation: 'analytics-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes analytics-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SpendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
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

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month]} ${year}`;
}

function getMonthSortKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface MerchantTotal {
  merchant: string;
  total: number;
}

export function AnalyticsTab() {
  const { profile } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: true });

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

  // Current month KPIs
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const monthlySpending = currentMonthTxns.reduce((sum, t) => sum + t.amount, 0);
    const monthlyRoundUps = currentMonthTxns.reduce((sum, t) => sum + t.round_up, 0);

    return { monthlySpending, monthlyRoundUps };
  }, [transactions]);

  // Spending by month for line chart
  const spendingByMonth = useMemo(() => {
    const map = new Map<string, { sortKey: string; total: number }>();

    for (const txn of transactions) {
      const monthLabel = getMonthKey(txn.date);
      const sortKey = getMonthSortKey(txn.date);
      const existing = map.get(monthLabel);
      if (existing) {
        existing.total += txn.amount;
      } else {
        map.set(monthLabel, { sortKey, total: txn.amount });
      }
    }

    return Array.from(map.entries())
      .map(([month, { sortKey, total }]) => ({
        month,
        sortKey,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  // Cumulative round-ups for area chart
  const cumulativeRoundUps = useMemo(() => {
    const map = new Map<string, { sortKey: string; sum: number }>();

    for (const txn of transactions) {
      const monthLabel = getMonthKey(txn.date);
      const sortKey = getMonthSortKey(txn.date);
      const existing = map.get(monthLabel);
      if (existing) {
        existing.sum += txn.round_up;
      } else {
        map.set(monthLabel, { sortKey, sum: txn.round_up });
      }
    }

    const sorted = Array.from(map.entries())
      .map(([month, { sortKey, sum }]) => ({ month, sortKey, sum }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    let cumulative = 0;
    return sorted.map(({ month, sum }) => {
      cumulative += sum;
      return {
        month,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });
  }, [transactions]);

  // Top 5 merchants
  const topMerchants = useMemo<MerchantTotal[]>(() => {
    const map = new Map<string, number>();
    for (const txn of transactions) {
      const merchant = txn.merchant || 'Unknown';
      map.set(merchant, (map.get(merchant) ?? 0) + txn.amount);
    }
    return Array.from(map.entries())
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  const maxMerchantTotal = topMerchants.length > 0 ? topMerchants[0].total : 1;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
        Analytics
      </h2>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard
          label="Monthly Spending"
          value={formatCurrency(currentMonthStats.monthlySpending)}
          accent="purple"
          icon={<SpendingIcon />}
        />
        <KpiCard
          label="Monthly Round-Ups"
          value={formatCurrency(currentMonthStats.monthlyRoundUps)}
          accent="blue"
          icon={<RoundUpIcon />}
        />
      </div>

      {/* Spending Over Time - Line Chart */}
      <LineChart
        data={spendingByMonth}
        dataKey="total"
        xKey="month"
        title="Spending Over Time"
        color="#7C3AED"
        height={300}
      />

      {/* Round-Up Accumulation - Area Chart */}
      <AreaChart
        data={cumulativeRoundUps}
        dataKey="cumulative"
        xKey="month"
        title="Round-Up Accumulation"
        color="#3B82F6"
        height={250}
      />

      {/* Top Merchants */}
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: '0 0 6px 0' }}>
          Top Merchants
        </h3>
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            marginBottom: '16px',
          }}
        />

        {topMerchants.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', margin: 0, textAlign: 'center', padding: '32px 0' }}>
            No transaction data available.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topMerchants.map((m, idx) => {
              const proportion = maxMerchantTotal > 0 ? (m.total / maxMerchantTotal) * 100 : 0;
              return (
                <div key={m.merchant} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          background: idx === 0
                            ? 'rgba(124,58,237,0.2)'
                            : idx === 1
                              ? 'rgba(59,130,246,0.15)'
                              : 'rgba(255,255,255,0.06)',
                          color: idx === 0
                            ? '#7C3AED'
                            : idx === 1
                              ? '#3B82F6'
                              : 'rgba(248,250,252,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC' }}>
                        {m.merchant}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', flexShrink: 0 }}>
                      {formatCurrency(m.total)}
                    </span>
                  </div>
                  {/* Proportion bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${proportion}%`,
                        height: '100%',
                        borderRadius: '3px',
                        background:
                          idx === 0
                            ? 'linear-gradient(90deg, #7C3AED, #3B82F6)'
                            : idx === 1
                              ? 'linear-gradient(90deg, #3B82F6, #06B6D4)'
                              : 'rgba(248,250,252,0.2)',
                        transition: 'width 500ms ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
