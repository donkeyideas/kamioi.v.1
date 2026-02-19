import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubscriptionPlanRow = Database['public']['Tables']['subscription_plans']['Row'];
type UserSubscriptionRow = Database['public']['Tables']['user_subscriptions']['Row'];
type PromoCodeRow = Database['public']['Tables']['promo_codes']['Row'];
type ContactMessageRow = Database['public']['Tables']['contact_messages']['Row'];

interface SubscriberKpis {
  total: number;
  active: number;
  monthlyRevenue: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function activeBadge(isActive: boolean) {
  return (
    <Badge variant={isActive ? 'success' : 'default'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
    case 'past_due':
      return 'warning';
    case 'canceled':
    case 'cancelled':
      return 'error';
    case 'paused':
      return 'info';
    default:
      return 'default';
  }
}

function contactStatusVariant(status: string): 'success' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'success';
    case 'pending':
    case 'new':
      return 'warning';
    case 'in_progress':
      return 'info';
    default:
      return 'default';
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Plans                                                     */
/* ------------------------------------------------------------------ */

const planColumns: Column<SubscriptionPlanRow>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'account_type', header: 'Account Type', sortable: true, width: '130px' },
  { key: 'tier', header: 'Tier', sortable: true, width: '100px' },
  {
    key: 'price_monthly',
    header: 'Monthly',
    sortable: true,
    align: 'right',
    width: '110px',
    render: (row) => usd(row.price_monthly),
  },
  {
    key: 'price_yearly',
    header: 'Yearly',
    sortable: true,
    align: 'right',
    width: '110px',
    render: (row) => usd(row.price_yearly),
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    width: '100px',
    render: (row) => activeBadge(row.is_active),
  },
];

function PlansTab() {
  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch plans:', error.message);
          setPlans([]);
          return;
        }

        setPlans(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching plans:', err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return (
    <GlassCard padding="0">
      <Table<SubscriptionPlanRow>
        columns={planColumns}
        data={plans}
        loading={loading}
        emptyMessage="No subscription plans found"
        pageSize={10}
        rowKey={(row) => row.id}
      />
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Subscribers                                               */
/* ------------------------------------------------------------------ */

const subscriberColumns: Column<UserSubscriptionRow>[] = [
  { key: 'id', header: 'ID', sortable: true, width: '70px' },
  { key: 'user_id', header: 'User ID', sortable: true, width: '90px' },
  { key: 'plan_id', header: 'Plan ID', sortable: true, width: '90px' },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    render: (row) => <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
  },
  { key: 'billing_cycle', header: 'Billing Cycle', sortable: true, width: '120px' },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    align: 'right',
    width: '100px',
    render: (row) => usd(row.amount),
  },
  {
    key: 'next_billing_date',
    header: 'Next Billing',
    sortable: true,
    width: '130px',
    render: (row) => formatDate(row.next_billing_date),
  },
  {
    key: 'auto_renewal',
    header: 'Auto-Renewal',
    sortable: true,
    width: '120px',
    render: (row) => (
      <Badge variant={row.auto_renewal ? 'success' : 'default'}>
        {row.auto_renewal ? 'Yes' : 'No'}
      </Badge>
    ),
  },
];

function SubscribersTab() {
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscriptions() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch subscriptions:', error.message);
          setSubscriptions([]);
          return;
        }

        setSubscriptions(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching subscriptions:', err);
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptions();
  }, []);

  const kpis = useMemo<SubscriberKpis>(() => {
    return subscriptions.reduce<SubscriberKpis>(
      (acc, sub) => {
        acc.total += 1;
        if (sub.status === 'active') {
          acc.active += 1;
          if (sub.billing_cycle === 'monthly') {
            acc.monthlyRevenue += sub.amount;
          } else if (sub.billing_cycle === 'yearly') {
            /* Normalize yearly to monthly */
            acc.monthlyRevenue += sub.amount / 12;
          }
        }
        return acc;
      },
      { total: 0, active: 0, monthlyRevenue: 0 },
    );
  }, [subscriptions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Subscribers" value={kpis.total} accent="purple" />
        <KpiCard label="Active" value={kpis.active} accent="teal" />
        <KpiCard label="Monthly Revenue" value={usd(kpis.monthlyRevenue)} accent="blue" />
      </div>

      <GlassCard padding="0">
        <Table<UserSubscriptionRow>
          columns={subscriberColumns}
          data={subscriptions}
          loading={loading}
          emptyMessage="No subscribers found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Promo Codes                                               */
/* ------------------------------------------------------------------ */

const promoColumns: Column<PromoCodeRow>[] = [
  { key: 'code', header: 'Code', sortable: true, width: '140px' },
  { key: 'description', header: 'Description', render: (row) => row.description ?? '--' },
  { key: 'discount_type', header: 'Discount Type', sortable: true, width: '130px' },
  {
    key: 'discount_value',
    header: 'Discount Value',
    sortable: true,
    align: 'right',
    width: '130px',
    render: (row) =>
      row.discount_type === 'percentage'
        ? `${row.discount_value}%`
        : usd(row.discount_value),
  },
  {
    key: 'max_uses',
    header: 'Max Uses',
    sortable: true,
    align: 'right',
    width: '100px',
    render: (row) => (row.max_uses != null ? row.max_uses.toString() : 'Unlimited'),
  },
  {
    key: 'current_uses',
    header: 'Current Uses',
    sortable: true,
    align: 'right',
    width: '120px',
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    width: '100px',
    render: (row) => activeBadge(row.is_active),
  },
  {
    key: 'valid_until',
    header: 'Valid Until',
    sortable: true,
    width: '130px',
    render: (row) => formatDate(row.valid_until),
  },
];

function PromoCodesTab() {
  const [promos, setPromos] = useState<PromoCodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch promo codes:', error.message);
          setPromos([]);
          return;
        }

        setPromos(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching promo codes:', err);
        setPromos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPromos();
  }, []);

  return (
    <GlassCard padding="0">
      <Table<PromoCodeRow>
        columns={promoColumns}
        data={promos}
        loading={loading}
        emptyMessage="No promo codes found"
        pageSize={20}
        rowKey={(row) => row.id}
      />
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Demo Requests                                             */
/* ------------------------------------------------------------------ */

const contactColumns: Column<ContactMessageRow>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    width: '150px',
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    width: '200px',
  },
  {
    key: 'subject',
    header: 'Subject',
    sortable: true,
    render: (row) => row.subject ?? '--',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    render: (row) => (
      <Badge variant={contactStatusVariant(row.status)}>{row.status}</Badge>
    ),
  },
  {
    key: 'created_at',
    header: 'Date',
    sortable: true,
    width: '130px',
    render: (row) => formatDate(row.created_at),
  },
];

function DemoRequestsTab() {
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch contact messages:', error.message);
          setMessages([]);
          return;
        }

        setMessages(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching contact messages:', err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, []);

  return (
    <GlassCard padding="0">
      <Table<ContactMessageRow>
        columns={contactColumns}
        data={messages}
        loading={loading}
        emptyMessage="No contact messages found"
        pageSize={20}
        rowKey={(row) => row.id}
      />
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SubscriptionsTab() {
  const tabs: TabItem[] = [
    {
      key: 'plans',
      label: 'Plans',
      content: <PlansTab />,
    },
    {
      key: 'subscribers',
      label: 'Subscribers',
      content: <SubscribersTab />,
    },
    {
      key: 'promo-codes',
      label: 'Promo Codes',
      content: <PromoCodesTab />,
    },
    {
      key: 'demo-requests',
      label: 'Demo Requests',
      content: <DemoRequestsTab />,
    },
  ];

  return <Tabs tabs={tabs} defaultTab="plans" />;
}

export default SubscriptionsTab;
