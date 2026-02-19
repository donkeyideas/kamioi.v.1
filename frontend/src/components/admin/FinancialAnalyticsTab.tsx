import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
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

interface MonthlyFeePoint {
  name: string;
  fees: number;
}

interface MonthlyRoundUpPoint {
  name: string;
  amount: number;
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
          supabase.from('user_subscriptions').select('amount, status'),
          supabase
            .from('renewal_history')
            .select('amount, renewal_date, status')
            .eq('status', 'success')
            .order('renewal_date', { ascending: true }),
          supabase.from('transactions').select('fee').gt('fee', 0),
          supabase.from('roundup_ledger').select('round_up_amount'),
          supabase
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
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
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
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
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
            <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginBottom: '8px' }}>Subscriptions</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>{usd(totalSubscriptionRevenue)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginBottom: '8px' }}>Fees</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>{usd(totalFeeRevenue)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginBottom: '8px' }}>Round-Ups Processed</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>{usd(totalRoundUpProcessed)}</p>
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
/*  Sub-tab: Fees                                                      */
/* ------------------------------------------------------------------ */

function FeesTab() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .gt('fee', 0)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) {
          console.error('Failed to fetch transactions:', error.message);
          setTransactions([]);
          return;
        }
        setTransactions((data ?? []) as TransactionRow[]);
      } catch (err) {
        console.error('Fees fetch error:', err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalFees = useMemo(
    () => transactions.reduce((sum, t) => sum + t.fee, 0),
    [transactions],
  );
  const avgFee = transactions.length > 0 ? totalFees / transactions.length : 0;
  const txWithFees = transactions.length;

  const feesByMonth: MonthlyFeePoint[] = useMemo(() => {
    const map = groupByMonth(transactions, (t) => t.created_at, (t) => t.fee);
    const points: MonthlyFeePoint[] = [];
    for (const [name, fees] of map) {
      points.push({ name, fees });
    }
    return points;
  }, [transactions]);

  const txColumns: Column<TransactionRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.date),
      },
      { key: 'merchant', header: 'Merchant', sortable: true, render: (row) => row.merchant ?? '--' },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: '110px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'fee',
        header: 'Fee',
        sortable: true,
        align: 'right',
        width: '100px',
        render: (row) => usd(row.fee),
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
    ],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading fees data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Fees" value={usd(totalFees)} accent="teal" />
        <KpiCard label="Avg Fee per Transaction" value={usd(avgFee)} accent="pink" />
        <KpiCard label="Transactions with Fees" value={txWithFees} accent="purple" />
      </div>

      <BarChart<MonthlyFeePoint>
        data={feesByMonth}
        dataKey="fees"
        xKey="name"
        title="Fees by Month"
        color="#06B6D4"
        height={280}
      />

      <GlassCard padding="0">
        <div style={{ padding: '16px 16px 0', fontSize: '16px', fontWeight: 600, color: '#F8FAFC' }}>
          Transactions with Fees (Top 50)
        </div>
        <Table<TransactionRow>
          columns={txColumns}
          data={transactions}
          loading={false}
          emptyMessage="No transactions with fees found"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>
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
        const { data, error } = await supabase
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
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
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
        <div style={{ padding: '16px 16px 0', fontSize: '16px', fontWeight: 600, color: '#F8FAFC' }}>
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
          supabase.from('transactions').select('amount, fee'),
          supabase.from('roundup_ledger').select('round_up_amount, fee_amount'),
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
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading accounting data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '8px' }}>
          Accounting Overview
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
          Double-entry accounting and journal entries. Financial reconciliation tools.
        </p>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Debits" value={usd(totalDebits)} accent="purple" />
        <KpiCard label="Total Credits" value={usd(totalCredits)} accent="teal" />
        <KpiCard label="Net Position" value={usd(netPosition)} accent="blue" />
      </div>

      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', marginBottom: '16px' }}>
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
            <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginBottom: '8px' }}>Transaction Fees</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>{usd(totalTxFees)}</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)', marginBottom: '8px' }}>Ledger Fees</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>{usd(totalLedgerFees)}</p>
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
    { key: 'fees', label: 'Fees', content: <FeesTab /> },
    { key: 'roundups', label: 'Round-Ups', content: <RoundUpsTab /> },
    { key: 'accounting', label: 'Accounting', content: <AccountingTab /> },
  ];

  return <Tabs tabs={tabs} defaultTab="revenue" />;
}

export default FinancialAnalyticsTab;
