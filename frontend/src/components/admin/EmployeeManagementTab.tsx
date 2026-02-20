import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Input, Select, Modal } from '@/components/ui';
import type { Column, SelectOption } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UserRow = Database['public']['Tables']['users']['Row'];

interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'viewer', label: 'Viewer' },
];

const PERMISSIONS: PermissionItem[] = [
  { key: 'can_view_users', label: 'View Users', description: 'View user profiles, accounts, and activity' },
  { key: 'can_edit_users', label: 'Edit Users', description: 'Modify user profiles, suspend or activate accounts' },
  { key: 'can_view_transactions', label: 'View Transactions', description: 'View transaction history and details' },
  { key: 'can_edit_transactions', label: 'Edit Transactions', description: 'Modify transaction status, process refunds' },
  { key: 'can_access_llm', label: 'Access LLM', description: 'Access AI/LLM tools for merchant mapping and analysis' },
  { key: 'can_manage_system', label: 'Manage System', description: 'Modify system settings, maintenance mode, backups' },
  { key: 'can_view_analytics', label: 'View Analytics', description: 'Access analytics dashboards and reporting' },
  { key: 'can_manage_advertisements', label: 'Manage Advertisements', description: 'Create, edit, and schedule advertisements' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EmployeeManagementTab() {
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('admin');

  const fetchAdminUsers = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('account_type', 'admin')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Failed to fetch admin users:', error.message);
        setAdminUsers([]);
        return;
      }

      setAdminUsers(data ?? []);
    } catch (err) {
      console.error('Unexpected error fetching admin users:', err);
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  function handleAddEmployee() {
    setFormEmail('');
    setFormName('');
    setFormRole('admin');
    setInfoMessage(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setInfoMessage(
      'Employee creation requires Supabase Auth admin API. Use Supabase dashboard to create admin accounts.',
    );
  }

  const totalStaff = adminUsers.length;

  const columns: Column<UserRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        width: '200px',
        render: (row) => (
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.email}</span>
        ),
      },
      {
        key: 'account_type',
        header: 'Account Type',
        sortable: true,
        width: '140px',
        render: (row) => (
          <Badge variant="purple">{row.account_type}</Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '200px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Staff" value={totalStaff.toLocaleString()} accent="purple" />
        <KpiCard label="Active" value={totalStaff.toLocaleString()} accent="teal" />
      </div>

      {/* Add Employee Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleAddEmployee}>Add Employee</Button>
      </div>

      {/* Admin Users Table */}
      <GlassCard padding="0">
        <Table<UserRow>
          columns={columns}
          data={adminUsers}
          loading={loading}
          emptyMessage="No admin users found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Permission Matrix */}
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Permission Matrix
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontStyle: 'italic' }}>
          Granular permissions require the employees table migration. Currently all admin users have full access.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PERMISSIONS.map((perm) => (
            <div
              key={perm.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--surface-row-hover)',
                borderRadius: '10px',
                border: '1px solid var(--border-divider)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {perm.label}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {perm.description}
                </p>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                  position: 'relative',
                  flexShrink: 0,
                  opacity: 0.6,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '22px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#F8FAFC',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Add Employee Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Employee">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="employee@kamioi.com"
          />
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Full name"
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
          />

          {infoMessage && (
            <GlassCard padding="14px" accent="blue">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {infoMessage}
              </p>
            </GlassCard>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formEmail.trim() || !formName.trim()}
            >
              Add Employee
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default EmployeeManagementTab;
