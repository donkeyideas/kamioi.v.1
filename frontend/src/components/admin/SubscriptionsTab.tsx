import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Select, Modal } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SubscriptionPlan {
  id: number;
  name: string;
  account_type: string;
  tier: string;
  price_monthly: number;
  price_yearly: number;
  features: string | null;
  limits: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  auto_renewal: boolean;
  next_billing_date: string | null;
  created_at: string;
}

interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  plan_id: number | null;
  account_type: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

interface RenewalQueueItem {
  id: number;
  subscription_id: number;
  scheduled_date: string;
  status: string;
  attempt_count: number;
  error_message: string | null;
  created_at: string;
}

interface RenewalHistoryItem {
  id: number;
  subscription_id: number;
  renewal_date: string;
  amount: number;
  status: 'success' | 'failed';
  payment_method: string | null;
  error_message: string | null;
  created_at: string;
}

interface SubscriptionChange {
  id: number;
  user_id: number;
  from_plan_id: number | null;
  to_plan_id: number | null;
  change_type: 'upgrade' | 'downgrade' | 'cancel' | 'new';
  reason: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string | null;
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
}

interface PlanFormData {
  name: string;
  account_type: string;
  tier: string;
  price_monthly: string;
  price_yearly: string;
}

interface PromoFormData {
  code: string;
  description: string;
  discount_type: string;
  discount_value: string;
  max_uses: string;
  valid_from: string;
  valid_until: string;
}

interface RevenueByPlanPoint {
  name: string;
  revenue: number;
}

interface ChangesOverTimePoint {
  name: string;
  changes: number;
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

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function monthKey(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'active':
    case 'success':
      return 'success';
    case 'trial':
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'expired':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function contactStatusVariant(status: string): 'success' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'replied':
    case 'closed':
      return 'success';
    case 'new':
      return 'warning';
    case 'read':
      return 'info';
    default:
      return 'default';
  }
}

function changeTypeBadgeVariant(type: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (type) {
    case 'upgrade':
    case 'new':
      return 'success';
    case 'downgrade':
      return 'warning';
    case 'cancel':
      return 'error';
    default:
      return 'default';
  }
}

const ACCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'business', label: 'Business' },
];

const TIER_OPTIONS: SelectOption[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

const DISCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed' },
];

const CONTACT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
];

const EMPTY_PLAN_FORM: PlanFormData = {
  name: '',
  account_type: 'individual',
  tier: 'basic',
  price_monthly: '',
  price_yearly: '',
};

const EMPTY_PROMO_FORM: PromoFormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  max_uses: '',
  valid_from: '',
  valid_until: '',
};

/* ------------------------------------------------------------------ */
/*  Sub-tab: Plans                                                     */
/* ------------------------------------------------------------------ */

function PlansTab() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>(EMPTY_PLAN_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
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
      setPlans((data ?? []) as SubscriptionPlan[]);
    } catch (err) {
      console.error('Unexpected error fetching plans:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.is_active).length;
  const avgMonthly = useMemo(() => {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.price_monthly, 0) / plans.length;
  }, [plans]);

  function openCreateModal() {
    setEditingPlan(null);
    setForm(EMPTY_PLAN_FORM);
    setModalOpen(true);
  }

  function openEditModal(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      account_type: plan.account_type,
      tier: plan.tier,
      price_monthly: String(plan.price_monthly),
      price_yearly: String(plan.price_yearly),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        account_type: form.account_type,
        tier: form.tier,
        price_monthly: parseFloat(form.price_monthly) || 0,
        price_yearly: parseFloat(form.price_yearly) || 0,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingPlan.id);
        if (error) console.error('Failed to update plan:', error.message);
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert({ ...payload, is_active: true });
        if (error) console.error('Failed to create plan:', error.message);
      }

      setModalOpen(false);
      await fetchPlans();
    } catch (err) {
      console.error('Save plan error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: SubscriptionPlan) {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
        .eq('id', plan.id);
      if (error) console.error('Failed to toggle plan:', error.message);
      await fetchPlans();
    } catch (err) {
      console.error('Toggle plan error:', err);
    }
  }

  const planColumns: Column<SubscriptionPlan>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true },
      {
        key: 'account_type',
        header: 'Account Type',
        sortable: true,
        width: '130px',
        render: (row) => <Badge variant="info">{row.account_type}</Badge>,
      },
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
        render: (row) => (
          <Badge variant={row.is_active ? 'success' : 'default'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '180px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleActive(row)}>
              {row.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Plans" value={totalPlans} accent="purple" />
        <KpiCard label="Active Plans" value={activePlans} accent="teal" />
        <KpiCard label="Avg Monthly Price" value={usd(avgMonthly)} accent="blue" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={openCreateModal}>Create Plan</Button>
      </div>

      <GlassCard padding="0">
        <Table<SubscriptionPlan>
          columns={planColumns}
          data={plans}
          loading={loading}
          emptyMessage="No subscription plans found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingPlan ? 'Edit Plan' : 'Create Plan'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select
            label="Account Type"
            options={ACCOUNT_TYPE_OPTIONS}
            value={form.account_type}
            onChange={(e) => setForm({ ...form, account_type: e.target.value })}
          />
          <Select
            label="Tier"
            options={TIER_OPTIONS}
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          />
          <Input
            label="Monthly Price"
            type="number"
            value={form.price_monthly}
            onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
          />
          <Input
            label="Yearly Price"
            type="number"
            value={form.price_yearly}
            onChange={(e) => setForm({ ...form, price_yearly: e.target.value })}
          />
          <Button onClick={handleSave} loading={saving} fullWidth>
            {editingPlan ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Subscribers                                               */
/* ------------------------------------------------------------------ */

function SubscribersTab() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
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
        setSubscriptions((data ?? []) as UserSubscription[]);
      } catch (err) {
        console.error('Unexpected error fetching subscriptions:', err);
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriptions();
  }, []);

  const totalSubs = subscriptions.length;
  const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
  const trialSubs = subscriptions.filter((s) => s.status === 'trial').length;
  const monthlyRevenue = useMemo(
    () => subscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.amount, 0),
    [subscriptions],
  );

  const subscriberColumns: Column<UserSubscription>[] = useMemo(
    () => [
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
      {
        key: 'next_billing_date',
        header: 'Next Billing',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.next_billing_date),
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Subscribers" value={totalSubs} accent="purple" />
        <KpiCard label="Active" value={activeSubs} accent="teal" />
        <KpiCard label="Trial" value={trialSubs} accent="blue" />
        <KpiCard label="Monthly Revenue" value={usd(monthlyRevenue)} accent="pink" />
      </div>

      <GlassCard padding="0">
        <Table<UserSubscription>
          columns={subscriberColumns}
          data={subscriptions}
          loading={loading}
          emptyMessage="No subscribers found"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Promo Codes                                               */
/* ------------------------------------------------------------------ */

function PromoCodesTab() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PromoFormData>(EMPTY_PROMO_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPromos = useCallback(async () => {
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
      setPromos((data ?? []) as PromoCode[]);
    } catch (err) {
      console.error('Unexpected error fetching promo codes:', err);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const totalCodes = promos.length;
  const activeCodes = promos.filter((p) => p.is_active).length;
  const totalRedemptions = useMemo(
    () => promos.reduce((sum, p) => sum + p.current_uses, 0),
    [promos],
  );

  async function handleCreate() {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: true,
        current_uses: 0,
      };
      const { error } = await supabase.from('promo_codes').insert(payload);
      if (error) console.error('Failed to create promo code:', error.message);
      setModalOpen(false);
      setForm(EMPTY_PROMO_FORM);
      await fetchPromos();
    } catch (err) {
      console.error('Create promo code error:', err);
    } finally {
      setSaving(false);
    }
  }

  const promoColumns: Column<PromoCode>[] = useMemo(
    () => [
      { key: 'code', header: 'Code', sortable: true, width: '140px' },
      {
        key: 'description',
        header: 'Description',
        render: (row) => row.description ?? '--',
      },
      {
        key: 'discount_value',
        header: 'Discount',
        sortable: true,
        align: 'right',
        width: '120px',
        render: (row) =>
          row.discount_type === 'percentage' ? `${row.discount_value}%` : usd(row.discount_value),
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
        render: (row) => (
          <Badge variant={row.is_active ? 'success' : 'default'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'valid_until',
        header: 'Valid Until',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.valid_until),
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Codes" value={totalCodes} accent="purple" />
        <KpiCard label="Active Codes" value={activeCodes} accent="teal" />
        <KpiCard label="Total Redemptions" value={totalRedemptions} accent="blue" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => { setForm(EMPTY_PROMO_FORM); setModalOpen(true); }}>
          Create Promo Code
        </Button>
      </div>

      <GlassCard padding="0">
        <Table<PromoCode>
          columns={promoColumns}
          data={promos}
          loading={loading}
          emptyMessage="No promo codes found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Promo Code">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select
            label="Discount Type"
            options={DISCOUNT_TYPE_OPTIONS}
            value={form.discount_type}
            onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
          />
          <Input
            label="Discount Value"
            type="number"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
          />
          <Input
            label="Max Uses"
            type="number"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
          />
          <Input
            label="Valid From"
            type="date"
            value={form.valid_from}
            onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
          />
          <Input
            label="Valid Until"
            type="date"
            value={form.valid_until}
            onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
          />
          <Button onClick={handleCreate} loading={saving} fullWidth>
            Create Promo Code
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Renewals                                                  */
/* ------------------------------------------------------------------ */

function RenewalsTab() {
  const [queue, setQueue] = useState<RenewalQueueItem[]>([]);
  const [history, setHistory] = useState<RenewalHistoryItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function fetchQueue() {
      try {
        const { data, error } = await supabase
          .from('renewal_queue')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Failed to fetch renewal queue:', error.message);
          setQueue([]);
          return;
        }
        setQueue((data ?? []) as RenewalQueueItem[]);
      } catch (err) {
        console.error('Error fetching renewal queue:', err);
        setQueue([]);
      } finally {
        setLoadingQueue(false);
      }
    }

    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('renewal_history')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Failed to fetch renewal history:', error.message);
          setHistory([]);
          return;
        }
        setHistory((data ?? []) as RenewalHistoryItem[]);
      } catch (err) {
        console.error('Error fetching renewal history:', err);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchQueue();
    fetchHistory();
  }, []);

  const pendingCount = queue.length;
  const successCount = history.filter((h) => h.status === 'success').length;
  const failedCount = history.filter((h) => h.status === 'failed').length;

  const queueColumns: Column<RenewalQueueItem>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'subscription_id', header: 'Subscription ID', sortable: true, width: '140px' },
      {
        key: 'scheduled_date',
        header: 'Scheduled Date',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.scheduled_date),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
      },
      { key: 'attempt_count', header: 'Attempts', sortable: true, width: '100px', align: 'right' },
      {
        key: 'error_message',
        header: 'Error Message',
        render: (row) => row.error_message ? truncate(row.error_message, 60) : '--',
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

  const historyColumns: Column<RenewalHistoryItem>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'subscription_id', header: 'Subscription ID', sortable: true, width: '140px' },
      {
        key: 'renewal_date',
        header: 'Date',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.renewal_date),
      },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        width: '100px',
        render: (row) => usd(row.amount),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '100px',
        render: (row) => <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
      },
      {
        key: 'payment_method',
        header: 'Payment Method',
        width: '140px',
        render: (row) => row.payment_method ?? '--',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Pending Renewals" value={pendingCount} accent="purple" />
        <KpiCard label="Successful" value={successCount} accent="teal" />
        <KpiCard label="Failed" value={failedCount} accent="pink" />
      </div>

      <GlassCard padding="0">
        <div style={{ padding: '16px 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Renewal Queue
        </div>
        <Table<RenewalQueueItem>
          columns={queueColumns}
          data={queue}
          loading={loadingQueue}
          emptyMessage="No pending renewals"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <GlassCard padding="0">
        <div style={{ padding: '16px 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Renewal History
        </div>
        <Table<RenewalHistoryItem>
          columns={historyColumns}
          data={history}
          loading={loadingHistory}
          emptyMessage="No renewal history"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Analytics                                                 */
/* ------------------------------------------------------------------ */

function AnalyticsTab() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [changes, setChanges] = useState<SubscriptionChange[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subsResult, changesResult, plansResult] = await Promise.all([
          supabase.from('user_subscriptions').select('*'),
          supabase.from('subscription_changes').select('*').order('created_at', { ascending: false }),
          supabase.from('subscription_plans').select('*'),
        ]);
        setSubscriptions((subsResult.data ?? []) as UserSubscription[]);
        setChanges((changesResult.data ?? []) as SubscriptionChange[]);
        setPlans((plansResult.data ?? []) as SubscriptionPlan[]);
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const planNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of plans) {
      map.set(p.id, p.name);
    }
    return map;
  }, [plans]);

  const revenueByPlan: RevenueByPlanPoint[] = useMemo(() => {
    const map = new Map<number, number>();
    for (const sub of subscriptions) {
      map.set(sub.plan_id, (map.get(sub.plan_id) ?? 0) + sub.amount);
    }
    const points: RevenueByPlanPoint[] = [];
    for (const [planId, revenue] of map) {
      points.push({ name: planNameMap.get(planId) ?? `Plan ${planId}`, revenue });
    }
    return points;
  }, [subscriptions, planNameMap]);

  const changesOverTime: ChangesOverTimePoint[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of changes) {
      const key = monthKey(c.created_at);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const points: ChangesOverTimePoint[] = [];
    for (const [name, count] of map) {
      points.push({ name, changes: count });
    }
    return points;
  }, [changes]);

  const changeColumns: Column<SubscriptionChange>[] = useMemo(
    () => [
      { key: 'user_id', header: 'User ID', sortable: true, width: '90px' },
      {
        key: 'from_plan_id',
        header: 'From Plan',
        width: '120px',
        render: (row) => (row.from_plan_id != null ? planNameMap.get(row.from_plan_id) ?? `Plan ${row.from_plan_id}` : '--'),
      },
      {
        key: 'to_plan_id',
        header: 'To Plan',
        width: '120px',
        render: (row) => (row.to_plan_id != null ? planNameMap.get(row.to_plan_id) ?? `Plan ${row.to_plan_id}` : '--'),
      },
      {
        key: 'change_type',
        header: 'Change Type',
        sortable: true,
        width: '120px',
        render: (row) => <Badge variant={changeTypeBadgeVariant(row.change_type)}>{row.change_type}</Badge>,
      },
      {
        key: 'reason',
        header: 'Reason',
        render: (row) => row.reason ?? '--',
      },
      {
        key: 'admin_notes',
        header: 'Admin Notes',
        render: (row) => row.admin_notes ? truncate(row.admin_notes, 40) : '--',
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [planNameMap],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <BarChart<RevenueByPlanPoint>
        data={revenueByPlan}
        dataKey="revenue"
        xKey="name"
        title="Revenue by Plan"
        color="#7C3AED"
        height={280}
      />

      <LineChart<ChangesOverTimePoint>
        data={changesOverTime}
        dataKey="changes"
        xKey="name"
        title="Subscription Changes Over Time"
        color="#3B82F6"
        height={280}
      />

      <GlassCard padding="0">
        <div style={{ padding: '16px 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Subscription Changes
        </div>
        <Table<SubscriptionChange>
          columns={changeColumns}
          data={changes}
          loading={false}
          emptyMessage="No subscription changes found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Demo Requests                                             */
/* ------------------------------------------------------------------ */

function DemoRequestsTab() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
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
      setMessages((data ?? []) as ContactMessage[]);
    } catch (err) {
      console.error('Error fetching contact messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const totalRequests = messages.length;
  const newUnread = messages.filter((m) => m.status === 'new').length;

  async function updateStatus(id: number, status: string) {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', id);
      if (error) console.error('Failed to update status:', error.message);
      await fetchMessages();
    } catch (err) {
      console.error('Update status error:', err);
    }
  }

  const contactColumns: Column<ContactMessage>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, width: '150px' },
      { key: 'email', header: 'Email', sortable: true, width: '200px' },
      {
        key: 'subject',
        header: 'Subject',
        sortable: true,
        render: (row) => row.subject ?? '--',
      },
      {
        key: 'message',
        header: 'Message',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.message ? truncate(row.message, 60) : '--'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '140px',
        render: (row) => (
          <Select
            options={CONTACT_STATUS_OPTIONS}
            value={row.status}
            onChange={(e) => updateStatus(row.id, e.target.value)}
            style={{ minWidth: '100px' }}
          />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Requests" value={totalRequests} accent="purple" />
        <KpiCard label="New / Unread" value={newUnread} accent="pink" />
      </div>

      <GlassCard padding="0">
        <Table<ContactMessage>
          columns={contactColumns}
          data={messages}
          loading={loading}
          emptyMessage="No contact messages found"
          pageSize={15}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedMessage(row)}
        />
      </GlassCard>

      <Modal
        open={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
        title="Message Detail"
        size="lg"
      >
        {selectedMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>From</span>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0' }}>
                {selectedMessage.name} ({selectedMessage.email})
              </p>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Subject</span>
              <p style={{ color: 'var(--text-primary)', margin: '4px 0 0' }}>{selectedMessage.subject ?? '--'}</p>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Message</span>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.6 }}>
                {selectedMessage.message ?? '--'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status:</span>
              <Badge variant={contactStatusVariant(selectedMessage.status)}>
                {selectedMessage.status}
              </Badge>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Received: {formatDate(selectedMessage.created_at)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SubscriptionsTab() {
  const tabs: TabItem[] = [
    { key: 'analytics', label: 'Analytics', content: <AnalyticsTab /> },
    { key: 'plans', label: 'Plans', content: <PlansTab /> },
    { key: 'subscribers', label: 'Subscribers', content: <SubscribersTab /> },
    { key: 'promo-codes', label: 'Promo Codes', content: <PromoCodesTab /> },
    { key: 'renewals', label: 'Renewals', content: <RenewalsTab /> },
    { key: 'demo-requests', label: 'Demo Requests', content: <DemoRequestsTab /> },
  ];

  return <Tabs tabs={tabs} defaultTab="analytics" />;
}

export default SubscriptionsTab;
