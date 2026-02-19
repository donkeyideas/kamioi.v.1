import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { KpiCard, Table, Badge, Input } from '@/components/ui';
import type { Column } from '@/components/ui';

/* ---------- Types ---------- */

type AccountType = 'individual' | 'family' | 'business' | 'admin';

interface UserRow {
  id: number;
  name: string;
  email: string;
  account_type: AccountType;
  subscription_tier: string | null;
  round_up_amount: number;
  created_at: string;
}

interface SubscriptionJoin {
  user_id: number;
  status: string;
}

interface EnrichedUser extends UserRow {
  subscription_status: string | null;
}

/* ---------- Helpers ---------- */

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

const ACCOUNT_TYPE_BADGE: Record<AccountType, 'purple' | 'info' | 'success' | 'warning'> = {
  admin: 'purple',
  business: 'info',
  family: 'success',
  individual: 'warning',
};

/* ---------- Component ---------- */

export function UserManagementTab() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [activeSubCount, setActiveSubCount] = useState(0);
  const [newThisMonth, setNewThisMonth] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [usersResult, subscriptionsResult] = await Promise.all([
          supabase
            .from('users')
            .select('id, name, email, account_type, subscription_tier, round_up_amount, created_at')
            .order('created_at', { ascending: false }),

          supabase.from('user_subscriptions').select('user_id, status'),
        ]);

        const rawUsers = (usersResult.data ?? []) as UserRow[];
        const subs = (subscriptionsResult.data ?? []) as SubscriptionJoin[];

        /* Build a map: user_id -> most relevant subscription status */
        const subStatusMap = new Map<number, string>();
        for (const sub of subs) {
          /* Prefer 'active' status if user has multiple */
          const existing = subStatusMap.get(sub.user_id);
          if (!existing || sub.status === 'active') {
            subStatusMap.set(sub.user_id, sub.status);
          }
        }

        /* Enrich users with subscription status */
        const enriched: EnrichedUser[] = rawUsers.map((u) => ({
          ...u,
          subscription_status: subStatusMap.get(u.id) ?? null,
        }));

        setUsers(enriched);

        /* KPI: Active subscribers */
        const activeCount = subs.filter((s) => s.status === 'active').length;
        /* Deduplicate by user_id for active count */
        const activeUserIds = new Set(
          subs.filter((s) => s.status === 'active').map((s) => s.user_id),
        );
        setActiveSubCount(activeUserIds.size > 0 ? activeUserIds.size : activeCount);

        /* KPI: New this month */
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newCount = rawUsers.filter(
          (u) => new Date(u.created_at) >= startOfMonth,
        ).length;
        setNewThisMonth(newCount);
      } catch (err) {
        console.error('UserManagementTab fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile?.id]);

  /* Client-side search filter */
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  /* Table columns */
  const columns: Column<EnrichedUser>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        width: '18%',
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        width: '22%',
      },
      {
        key: 'account_type',
        header: 'Account Type',
        sortable: true,
        width: '14%',
        render: (row: EnrichedUser) => (
          <Badge variant={ACCOUNT_TYPE_BADGE[row.account_type] ?? 'default'}>
            {row.account_type}
          </Badge>
        ),
      },
      {
        key: 'subscription_tier',
        header: 'Subscription Tier',
        sortable: true,
        width: '14%',
        render: (row: EnrichedUser) => (
          <span style={{ color: row.subscription_tier ? '#F8FAFC' : 'rgba(248,250,252,0.3)' }}>
            {row.subscription_tier ?? 'None'}
          </span>
        ),
      },
      {
        key: 'round_up_amount',
        header: 'Round-Up',
        sortable: true,
        align: 'right' as const,
        width: '12%',
        render: (row: EnrichedUser) => formatCurrency(row.round_up_amount),
      },
      {
        key: 'created_at',
        header: 'Joined',
        sortable: true,
        width: '14%',
        render: (row: EnrichedUser) => (
          <span style={{ color: 'rgba(248,250,252,0.5)' }}>
            {formatDate(row.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading user data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search */}
      <div style={{ maxWidth: '400px' }}>
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Users" value={formatNumber(users.length)} accent="purple" />
        <KpiCard label="Active Subscribers" value={formatNumber(activeSubCount)} accent="teal" />
        <KpiCard label="New This Month" value={formatNumber(newThisMonth)} accent="blue" />
      </div>

      {/* Users Table */}
      <Table<EnrichedUser>
        columns={columns}
        data={filteredUsers}
        loading={false}
        pageSize={15}
        emptyMessage="No users found"
        rowKey={(row) => row.id}
      />
    </div>
  );
}
