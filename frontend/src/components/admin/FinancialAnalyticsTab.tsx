import { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import AreaChart from '@/components/charts/AreaChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RenewalRow {
  amount: number;
  renewal_date: string;
  status: string;
}

interface TransactionRow {
  id: number;
  user_id: number;
  date: string | null;
  merchant: string | null;
  amount: number;
  round_up: number | null;
  fee: number;
  status: string | null;
  created_at: string;
}

interface RoundUpRow {
  id: number;
  user_id: number;
  round_up_amount: number;
  fee_amount: number;
  status: string | null;
  created_at: string;
}

interface UserSubscriptionRow {
  amount: number;
  status: string;
}

interface MonthlyRevenuePoint {
  name: string;
  revenue: number;
}

interface MonthlyRoundUpPoint {
  name: string;
  amount: number;
}

interface MonthlyPnLPoint {
  name: string;
  revenue: number;
  expenses: number;
}

interface MonthlyCashFlowPoint {
  name: string;
  inflows: number;
  outflows: number;
  net: number;
}

interface ApiUsageRow {
  cost: number;
  created_at: string;
}

interface RenewalHistoryRow {
  amount: number;
  renewal_date: string;
  status: string;
}

interface RenewalQueueRow {
  amount: number;
  status: string;
}

interface MarketQueueRow {
  amount: number;
  status: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function usdCompact(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function statusBadgeVariant(status: string | null): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'completed':
    case 'success':
    case 'active':
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
/*  Sub-tab: Revenue                                                   */
/* ------------------------------------------------------------------ */

function RevenueTab() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionRow[]>([]);
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [roundUps, setRoundUps] = useState<RoundUpRow[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subsResult, renewalResult, txResult, ruResult, userCountResult] = await Promise.all([
          supabaseAdmin.from('user_subscriptions').select('amount, status').limit(1000),
          supabaseAdmin
            .from('renewal_history')
            .select('amount, renewal_date, status')
            .eq('status', 'success')
            .order('renewal_date', { ascending: true })
            .limit(1000),
          supabaseAdmin.from('transactions').select('fee').gt('fee', 0).limit(1000),
          supabaseAdmin.from('roundup_ledger').select('round_up_amount').limit(1000),
          supabaseAdmin
            .from('user_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
        ]);

        setSubscriptions((subsResult.data ?? []) as UserSubscriptionRow[]);
        setRenewals((renewalResult.data ?? []) as RenewalRow[]);
        setTransactions((txResult.data ?? []) as TransactionRow[]);
        setRoundUps((ruResult.data ?? []) as RoundUpRow[]);
        setUserCount(userCountResult.count ?? 0);
      } catch (err) {
        console.error('Revenue fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalRevenue = useMemo(
    () => subscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.amount, 0),
    [subscriptions],
  );

  const revenueByMonth: MonthlyRevenuePoint[] = useMemo(() => {
    const map = groupByMonth(renewals, (r) => r.renewal_date, (r) => r.amount);
    const points: MonthlyRevenuePoint[] = [];
    for (const [name, revenue] of map) {
      points.push({ name, revenue });
    }
    return points;
  }, [renewals]);

  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    const key = monthKey(now.toISOString());
    return revenueByMonth.find((p) => p.name === key)?.revenue ?? 0;
  }, [revenueByMonth]);

  const annualRunRate = currentMonthRevenue * 12;
  const revenuePerUser = userCount > 0 ? totalRevenue / userCount : 0;

  const totalSubscriptionRevenue = useMemo(
    () => subscriptions.reduce((sum, s) => sum + s.amount, 0),
    [subscriptions],
  );
  const totalFeeRevenue = useMemo(
    () => transactions.reduce((sum, t) => sum + (t as unknown as { fee: number }).fee, 0),
    [transactions],
  );
  const totalRoundUpProcessed = useMemo(
    () => roundUps.reduce((sum, r) => sum + r.round_up_amount, 0),
    [roundUps],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading revenue data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Revenue" value={usd(totalRevenue)} accent="purple" />
        <KpiCard label="Monthly Revenue" value={usd(currentMonthRevenue)} accent="teal" />
        <KpiCard label="Annual Run Rate" value={usdCompact(annualRunRate)} accent="blue" />
        <KpiCard label="Revenue per User" value={usd(revenuePerUser)} accent="pink" />
      </div>

      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Revenue by Source
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Subscriptions</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(totalSubscriptionRevenue)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Fees</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(totalFeeRevenue)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Round-Ups Processed</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(totalRoundUpProcessed)}</p>
          </div>
        </div>
      </GlassCard>

      <LineChart<MonthlyRevenuePoint>
        data={revenueByMonth}
        dataKey="revenue"
        xKey="name"
        title="Revenue Trend by Month"
        color="#7C3AED"
        height={280}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: P&L (Profit & Loss)                                       */
/* ------------------------------------------------------------------ */

function ProfitLossTab() {
  const [loading, setLoading] = useState(true);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
  const [roundUpRevenue, setRoundUpRevenue] = useState(0);
  const [apiCosts, setApiCosts] = useState(0);
  const [renewals, setRenewals] = useState<RenewalHistoryRow[]>([]);
  const [roundUps, setRoundUps] = useState<RoundUpRow[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsageRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subsResult, ruResult, apiResult, renewalResult] = await Promise.all([
          supabaseAdmin
            .from('user_subscriptions')
            .select('amount, status')
            .eq('status', 'active')
            .limit(1000),
          supabaseAdmin.from('roundup_ledger').select('round_up_amount, fee_amount, created_at').limit(1000),
          supabaseAdmin.from('api_usage').select('cost, created_at').limit(1000),
          supabaseAdmin
            .from('renewal_history')
            .select('amount, renewal_date, status')
            .eq('status', 'success')
            .order('renewal_date', { ascending: true })
            .limit(1000),
        ]);

        const subs = (subsResult.data ?? []) as UserSubscriptionRow[];
        const rus = (ruResult.data ?? []) as RoundUpRow[];
        const apis = (apiResult.data ?? []) as ApiUsageRow[];
        const rens = (renewalResult.data ?? []) as RenewalHistoryRow[];

        setSubscriptionRevenue(subs.reduce((sum, s) => sum + s.amount, 0));
        setRoundUpRevenue(rus.reduce((sum, r) => sum + r.fee_amount, 0));
        setApiCosts(apis.reduce((sum, a) => sum + (a.cost ?? 0), 0));
        setRenewals(rens);
        setRoundUps(rus);
        setApiUsage(apis);
      } catch (err) {
        console.error('P&L fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalRevenue = subscriptionRevenue + roundUpRevenue;
  const totalExpenses = apiCosts;
  const netIncome = totalRevenue - totalExpenses;
  const operatingMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  const monthlyPnL: MonthlyPnLPoint[] = useMemo(() => {
    const revenueMap = groupByMonth(renewals, (r) => r.renewal_date, (r) => r.amount);
    const ruRevenueMap = groupByMonth(roundUps, (r) => r.created_at, (r) => r.fee_amount);
    const expenseMap = groupByMonth(apiUsage, (a) => a.created_at, (a) => a.cost ?? 0);

    const allMonths = new Set<string>();
    for (const key of revenueMap.keys()) allMonths.add(key);
    for (const key of ruRevenueMap.keys()) allMonths.add(key);
    for (const key of expenseMap.keys()) allMonths.add(key);

    const points: MonthlyPnLPoint[] = [];
    for (const month of allMonths) {
      points.push({
        name: month,
        revenue: (revenueMap.get(month) ?? 0) + (ruRevenueMap.get(month) ?? 0),
        expenses: expenseMap.get(month) ?? 0,
      });
    }
    return points.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [renewals, roundUps, apiUsage]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading P&L data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Revenue" value={usd(totalRevenue)} accent="purple" />
        <KpiCard label="Total Expenses" value={usd(totalExpenses)} accent="pink" />
        <KpiCard label="Net Income" value={usd(netIncome)} accent="teal" />
        <KpiCard
          label="Operating Margin"
          value={`${operatingMargin.toFixed(1)}%`}
          accent="blue"
        />
      </div>

      {/* Revenue Breakdown */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Revenue Breakdown
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Subscription Revenue</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(subscriptionRevenue)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Round-Up Revenue</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(roundUpRevenue)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Expense Breakdown */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Expense Breakdown
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>AI / API Costs</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(apiCosts)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(148,163,184,0.08)',
              border: '1px solid rgba(148,163,184,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Infrastructure</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No data available</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(148,163,184,0.08)',
              border: '1px solid rgba(148,163,184,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Operations</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No data available</p>
          </div>
        </div>
      </GlassCard>

      {/* Monthly P&L Trend */}
      <LineChart<MonthlyPnLPoint>
        data={monthlyPnL}
        dataKey="revenue"
        xKey="name"
        title="Monthly P&L Trend (Revenue vs Expenses)"
        color="#7C3AED"
        height={280}
        additionalLines={[{ dataKey: 'expenses', color: '#EF4444' }]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Balance Sheet                                             */
/* ------------------------------------------------------------------ */

function BalanceSheetTab() {
  const [loading, setLoading] = useState(true);
  const [cashEquivalents, setCashEquivalents] = useState(0);
  const [accountsReceivable, setAccountsReceivable] = useState(0);
  const [userDeposits, setUserDeposits] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subsResult, renewalQueueResult, ruResult, marketQueueResult] = await Promise.all([
          supabaseAdmin
            .from('user_subscriptions')
            .select('amount, status')
            .eq('status', 'active')
            .limit(1000),
          supabaseAdmin
            .from('renewal_queue')
            .select('amount, status')
            .eq('status', 'pending')
            .limit(1000),
          supabaseAdmin.from('roundup_ledger').select('round_up_amount').limit(1000),
          supabaseAdmin
            .from('market_queue')
            .select('amount, status')
            .eq('status', 'pending')
            .limit(1000),
        ]);

        const subs = (subsResult.data ?? []) as UserSubscriptionRow[];
        const renewalQ = (renewalQueueResult.data ?? []) as RenewalQueueRow[];
        const rus = (ruResult.data ?? []) as Array<{ round_up_amount: number }>;
        const marketQ = (marketQueueResult.data ?? []) as MarketQueueRow[];

        setCashEquivalents(subs.reduce((sum, s) => sum + s.amount, 0));
        setAccountsReceivable(renewalQ.reduce((sum, r) => sum + (r.amount ?? 0), 0));
        setUserDeposits(rus.reduce((sum, r) => sum + r.round_up_amount, 0));
        setPendingPayouts(marketQ.reduce((sum, m) => sum + (m.amount ?? 0), 0));
      } catch (err) {
        console.error('Balance Sheet fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalAssets = cashEquivalents + accountsReceivable + userDeposits;
  const totalLiabilities = pendingPayouts;
  const equity = totalAssets - totalLiabilities;
  const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading balance sheet data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Assets" value={usd(totalAssets)} accent="purple" />
        <KpiCard label="Total Liabilities" value={usd(totalLiabilities)} accent="pink" />
        <KpiCard label="Equity" value={usd(equity)} accent="teal" />
        <KpiCard
          label="Current Ratio"
          value={currentRatio > 0 ? currentRatio.toFixed(2) : '--'}
          accent="blue"
        />
      </div>

      {/* Assets Section */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Assets
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Cash & Equivalents</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(cashEquivalents)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Active subscription revenue</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Accounts Receivable</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(accountsReceivable)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending renewals</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>User Deposits</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(userDeposits)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Round-up deposits</p>
          </div>
        </div>
      </GlassCard>

      {/* Liabilities Section */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Liabilities
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Accounts Payable</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No data available</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Pending Payouts</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(pendingPayouts)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending market queue amounts</p>
          </div>
        </div>
      </GlassCard>

      {/* Equity Section */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Equity
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Retained Earnings</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(equity)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total assets minus total liabilities</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Cash Flow                                                 */
/* ------------------------------------------------------------------ */

function CashFlowTab() {
  const [loading, setLoading] = useState(true);
  const [subscriptionInflows, setSubscriptionInflows] = useState(0);
  const [roundUpInflows, setRoundUpInflows] = useState(0);
  const [apiOutflows, setApiOutflows] = useState(0);
  const [investmentOutflows, setInvestmentOutflows] = useState(0);
  const [renewals, setRenewals] = useState<RenewalHistoryRow[]>([]);
  const [roundUps, setRoundUps] = useState<RoundUpRow[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsageRow[]>([]);
  const [completedMarket, setCompletedMarket] = useState<MarketQueueRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [renewalResult, ruResult, apiResult, marketResult] = await Promise.all([
          supabaseAdmin
            .from('renewal_history')
            .select('amount, renewal_date, status')
            .eq('status', 'success')
            .order('renewal_date', { ascending: true })
            .limit(1000),
          supabaseAdmin
            .from('roundup_ledger')
            .select('id, user_id, round_up_amount, fee_amount, status, created_at')
            .order('created_at', { ascending: true })
            .limit(1000),
          supabaseAdmin
            .from('api_usage')
            .select('cost, created_at')
            .order('created_at', { ascending: true })
            .limit(1000),
          supabaseAdmin
            .from('market_queue')
            .select('amount, status, created_at')
            .eq('status', 'completed')
            .order('created_at', { ascending: true })
            .limit(1000),
        ]);

        const rens = (renewalResult.data ?? []) as RenewalHistoryRow[];
        const rus = (ruResult.data ?? []) as RoundUpRow[];
        const apis = (apiResult.data ?? []) as ApiUsageRow[];
        const mkts = (marketResult.data ?? []) as MarketQueueRow[];

        setSubscriptionInflows(rens.reduce((sum, r) => sum + r.amount, 0));
        setRoundUpInflows(rus.reduce((sum, r) => sum + r.round_up_amount, 0));
        setApiOutflows(apis.reduce((sum, a) => sum + (a.cost ?? 0), 0));
        setInvestmentOutflows(mkts.reduce((sum, m) => sum + (m.amount ?? 0), 0));
        setRenewals(rens);
        setRoundUps(rus);
        setApiUsage(apis);
        setCompletedMarket(mkts);
      } catch (err) {
        console.error('Cash Flow fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const operatingCashFlow = subscriptionInflows + roundUpInflows - apiOutflows;
  const investingCashFlow = -investmentOutflows;
  const financingCashFlow = 0;
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  const monthlyCashFlow: MonthlyCashFlowPoint[] = useMemo(() => {
    const inflowSubMap = groupByMonth(renewals, (r) => r.renewal_date, (r) => r.amount);
    const inflowRuMap = groupByMonth(roundUps, (r) => r.created_at, (r) => r.round_up_amount);
    const outflowApiMap = groupByMonth(apiUsage, (a) => a.created_at, (a) => a.cost ?? 0);
    const outflowMktMap = groupByMonth(completedMarket, (m) => m.created_at, (m) => m.amount ?? 0);

    const allMonths = new Set<string>();
    for (const key of inflowSubMap.keys()) allMonths.add(key);
    for (const key of inflowRuMap.keys()) allMonths.add(key);
    for (const key of outflowApiMap.keys()) allMonths.add(key);
    for (const key of outflowMktMap.keys()) allMonths.add(key);

    const points: MonthlyCashFlowPoint[] = [];
    for (const month of allMonths) {
      const inflows = (inflowSubMap.get(month) ?? 0) + (inflowRuMap.get(month) ?? 0);
      const outflows = (outflowApiMap.get(month) ?? 0) + (outflowMktMap.get(month) ?? 0);
      points.push({
        name: month,
        inflows,
        outflows,
        net: inflows - outflows,
      });
    }
    return points.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [renewals, roundUps, apiUsage, completedMarket]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading cash flow data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Operating Cash Flow" value={usd(operatingCashFlow)} accent="purple" />
        <KpiCard label="Investing Cash Flow" value={usd(investingCashFlow)} accent="pink" />
        <KpiCard label="Financing Cash Flow" value={usd(financingCashFlow)} accent="blue" />
        <KpiCard label="Net Cash Flow" value={usd(netCashFlow)} accent="teal" />
      </div>

      {/* Cash Inflows */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Cash Inflows
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Subscriptions</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(subscriptionInflows)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Successful renewals</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Round-Up Deposits</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(roundUpInflows)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>From roundup ledger</p>
          </div>
        </div>
      </GlassCard>

      {/* Cash Outflows */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Cash Outflows
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>API Costs</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(apiOutflows)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>AI and third-party APIs</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Investment Executions</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(investmentOutflows)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Completed market queue</p>
          </div>
        </div>
      </GlassCard>

      {/* Monthly Cash Flow Trend */}
      <AreaChart<MonthlyCashFlowPoint>
        data={monthlyCashFlow}
        dataKey="net"
        xKey="name"
        title="Monthly Cash Flow Trend"
        color="#06B6D4"
        height={280}
        additionalAreas={[
          { dataKey: 'inflows', color: '#10B981' },
          { dataKey: 'outflows', color: '#EF4444' },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Round-Ups                                                 */
/* ------------------------------------------------------------------ */

function RoundUpsTab() {
  const [loading, setLoading] = useState(true);
  const [roundUps, setRoundUps] = useState<RoundUpRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabaseAdmin
          .from('roundup_ledger')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) {
          console.error('Failed to fetch roundup ledger:', error.message);
          setRoundUps([]);
          return;
        }
        setRoundUps((data ?? []) as RoundUpRow[]);
      } catch (err) {
        console.error('Round-ups fetch error:', err);
        setRoundUps([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalVolume = useMemo(
    () => roundUps.reduce((sum, r) => sum + r.round_up_amount, 0),
    [roundUps],
  );
  const totalFeeRevenue = useMemo(
    () => roundUps.reduce((sum, r) => sum + r.fee_amount, 0),
    [roundUps],
  );
  const ledgerEntries = roundUps.length;
  const avgRoundUp = ledgerEntries > 0 ? totalVolume / ledgerEntries : 0;

  const roundUpsByMonth: MonthlyRoundUpPoint[] = useMemo(() => {
    const map = groupByMonth(roundUps, (r) => r.created_at, (r) => r.round_up_amount);
    const points: MonthlyRoundUpPoint[] = [];
    for (const [name, amount] of map) {
      points.push({ name, amount });
    }
    return points;
  }, [roundUps]);

  const ruColumns: Column<RoundUpRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'user_id', header: 'User ID', sortable: true, width: '90px' },
      {
        key: 'round_up_amount',
        header: 'Round-Up Amount',
        sortable: true,
        align: 'right',
        width: '140px',
        render: (row) => usd(row.round_up_amount),
      },
      {
        key: 'fee_amount',
        header: 'Fee Amount',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) => usd(row.fee_amount),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => (
          <Badge variant={statusBadgeVariant(row.status)}>{row.status ?? '--'}</Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading round-up data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Round-Up Volume" value={usd(totalVolume)} accent="purple" />
        <KpiCard label="Total Fee Revenue" value={usd(totalFeeRevenue)} accent="teal" />
        <KpiCard label="Ledger Entries" value={ledgerEntries} accent="blue" />
        <KpiCard label="Avg Round-Up" value={usd(avgRoundUp)} accent="pink" />
      </div>

      <AreaChart<MonthlyRoundUpPoint>
        data={roundUpsByMonth}
        dataKey="amount"
        xKey="name"
        title="Round-Up Volume Over Time"
        color="#7C3AED"
        height={280}
      />

      <GlassCard padding="0">
        <div style={{ padding: '16px 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Recent Ledger Entries (Last 100)
        </div>
        <Table<RoundUpRow>
          columns={ruColumns}
          data={roundUps}
          loading={false}
          emptyMessage="No round-up ledger entries found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Accounting                                                */
/* ------------------------------------------------------------------ */

function AccountingTab() {
  const [loading, setLoading] = useState(true);
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [totalTxFees, setTotalTxFees] = useState(0);
  const [totalLedgerFees, setTotalLedgerFees] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [txResult, ruResult] = await Promise.all([
          supabaseAdmin.from('transactions').select('amount, fee').limit(1000),
          supabaseAdmin.from('roundup_ledger').select('round_up_amount, fee_amount').limit(1000),
        ]);

        const txData = (txResult.data ?? []) as Array<{ amount: number; fee: number }>;
        const ruData = (ruResult.data ?? []) as Array<{ round_up_amount: number; fee_amount: number }>;

        setTotalDebits(txData.reduce((sum, t) => sum + t.amount, 0));
        setTotalTxFees(txData.reduce((sum, t) => sum + t.fee, 0));
        setTotalCredits(ruData.reduce((sum, r) => sum + r.round_up_amount, 0));
        setTotalLedgerFees(ruData.reduce((sum, r) => sum + r.fee_amount, 0));
      } catch (err) {
        console.error('Accounting fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const netPosition = totalDebits - totalCredits;
  const feesMatch = Math.abs(totalTxFees - totalLedgerFees) < 0.01;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading accounting data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Accounting Overview
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Double-entry accounting and journal entries. Financial reconciliation tools.
        </p>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Debits" value={usd(totalDebits)} accent="purple" />
        <KpiCard label="Total Credits" value={usd(totalCredits)} accent="teal" />
        <KpiCard label="Net Position" value={usd(netPosition)} accent="blue" />
      </div>

      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Fee Reconciliation
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Transaction Fees</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(totalTxFees)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Ledger Fees</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{usd(totalLedgerFees)}</p>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          {feesMatch ? (
            <Badge variant="success">Reconciled -- fees match</Badge>
          ) : (
            <Badge variant="warning">
              Reconciliation needed -- difference: {usd(Math.abs(totalTxFees - totalLedgerFees))}
            </Badge>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function FinancialAnalyticsTab() {
  const tabs: TabItem[] = [
    { key: 'revenue', label: 'Revenue', content: <RevenueTab /> },
    { key: 'pnl', label: 'P&L', content: <ProfitLossTab /> },
    { key: 'balance-sheet', label: 'Balance Sheet', content: <BalanceSheetTab /> },
    { key: 'cash-flow', label: 'Cash Flow', content: <CashFlowTab /> },
    { key: 'roundups', label: 'Round-Ups', content: <RoundUpsTab /> },
    { key: 'accounting', label: 'Accounting', content: <AccountingTab /> },
  ];

  return <Tabs tabs={tabs} defaultTab="revenue" />;
}

export default FinancialAnalyticsTab;
