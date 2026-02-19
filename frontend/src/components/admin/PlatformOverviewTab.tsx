import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { KpiCard, GlassCard, ActivityFeed } from '@/components/ui';
import type { ActivityItem } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';

/* ---------- Types ---------- */

interface UserGrowthPoint {
  name: string;
  users: number;
}

interface RevenuePlanPoint {
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

function monthLabel(dateString: string): string {
  const d = new Date(dateString);
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
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingMappings, setPendingMappings] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [usersByMonth, setUsersByMonth] = useState<UserGrowthPoint[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenuePlanPoint[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEventRow[]>([]);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [
          usersResult,
          subscriptionsResult,
          pendingResult,
          activeSubsResult,
          usersListResult,
          revenueResult,
          eventsResult,
        ] = await Promise.all([
          /* Total users count */
          supabase.from('users').select('id', { count: 'exact', head: true }),

          /* Total revenue from user_subscriptions */
          supabase.from('user_subscriptions').select('amount'),

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

          /* Users list for growth chart (only created_at needed) */
          supabase
            .from('users')
            .select('created_at')
            .order('created_at', { ascending: true }),

          /* Revenue by plan: join user_subscriptions with subscription_plans */
          supabase
            .from('user_subscriptions')
            .select('amount, subscription_plans(name)')
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
        const revTotal = (subscriptionsResult.data ?? []).reduce(
          (sum: number, row: { amount: number }) => sum + (row.amount ?? 0),
          0,
        );
        setTotalRevenue(revTotal);

        /* KPI: Pending Mappings */
        setPendingMappings(pendingResult.count ?? 0);

        /* KPI: Active Subscriptions */
        setActiveSubscriptions(activeSubsResult.count ?? 0);

        /* Chart: User Growth by month */
        const monthMap = new Map<string, number>();
        for (const row of usersListResult.data ?? []) {
          const key = monthLabel(row.created_at);
          monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
        }
        const growthData: UserGrowthPoint[] = [];
        for (const [name, users] of monthMap) {
          growthData.push({ name, users });
        }
        setUsersByMonth(growthData);

        /* Chart: Revenue by Plan */
        const planRevenueMap = new Map<string, number>();
        for (const row of revenueResult.data ?? []) {
          const planData = row.subscription_plans as unknown as { name: string } | null;
          const planName = planData?.name ?? 'Unknown';
          planRevenueMap.set(planName, (planRevenueMap.get(planName) ?? 0) + (row.amount ?? 0));
        }
        const planData: RevenuePlanPoint[] = [];
        for (const [name, revenue] of planRevenueMap) {
          planData.push({ name, revenue });
        }
        setRevenueByPlan(planData);

        /* Activity Feed: System Events */
        setSystemEvents((eventsResult.data as SystemEventRow[]) ?? []);
      } catch (err) {
        console.error('PlatformOverviewTab fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile?.id]);

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
        <BarChart<RevenuePlanPoint>
          data={revenueByPlan}
          dataKey="revenue"
          xKey="name"
          title="Revenue by Plan"
          color="#06B6D4"
          height={260}
        />
      </div>

      {/* Recent System Events */}
      <GlassCard accent="purple" padding="24px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '16px',
          }}
        >
          Recent System Events
        </p>
        <ActivityFeed items={activityItems} emptyMessage="No recent system events" />
      </GlassCard>
    </div>
  );
}
