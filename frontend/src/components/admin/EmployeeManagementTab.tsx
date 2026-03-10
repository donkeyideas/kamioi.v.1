import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Input, Select, Modal } from '@/components/ui';
import type { Column, SelectOption } from '@/components/ui';
import type { Database } from '@/types/database';
import { hasPermission, defaultPermissions, PERMISSION_KEYS, type PermissionKey } from '@/hooks/useAdminPermissions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UserRow = Database['public']['Tables']['users']['Row'];

interface PermissionItem {
  key: PermissionKey;
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
  return new Date(dateStr).toLocaleString('en-US', {
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
  const [infoVariant, setInfoVariant] = useState<'blue' | 'green' | 'red'>('blue');
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('admin');
  const [editPassword, setEditPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const fetchAdminUsers = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('account_type', 'admin')
        .order('created_at', { ascending: true })
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
    setFormPassword('');
    setFormRole('admin');
    setInfoMessage(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!formEmail.trim() || !formName.trim() || submitting) return;
    setInfoMessage(null);
    setSubmitting(true);

    try {
      const password = formPassword.trim() || (crypto.randomUUID() + 'Aa1!');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formEmail.trim(),
        password,
        email_confirm: true,
      });

      if (authError) {
        setInfoVariant('red');
        setInfoMessage(authError.message);
        setSubmitting(false);
        return;
      }

      const { error: userError } = await supabaseAdmin.from('users').insert({
        auth_id: authData.user.id,
        email: formEmail.trim(),
        name: formName.trim(),
        account_type: 'admin',
        permissions: defaultPermissions(),
      });

      if (userError) {
        setInfoVariant('red');
        setInfoMessage(`Auth user created but user record failed: ${userError.message}`);
        setSubmitting(false);
        return;
      }

      setInfoVariant('green');
      setInfoMessage(formPassword.trim()
        ? `Employee "${formName.trim()}" created with the provided password.`
        : `Employee "${formName.trim()}" created. They should use "Forgot Password" to set their password.`);
      fetchAdminUsers();
      setTimeout(() => setModalOpen(false), 2000);
    } catch (err) {
      setInfoVariant('red');
      setInfoMessage(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  // Permission toggle handler
  async function handleTogglePermission(permKey: PermissionKey) {
    const selectedUser = adminUsers.find((u) => u.id === selectedUserId);
    if (!selectedUser || selectedUser.permissions === null) return; // super admin — can't toggle

    const currentPerms = selectedUser.permissions ?? {};
    const currentValue = hasPermission(currentPerms, permKey);
    const newPerms = { ...currentPerms, [permKey]: !currentValue };

    // Optimistic update
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, permissions: newPerms } : u)),
    );

    const { error } = await supabaseAdmin
      .from('users')
      .update({ permissions: newPerms } as Record<string, unknown>)
      .eq('id', selectedUser.id);

    if (error) {
      console.error('Failed to update permission:', error.message);
      fetchAdminUsers(); // revert
    }
  }

  // Edit employee
  function handleEditEmployee(user: UserRow) {
    setEditUser(user);
    setEditName(user.name ?? '');
    setEditEmail(user.email ?? '');
    setEditPassword('');
    setPasswordMessage(null);
    setEditModalOpen(true);
  }

  async function handleSaveEdit() {
    if (!editUser || actionLoading) return;
    setActionLoading(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editName.trim() && editName.trim() !== editUser.name) updates.name = editName.trim();
      if (editEmail.trim() && editEmail.trim() !== editUser.email) updates.email = editEmail.trim();

      if (Object.keys(updates).length === 0 && !editPassword.trim()) {
        setEditModalOpen(false);
        setActionLoading(false);
        return;
      }

      // Update users table if name/email changed
      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseAdmin.from('users').update(updates).eq('id', editUser.id);
        if (error) {
          console.error('Failed to update employee:', error.message);
          setActionLoading(false);
          return;
        }
      }

      // Update auth user if needed (email or password)
      if (editUser.auth_id) {
        const authUpdates: Record<string, string> = {};
        if (updates.email) authUpdates.email = updates.email as string;
        if (editPassword.trim()) authUpdates.password = editPassword.trim();
        if (Object.keys(authUpdates).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(editUser.auth_id, authUpdates);
          if (authErr) {
            console.error('Failed to update auth user:', authErr.message);
            setActionLoading(false);
            return;
          }
        }
      }

      fetchAdminUsers();
      setEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update employee:', err);
    } finally {
      setActionLoading(false);
    }
  }

  // Delete employee
  function handleDeleteEmployee(user: UserRow) {
    if (user.permissions === null) return; // Can't delete Super Admin
    setDeleteTarget(user);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || actionLoading) return;
    setActionLoading(true);
    try {
      if (deleteTarget.auth_id) {
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(deleteTarget.auth_id);
        if (authErr) console.error('Failed to delete auth user:', authErr.message);
      }

      const { error } = await supabaseAdmin.from('users').delete().eq('id', deleteTarget.id);
      if (error) {
        console.error('Failed to delete employee:', error.message);
        setActionLoading(false);
        return;
      }

      if (selectedUserId === deleteTarget.id) setSelectedUserId(null);
      fetchAdminUsers();
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete employee:', err);
    } finally {
      setActionLoading(false);
    }
  }

  const totalStaff = adminUsers.length;
  const selectedUser = adminUsers.find((u) => u.id === selectedUserId) ?? null;
  const isSelectedSuperAdmin = selectedUser?.permissions === null;

  const columns: Column<UserRow>[] = [
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
        header: 'Role',
        sortable: true,
        width: '160px',
        render: (row) => (
          <Badge variant={row.permissions === null ? 'warning' : 'purple'}>
            {row.permissions === null ? 'Super Admin' : 'Admin'}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '200px',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'id',
        header: 'Actions',
        width: '140px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleEditEmployee(row)}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                color: '#3B82F6',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteEmployee(row)}
              disabled={row.permissions === null}
              style={{
                background: row.permissions === null ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${row.permissions === null ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '6px',
                color: row.permissions === null ? 'var(--text-muted)' : '#EF4444',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: row.permissions === null ? 'not-allowed' : 'pointer',
                opacity: row.permissions === null ? 0.4 : 1,
              }}
            >
              Delete
            </button>
          </div>
        ),
      },
  ];

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
          onRowClick={(row) => setSelectedUserId(row.id)}
        />
      </GlassCard>

      {/* Permission Matrix */}
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Permission Matrix
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          {!selectedUser
            ? 'Select an employee from the table above to manage their permissions.'
            : isSelectedSuperAdmin
              ? `${selectedUser.name} is the Super Admin — all permissions are always granted.`
              : `Managing permissions for ${selectedUser.name}.`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PERMISSIONS.map((perm) => {
            const isGranted = selectedUser
              ? hasPermission(selectedUser.permissions, perm.key)
              : true;
            const isDisabled = !selectedUser || isSelectedSuperAdmin;

            return (
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
                  onClick={() => !isDisabled && handleTogglePermission(perm.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: isGranted
                      ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
                      : 'rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0,
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, opacity 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: isGranted ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#F8FAFC',
                      transition: 'left 0.2s',
                    }}
                  />
                </div>
              </div>
            );
          })}
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
          <Input
            label="Password"
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            placeholder="Leave blank to require password reset"
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
          />

          {infoMessage && (
            <GlassCard padding="14px" accent={infoVariant === 'red' ? 'red' : infoVariant === 'green' ? 'teal' : 'blue'}>
              <p style={{ fontSize: '13px', color: infoVariant === 'red' ? '#ef4444' : infoVariant === 'green' ? '#10b981' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                {infoMessage}
              </p>
            </GlassCard>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formEmail.trim() || !formName.trim() || submitting}
              loading={submitting}
            >
              Add Employee
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Employee">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Full name"
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="employee@kamioi.com"
          />

          {/* Password Reset Section */}
          <div style={{
            borderTop: '1px solid var(--border-divider)',
            paddingTop: '16px',
            marginTop: '4px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Reset Password
            </p>
            <Input
              label="New Password"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || !editEmail.trim() || actionLoading}
              loading={actionLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Employee">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove their
            account and revoke all access. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              loading={actionLoading}
            >
              Delete Employee
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default EmployeeManagementTab;
