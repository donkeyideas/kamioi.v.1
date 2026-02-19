import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Badge, ActivityFeed, QuickActions } from '@/components/ui';
import type { ActivityItem, QuickAction } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ---------- Types ---------- */

interface UserGrowthPoint {
  name: string;
  users: number;
}

interface RevenueTrendPoint {
  name: string;
  revenue: number;
}

interface SystemEventRow {
  id: number;
  event_type: string;
  source: string | null;
  created_at: string;
}

/* ---------- Helpers ---------- */

function formatCurrency(value: number): string {
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
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getLast12MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
  }
  return keys;
}

const EVENT_COLORS: Record<string, ActivityItem['color']> = {
  subscription: 'purple',
  payment: 'teal',
  user: 'blue',
  error: 'pink',
};

function eventColor(eventType: string): ActivityItem['color'] {
  const lower = eventType.toLowerCase();
  for (const [keyword, color] of Object.entries(EVENT_COLORS)) {
    if (lower.includes(keyword)) return color;
  }
  return 'blue';
}

/* ---------- Component ---------- */

export function PlatformOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingMappings, setPendingMappings] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [usersByMonth, setUsersByMonth] = useState<UserGrowthPoint[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueTrendPoint[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEventRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          usersResult,
          revenueResult,
          pendingResult,
          activeSubsResult,
          usersListResult,
          subsListResult,
          eventsResult,
        ] = await Promise.all([
          /* Total users count */
          supabase.from('users').select('id', { count: 'exact', head: true }),

          /* Total revenue from active subscriptions */
          supabase
            .from('user_subscriptions')
            .select('amount')
            .eq('status', 'active'),

          /* Pending mappings count */
          supabase
            .from('llm_mappings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),

          /* Active subscriptions count */
          supabase
            .from('user_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),

          /* Users list for growth chart */
          supabase
            .from('users')
            .select('created_at')
            .order('created_at', { ascending: true }),

          /* Subscriptions list for revenue trend chart */
          supabase
            .from('user_subscriptions')
            .select('amount, created_at')
            .eq('status', 'active'),

          /* Recent system events */
          supabase
            .from('system_events')
            .select('id, event_type, source, created_at')
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        /* KPI: Total Users */
        setTotalUsers(usersResult.count ?? 0);

        /* KPI: Total Revenue */
        const revTotal = (revenueResult.data ?? []).reduce(
          (sum: number, row: { amount: number }) => sum + (row.amount ?? 0),
          0,
        );
        setTotalRevenue(revTotal);

        /* KPI: Pending Mappings */
        setPendingMappings(pendingResult.count ?? 0);

        /* KPI: Active Subscriptions */
        setActiveSubscriptions(activeSubsResult.count ?? 0);

        /* Chart: User Growth by month (last 12 months) */
        const last12 = getLast12MonthKeys();
        const userMonthMap = new Map<string, number>();
        for (const key of last12) {
          userMonthMap.set(key, 0);
        }
        for (const row of usersListResult.data ?? []) {
          const key = monthKey(row.created_at);
          if (userMonthMap.has(key)) {
            userMonthMap.set(key, (userMonthMap.get(key) ?? 0) + 1);
          }
        }
        const growthData: UserGrowthPoint[] = last12.map((key) => ({
          name: monthLabel(key),
          users: userMonthMap.get(key) ?? 0,
        }));
        setUsersByMonth(growthData);

        /* Chart: Revenue Trend by month (last 12 months) */
        const revMonthMap = new Map<string, number>();
        for (const key of last12) {
          revMonthMap.set(key, 0);
        }
        for (const row of subsListResult.data ?? []) {
          const key = monthKey(row.created_at);
          if (revMonthMap.has(key)) {
            revMonthMap.set(key, (revMonthMap.get(key) ?? 0) + (row.amount ?? 0));
          }
        }
        const revData: RevenueTrendPoint[] = last12.map((key) => ({
          name: monthLabel(key),
          revenue: revMonthMap.get(key) ?? 0,
        }));
        setRevenueByMonth(revData);

        /* Activity Feed: System Events */
        setSystemEvents((eventsResult.data as SystemEventRow[]) ?? []);
      } catch (err) {
        console.error('PlatformOverviewTab fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  /* Map system events to ActivityFeed items */
  const activityItems: ActivityItem[] = useMemo(
    () =>
      systemEvents.map((evt) => ({
        color: eventColor(evt.event_type),
        text: `${evt.event_type}${evt.source ? ` from ${evt.source}` : ''}`,
        time: timeAgo(evt.created_at),
      })),
    [systemEvents],
  );

  /* Quick actions */
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        label: 'Manage Users',
        gradient: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.1))',
        onClick: () => {},
      },
      {
        label: 'Process Investments',
        gradient: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.1))',
        onClick: () => {},
      },
      {
        label: 'View Financial Reports',
        gradient: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))',
        onClick: () => {},
      },
      {
        label: 'System Settings',
        gradient: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(236,72,153,0.1))',
        onClick: () => {},
      },
    ],
    [],
  );

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading platform overview...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Users" value={formatNumber(totalUsers)} accent="purple" />
        <KpiCard label="Total Revenue" value={formatCurrency(totalRevenue)} accent="teal" />
        <KpiCard label="Pending Mappings" value={formatNumber(pendingMappings)} accent="pink" />
        <KpiCard
          label="Active Subscriptions"
          value={formatNumber(activeSubscriptions)}
          accent="blue"
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
        }}
      >
        <BarChart<UserGrowthPoint>
          data={usersByMonth}
          dataKey="users"
          xKey="name"
          title="User Growth"
          color="#7C3AED"
          height={260}
        />
        <LineChart<RevenueTrendPoint>
          data={revenueByMonth}
          dataKey="revenue"
          xKey="name"
          title="Revenue Trend"
          color="#06B6D4"
          height={260}
        />
      </div>

      {/* System Status */}
      <GlassCard accent="blue" padding="24px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '16px',
          }}
        >
          System Status
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', fontWeight: 500 }}>
              Database
            </span>
            <Badge variant="success">Healthy</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', fontWeight: 500 }}>
              Auth Service
            </span>
            <Badge variant="success">Active</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', fontWeight: 500 }}>
              Pending Queue
            </span>
            <Badge variant={pendingMappings > 0 ? 'warning' : 'success'}>
              {pendingMappings > 0 ? `${pendingMappings} pending` : 'Clear'}
            </Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', fontWeight: 500 }}>
              API Services
            </span>
            <Badge variant="success">Running</Badge>
          </div>
        </div>
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard accent="purple" padding="24px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '16px',
          }}
        >
          Recent Activity
        </p>
        <ActivityFeed items={activityItems} emptyMessage="No recent system events" />
      </GlassCard>

      {/* Quick Actions */}
      <GlassCard accent="teal" padding="24px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '16px',
          }}
        >
          Quick Actions
        </p>
        <QuickActions actions={quickActions} />
      </GlassCard>
    </div>
  );
}
