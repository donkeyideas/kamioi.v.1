import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MarketQueueRow = Database['public']['Tables']['market_queue']['Row'];
type PortfolioRow = Database['public']['Tables']['portfolios']['Row'];

interface AggregatedPortfolio {
  ticker: string;
  totalShares: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
}

interface TickerChartItem extends Record<string, unknown> {
  name: string;
  value: number;
}

interface MarketQueueKpis {
  pending: number;
  processing: number;
  completedToday: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDatetime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function queueBadgeVariant(status: string): 'success' | 'warning' | 'info' | 'error' | 'default' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'processing':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Market Queue columns                                               */
/* ------------------------------------------------------------------ */

const mqColumns: Column<MarketQueueRow>[] = [
  { key: 'id', header: 'ID', sortable: true, width: '70px' },
  { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    align: 'right',
    width: '120px',
    render: (row) => usd(row.amount),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    render: (row) => (
      <Badge variant={queueBadgeVariant(row.status)}>{row.status}</Badge>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    width: '180px',
    render: (row) => formatDatetime(row.created_at),
  },
  {
    key: 'processed_at',
    header: 'Processed At',
    sortable: true,
    width: '180px',
    render: (row) => formatDatetime(row.processed_at),
  },
];

/* ------------------------------------------------------------------ */
/*  Portfolio columns                                                  */
/* ------------------------------------------------------------------ */

const portfolioColumns: Column<AggregatedPortfolio>[] = [
  { key: 'ticker', header: 'Ticker', sortable: true, width: '100px' },
  {
    key: 'totalShares',
    header: 'Total Shares',
    sortable: true,
    align: 'right',
    width: '130px',
    render: (row) => row.totalShares.toLocaleString('en-US', { maximumFractionDigits: 4 }),
  },
  {
    key: 'avgPrice',
    header: 'Avg Price',
    sortable: true,
    align: 'right',
    width: '120px',
    render: (row) => usd(row.avgPrice),
  },
  {
    key: 'currentPrice',
    header: 'Current Price',
    sortable: true,
    align: 'right',
    width: '130px',
    render: (row) => usd(row.currentPrice),
  },
  {
    key: 'totalValue',
    header: 'Total Value',
    sortable: true,
    align: 'right',
    width: '140px',
    render: (row) => usd(row.totalValue),
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-tab: Market Queue                                              */
/* ------------------------------------------------------------------ */

function MarketQueueTab() {
  const [queue, setQueue] = useState<MarketQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQueue() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('market_queue')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch market queue:', error.message);
          setQueue([]);
          return;
        }

        setQueue(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching market queue:', err);
        setQueue([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQueue();
  }, []);

  const kpis = useMemo<MarketQueueKpis>(() => {
    const today = todayDateString();
    return queue.reduce<MarketQueueKpis>(
      (acc, item) => {
        if (item.status === 'pending') acc.pending += 1;
        if (item.status === 'processing') acc.processing += 1;
        if (item.status === 'completed' && item.processed_at?.startsWith(today)) {
          acc.completedToday += 1;
        }
        return acc;
      },
      { pending: 0, processing: 0, completedToday: 0 },
    );
  }, [queue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Pending Orders" value={kpis.pending} accent="purple" />
        <KpiCard label="Processing" value={kpis.processing} accent="blue" />
        <KpiCard label="Completed Today" value={kpis.completedToday} accent="teal" />
      </div>

      <GlassCard padding="0">
        <Table<MarketQueueRow>
          columns={mqColumns}
          data={queue}
          loading={loading}
          emptyMessage="No orders in the market queue"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Portfolio Summary                                         */
/* ------------------------------------------------------------------ */

function PortfolioSummaryTab() {
  const [portfolios, setPortfolios] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPortfolios() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('portfolios')
          .select('*');

        if (error) {
          console.error('Failed to fetch portfolios:', error.message);
          setPortfolios([]);
          return;
        }

        setPortfolios(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching portfolios:', err);
        setPortfolios([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolios();
  }, []);

  /* Aggregate by ticker across all users */
  const aggregated = useMemo<AggregatedPortfolio[]>(() => {
    const map = new Map<
      string,
      { totalShares: number; weightedCost: number; currentPrice: number; totalValue: number }
    >();

    for (const p of portfolios) {
      const existing = map.get(p.ticker);
      if (existing) {
        existing.totalShares += p.shares;
        existing.weightedCost += p.average_price * p.shares;
        existing.totalValue += p.total_value;
        /* Use the latest current_price seen */
        existing.currentPrice = p.current_price;
      } else {
        map.set(p.ticker, {
          totalShares: p.shares,
          weightedCost: p.average_price * p.shares,
          currentPrice: p.current_price,
          totalValue: p.total_value,
        });
      }
    }

    const result: AggregatedPortfolio[] = [];
    map.forEach((val, ticker) => {
      result.push({
        ticker,
        totalShares: val.totalShares,
        avgPrice: val.totalShares > 0 ? val.weightedCost / val.totalShares : 0,
        currentPrice: val.currentPrice,
        totalValue: val.totalValue,
      });
    });

    return result.sort((a, b) => b.totalValue - a.totalValue);
  }, [portfolios]);

  /* Chart data */
  const chartData = useMemo<TickerChartItem[]>(() => {
    return aggregated.map((a) => ({
      name: a.ticker,
      value: parseFloat(a.totalValue.toFixed(2)),
    }));
  }, [aggregated]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <BarChart<TickerChartItem>
        data={chartData}
        dataKey="value"
        xKey="name"
        title="Total Portfolio Value by Ticker"
        color="#06B6D4"
        height={260}
      />

      <GlassCard padding="0">
        <Table<AggregatedPortfolio>
          columns={portfolioColumns}
          data={aggregated}
          loading={loading}
          emptyMessage="No portfolio holdings found"
          pageSize={20}
          rowKey={(row) => row.ticker}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function InvestmentsTab() {
  const tabs: TabItem[] = [
    {
      key: 'market-queue',
      label: 'Market Queue',
      content: <MarketQueueTab />,
    },
    {
      key: 'portfolio-summary',
      label: 'Portfolio Summary',
      content: <PortfolioSummaryTab />,
    },
  ];

  return <Tabs tabs={tabs} defaultTab="market-queue" />;
}

export default InvestmentsTab;
