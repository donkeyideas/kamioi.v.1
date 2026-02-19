import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { KpiCard, Tabs } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import AreaChart from '@/components/charts/AreaChart';

/* ---------- Types ---------- */

interface MonthlyRevenuePoint {
  name: string;
  revenue: number;
}

interface MonthlyFeePoint {
  name: string;
  fees: number;
}

interface MonthlyRoundUpPoint {
  name: string;
  amount: number;
}

interface RenewalRow {
  amount: number;
  renewal_date: string;
}

interface TransactionFeeRow {
  fee: number;
  created_at: string;
}

interface RoundUpRow {
  round_up_amount: number;
  created_at: string;
}

/* ---------- Helpers ---------- */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function monthKey(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function groupByMonth<T>(
  rows: T[],
  dateAccessor: (row: T) => string,
  valueAccessor: (row: T) => number,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = monthKey(dateAccessor(row));
    map.set(key, (map.get(key) ?? 0) + valueAccessor(row));
  }
  return map;
}

/* ---------- Component ---------- */

export function FinancialAnalyticsTab() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);

  /* Revenue state */
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);

  /* Fees state */
  const [transactionFees, setTransactionFees] = useState<TransactionFeeRow[]>([]);

  /* Round-ups state */
  const [roundUps, setRoundUps] = useState<RoundUpRow[]>([]);

  /* Active subscriptions total for avg revenue per user */
  const [activeSubCount, setActiveSubCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [renewalResult, feesResult, roundUpResult, activeSubResult] = await Promise.all([
          /* Renewal history for revenue charts */
          supabase
            .from('renewal_history')
            .select('amount, renewal_date')
            .order('renewal_date', { ascending: true }),

          /* Transaction fees */
          supabase
            .from('transactions')
            .select('fee, created_at')
            .gt('fee', 0)
            .order('created_at', { ascending: true }),

          /* Round-up ledger */
          supabase
            .from('roundup_ledger')
            .select('round_up_amount, created_at')
            .order('created_at', { ascending: true }),

          /* Active subscriptions count for avg calculation */
          supabase
            .from('user_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
        ]);

        setRenewals((renewalResult.data as RenewalRow[]) ?? []);
        setTransactionFees((feesResult.data as TransactionFeeRow[]) ?? []);
        setRoundUps((roundUpResult.data as RoundUpRow[]) ?? []);
        setActiveSubCount(activeSubResult.count ?? 0);
      } catch (err) {
        console.error('FinancialAnalyticsTab fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile?.id]);

  /* ---- Revenue derived data ---- */

  const revenueByMonth: MonthlyRevenuePoint[] = useMemo(() => {
    const map = groupByMonth(renewals, (r) => r.renewal_date, (r) => r.amount);
    const points: MonthlyRevenuePoint[] = [];
    for (const [name, revenue] of map) {
      points.push({ name, revenue });
    }
    return points;
  }, [renewals]);

  const totalRevenue = useMemo(
    () => renewals.reduce((sum, r) => sum + r.amount, 0),
    [renewals],
  );

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const currentKey = monthKey(now.toISOString());
    return revenueByMonth.find((p) => p.name === currentKey)?.revenue ?? 0;
  }, [revenueByMonth]);

  const avgRevenuePerUser = useMemo(
    () => (activeSubCount > 0 ? totalRevenue / activeSubCount : 0),
    [totalRevenue, activeSubCount],
  );

  /* ---- Fees derived data ---- */

  const feesByMonth: MonthlyFeePoint[] = useMemo(() => {
    const map = groupByMonth(transactionFees, (r) => r.created_at, (r) => r.fee);
    const points: MonthlyFeePoint[] = [];
    for (const [name, fees] of map) {
      points.push({ name, fees });
    }
    return points;
  }, [transactionFees]);

  const totalFees = useMemo(
    () => transactionFees.reduce((sum, r) => sum + r.fee, 0),
    [transactionFees],
  );

  const avgFeePerTransaction = useMemo(
    () => (transactionFees.length > 0 ? totalFees / transactionFees.length : 0),
    [totalFees, transactionFees.length],
  );

  /* ---- Round-ups derived data ---- */

  const roundUpsByMonth: MonthlyRoundUpPoint[] = useMemo(() => {
    const map = groupByMonth(roundUps, (r) => r.created_at, (r) => r.round_up_amount);
    const points: MonthlyRoundUpPoint[] = [];
    for (const [name, amount] of map) {
      points.push({ name, amount });
    }
    return points;
  }, [roundUps]);

  const totalRoundUps = useMemo(() => roundUps.length, [roundUps]);

  const totalRoundUpAmount = useMemo(
    () => roundUps.reduce((sum, r) => sum + r.round_up_amount, 0),
    [roundUps],
  );

  /* ---- Tab content builders ---- */

  const revenueContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Monthly Revenue" value={formatCurrency(monthlyRevenue)} accent="purple" />
        <KpiCard label="Annual Revenue" value={formatCurrencyCompact(totalRevenue)} accent="teal" />
        <KpiCard
          label="Avg Revenue per User"
          value={formatCurrency(avgRevenuePerUser)}
          accent="blue"
        />
      </div>
      <LineChart<MonthlyRevenuePoint>
        data={revenueByMonth}
        dataKey="revenue"
        xKey="name"
        title="Revenue Over Time"
        color="#7C3AED"
        height={280}
      />
    </div>
  );

  const feesContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Fees Collected" value={formatCurrency(totalFees)} accent="teal" />
        <KpiCard
          label="Avg Fee per Transaction"
          value={formatCurrency(avgFeePerTransaction)}
          accent="pink"
        />
      </div>
      <BarChart<MonthlyFeePoint>
        data={feesByMonth}
        dataKey="fees"
        xKey="name"
        title="Fees by Month"
        color="#06B6D4"
        height={280}
      />
    </div>
  );

  const roundUpsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Round-Ups" value={formatNumber(totalRoundUps)} accent="purple" />
        <KpiCard
          label="Total Amount"
          value={formatCurrency(totalRoundUpAmount)}
          accent="blue"
        />
      </div>
      <AreaChart<MonthlyRoundUpPoint>
        data={roundUpsByMonth}
        dataKey="amount"
        xKey="name"
        title="Round-Up Volume Over Time"
        color="#7C3AED"
        height={280}
      />
    </div>
  );

  /* ---- Tabs definition ---- */

  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'revenue', label: 'Revenue', content: revenueContent },
      { key: 'fees', label: 'Fees', content: feesContent },
      { key: 'roundups', label: 'Round-Ups', content: roundUpsContent },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      revenueByMonth,
      monthlyRevenue,
      totalRevenue,
      avgRevenuePerUser,
      feesByMonth,
      totalFees,
      avgFeePerTransaction,
      roundUpsByMonth,
      totalRoundUps,
      totalRoundUpAmount,
    ],
  );

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading financial analytics...
      </div>
    );
  }

  return <Tabs tabs={tabs} defaultTab="revenue" />;
}
