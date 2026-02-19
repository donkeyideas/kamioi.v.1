import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Input, Select, Modal } from '@/components/ui';
import type { Column, SelectOption } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

/* ---------- Types ---------- */

type AccountType = 'individual' | 'family' | 'business' | 'admin';

interface UserRow {
  id: number;
  auth_id: string | null;
  name: string;
  email: string;
  account_type: AccountType;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  round_up_amount: number;
  subscription_tier: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AccountTypeChartPoint {
  name: string;
  count: number;
}

interface RegistrationTrendPoint {
  name: string;
  users: number;
}

/* ---------- Constants ---------- */

const ACCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Types' },
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'business', label: 'Business' },
  { value: 'admin', label: 'Admin' },
];

const ACCOUNT_TYPE_BADGE: Record<AccountType, 'purple' | 'info' | 'success' | 'warning'> = {
  individual: 'purple',
  family: 'info',
  business: 'success',
  admin: 'warning',
};

const TYPE_PREFIX: Record<AccountType, string> = {
  individual: 'I',
  family: 'F',
  business: 'B',
  admin: 'A',
};

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

function formatUserId(accountType: AccountType, id: number): string {
  const prefix = TYPE_PREFIX[accountType] ?? '?';
  return `${prefix}-${String(id).padStart(7, '0')}`;
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

function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
  }
  return keys;
}

/* ---------- CSV Export ---------- */

function exportUsersCsv(rows: UserRow[]): void {
  const headers = [
    'User ID', 'Name', 'Email', 'Account Type', 'Phone', 'City', 'State',
    'Zip Code', 'Subscription Tier', 'Round-Up Amount', 'Created At',
  ];

  const csvRows = rows.map((r) => [
    formatUserId(r.account_type, r.id),
    `"${(r.name ?? '').replace(/"/g, '""')}"`,
    `"${(r.email ?? '').replace(/"/g, '""')}"`,
    r.account_type,
    r.phone ?? '',
    `"${(r.city ?? '').replace(/"/g, '""')}"`,
    r.state ?? '',
    r.zip_code ?? '',
    r.subscription_tier ?? '',
    r.round_up_amount,
    r.created_at,
  ]);

  const csvString = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/* ---------- Modal detail row ---------- */

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(248,250,252,0.5)',
  fontWeight: 500,
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#F8FAFC',
  fontWeight: 600,
  textAlign: 'right',
};

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={detailRowStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <span style={detailValueStyle}>{value ?? '--'}</span>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#F8FAFC',
  marginTop: '12px',
  marginBottom: '4px',
  paddingBottom: '4px',
  borderBottom: '1px solid rgba(124,58,237,0.3)',
};

/* ---------- Component ---------- */

export function UserManagementTab() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, auth_id, name, email, account_type, city, state, zip_code, phone, round_up_amount, subscription_tier, subscription_status, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('UserManagementTab fetch error:', error.message);
          setUsers([]);
          return;
        }

        setUsers((data as UserRow[]) ?? []);
      } catch (err) {
        console.error('UserManagementTab fetch error:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  /* Client-side filtering */
  const filteredUsers = useMemo(() => {
    let list = users;

    if (accountTypeFilter !== 'all') {
      list = list.filter((u) => u.account_type === accountTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    return list;
  }, [users, accountTypeFilter, searchQuery]);

  /* KPI values */
  const kpis = useMemo(() => {
    const total = users.length;
    const individual = users.filter((u) => u.account_type === 'individual').length;
    const family = users.filter((u) => u.account_type === 'family').length;
    const business = users.filter((u) => u.account_type === 'business').length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = users.filter(
      (u) => new Date(u.created_at) >= startOfMonth,
    ).length;

    return { total, individual, family, business, newThisMonth };
  }, [users]);

  /* Chart data: Users by account type */
  const accountTypeChartData = useMemo<AccountTypeChartPoint[]>(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      map.set(u.account_type, (map.get(u.account_type) ?? 0) + 1);
    }
    const result: AccountTypeChartPoint[] = [];
    for (const [name, count] of map) {
      result.push({ name, count });
    }
    return result;
  }, [users]);

  /* Chart data: Registration trend (last 6 months) */
  const registrationTrend = useMemo<RegistrationTrendPoint[]>(() => {
    const last6 = getLast6MonthKeys();
    const monthMap = new Map<string, number>();
    for (const key of last6) {
      monthMap.set(key, 0);
    }
    for (const u of users) {
      const key = monthKey(u.created_at);
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      }
    }
    return last6.map((key) => ({
      name: monthLabel(key),
      users: monthMap.get(key) ?? 0,
    }));
  }, [users]);

  /* Table columns */
  const columns: Column<UserRow>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'User ID',
        sortable: true,
        width: '120px',
        render: (row: UserRow) => (
          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            {formatUserId(row.account_type, row.id)}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        width: '16%',
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        width: '20%',
      },
      {
        key: 'account_type',
        header: 'Account Type',
        sortable: true,
        width: '12%',
        render: (row: UserRow) => (
          <Badge variant={ACCOUNT_TYPE_BADGE[row.account_type] ?? 'default'}>
            {row.account_type}
          </Badge>
        ),
      },
      {
        key: 'subscription_tier',
        header: 'Subscription Tier',
        sortable: true,
        width: '12%',
        render: (row: UserRow) => (
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
        width: '10%',
        render: (row: UserRow) => formatCurrency(row.round_up_amount),
      },
      {
        key: 'city',
        header: 'City',
        sortable: true,
        width: '10%',
        render: (row: UserRow) => row.city ?? '--',
      },
      {
        key: 'state',
        header: 'State',
        sortable: true,
        width: '6%',
        render: (row: UserRow) => row.state ?? '--',
      },
      {
        key: 'created_at',
        header: 'Joined',
        sortable: true,
        width: '12%',
        render: (row: UserRow) => (
          <span style={{ color: 'rgba(248,250,252,0.5)' }}>
            {formatDate(row.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  const handleRowClick = useCallback((row: UserRow) => {
    setSelectedUser(row);
  }, []);

  const handleExport = useCallback(() => {
    exportUsersCsv(filteredUsers);
  }, [filteredUsers]);

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
      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Users" value={formatNumber(kpis.total)} accent="purple" />
        <KpiCard label="Individual" value={formatNumber(kpis.individual)} accent="blue" />
        <KpiCard label="Family" value={formatNumber(kpis.family)} accent="teal" />
        <KpiCard label="Business" value={formatNumber(kpis.business)} accent="pink" />
        <KpiCard label="New This Month" value={formatNumber(kpis.newThisMonth)} accent="purple" />
      </div>

      {/* Filter Bar */}
      <GlassCard padding="20px">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ flex: '1 1 260px', maxWidth: '360px' }}>
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ width: '180px' }}>
            <Select
              options={ACCOUNT_TYPE_OPTIONS}
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
            />
          </div>
        </div>
      </GlassCard>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            /* Bulk actions require selection - placeholder */
          }}
        >
          Bulk actions require selection
        </Button>
      </div>

      {/* Users Table */}
      <GlassCard padding="0">
        <Table<UserRow>
          columns={columns}
          data={filteredUsers}
          loading={false}
          pageSize={15}
          emptyMessage="No users found"
          rowKey={(row) => row.id}
          onRowClick={handleRowClick}
        />
      </GlassCard>

      {/* User Detail Modal */}
      <Modal
        open={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        title="User Detail"
        size="lg"
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={sectionTitleStyle}>Profile</p>
            <DetailRow label="Name" value={selectedUser.name} />
            <DetailRow label="Email" value={selectedUser.email} />
            <DetailRow label="Phone" value={selectedUser.phone} />
            <DetailRow label="City" value={selectedUser.city} />
            <DetailRow label="State" value={selectedUser.state} />
            <DetailRow label="Zip Code" value={selectedUser.zip_code} />

            <p style={sectionTitleStyle}>Account</p>
            <DetailRow label="User ID" value={formatUserId(selectedUser.account_type, selectedUser.id)} />
            <DetailRow label="Account Type" value={selectedUser.account_type} />
            <DetailRow label="Subscription Tier" value={selectedUser.subscription_tier} />
            <DetailRow label="Subscription Status" value={selectedUser.subscription_status} />
            <DetailRow label="Round-Up Amount" value={formatCurrency(selectedUser.round_up_amount)} />
            <DetailRow label="Created At" value={formatDate(selectedUser.created_at)} />
            <DetailRow label="Updated At" value={selectedUser.updated_at ? formatDate(selectedUser.updated_at) : null} />

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Stats Section */}
      <GlassCard accent="purple" padding="24px">
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '16px',
          }}
        >
          User Statistics
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '16px',
          }}
        >
          <BarChart<AccountTypeChartPoint>
            data={accountTypeChartData}
            dataKey="count"
            xKey="name"
            title="Users by Account Type"
            color="#7C3AED"
            height={220}
          />
          <LineChart<RegistrationTrendPoint>
            data={registrationTrend}
            dataKey="users"
            xKey="name"
            title="Registration Trend (Last 6 Months)"
            color="#06B6D4"
            height={220}
          />
        </div>
      </GlassCard>
    </div>
  );
}
