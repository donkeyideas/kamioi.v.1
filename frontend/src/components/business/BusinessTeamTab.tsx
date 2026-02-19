import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Table, Badge, Button, Modal, Input, Select } from '@/components/ui'
import type { Column, SelectOption } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BusinessMember {
  id: number
  business_id: number
  user_id: number
  role: string
  department: string | null
  status: string
  joined_at: string
}

interface MemberRow {
  id: number
  business_id: number
  user_id: number
  name: string
  email: string
  role: string
  department: string
  status: string
  portfolio_value: number
  joined_at: string
}

interface Holding {
  user_id: number
  shares: number
  current_price: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
]

const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Design', label: 'Design' },
  { value: 'Product', label: 'Product' },
]

const ROLE_BADGE_VARIANT: Record<string, 'purple' | 'info' | 'default'> = {
  admin: 'purple',
  manager: 'info',
  employee: 'default',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/* ------------------------------------------------------------------ */
/*  Loading spinner                                                    */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'biz-team-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-team-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessTeamTab() {
  const { profile } = useAuth()

  const [businessId, setBusinessId] = useState<number | null>(null)
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [userMap, setUserMap] = useState<Map<number, { name: string; email: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [departmentFilter, setDepartmentFilter] = useState('all')

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('employee')
  const [addDepartment, setAddDepartment] = useState('Engineering')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit modal
  const [editMember, setEditMember] = useState<MemberRow | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id')
        .eq('created_by', profile.id)
        .limit(1)
        .single()

      if (!bizData) { setLoading(false); return }
      setBusinessId(bizData.id)

      const { data: memberData } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', bizData.id)
        .order('joined_at', { ascending: false })

      const memberList = (memberData as BusinessMember[] | null) ?? []
      setMembers(memberList)

      const userIds = memberList.map((m) => m.user_id)
      if (userIds.length > 0) {
        const [usersRes, holdingsRes] = await Promise.all([
          supabase.from('users').select('id, name, email').in('id', userIds),
          supabase.from('holdings').select('user_id, shares, current_price').in('user_id', userIds),
        ])

        const uMap = new Map<number, { name: string; email: string }>()
        for (const u of usersRes.data ?? []) {
          uMap.set(u.id, { name: u.name ?? 'Unknown', email: u.email ?? '' })
        }
        setUserMap(uMap)
        setHoldings((holdingsRes.data as Holding[] | null) ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* ---- Derived ---- */

  const portfolioByUser = useMemo(() => {
    const map = new Map<number, number>()
    for (const h of holdings) {
      map.set(h.user_id, (map.get(h.user_id) ?? 0) + h.shares * h.current_price)
    }
    return map
  }, [holdings])

  const memberRows = useMemo<MemberRow[]>(() => {
    return members.map((m) => {
      const user = userMap.get(m.user_id)
      return {
        id: m.id,
        business_id: m.business_id,
        user_id: m.user_id,
        name: user?.name ?? 'Unknown',
        email: user?.email ?? '',
        role: m.role,
        department: m.department ?? 'Unassigned',
        status: m.status,
        portfolio_value: portfolioByUser.get(m.user_id) ?? 0,
        joined_at: m.joined_at,
      }
    })
  }, [members, userMap, portfolioByUser])

  const filteredRows = useMemo(() => {
    if (departmentFilter === 'all') return memberRows
    return memberRows.filter((m) => m.department === departmentFilter)
  }, [memberRows, departmentFilter])

  const filterOptions = useMemo<SelectOption[]>(() => {
    const depts = new Set<string>()
    for (const m of memberRows) depts.add(m.department)
    const opts: SelectOption[] = [{ value: 'all', label: 'All Departments' }]
    for (const d of Array.from(depts).sort()) {
      opts.push({ value: d, label: d })
    }
    return opts
  }, [memberRows])

  /* ---- Table columns ---- */

  const tableColumns: Column<MemberRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '120px',
      render: (row) => (
        <Badge variant={ROLE_BADGE_VARIANT[row.role] ?? 'default'}>
          {row.role.charAt(0).toUpperCase() + row.role.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      width: '130px',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.department}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'portfolio_value',
      header: 'Portfolio Value',
      align: 'right',
      width: '130px',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          {formatCurrency(row.portfolio_value)}
        </span>
      ),
    },
    {
      key: 'joined_at',
      header: 'Joined',
      width: '120px',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatDate(row.joined_at)}
        </span>
      ),
    },
  ], [])

  /* ---- Add member ---- */

  const resetAddForm = () => {
    setAddName('')
    setAddEmail('')
    setAddRole('employee')
    setAddDepartment('Engineering')
    setAddError(null)
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return

    const trimmedName = addName.trim()
    const trimmedEmail = addEmail.trim()

    if (!trimmedName || !trimmedEmail) {
      setAddError('Name and email are required.')
      return
    }

    setAddSubmitting(true)
    setAddError(null)

    try {
      // Look up user by email
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', trimmedEmail)
        .single()

      if (!userData) {
        setAddError('User not found with that email.')
        setAddSubmitting(false)
        return
      }

      const { error } = await supabase.from('business_members').insert({
        business_id: businessId,
        user_id: userData.id,
        role: addRole,
        department: addDepartment,
        status: 'active',
      })

      if (error) throw error

      setAddModalOpen(false)
      resetAddForm()
      await fetchData()
    } catch (err) {
      console.error('Failed to add member:', err)
      setAddError('Failed to add team member. Please try again.')
    } finally {
      setAddSubmitting(false)
    }
  }

  /* ---- Edit member ---- */

  const openEditModal = (member: MemberRow) => {
    setEditMember(member)
    setEditRole(member.role)
    setEditDepartment(member.department)
  }

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMember) return

    setEditSubmitting(true)
    try {
      const { error } = await supabase
        .from('business_members')
        .update({ role: editRole, department: editDepartment })
        .eq('id', editMember.id)

      if (error) throw error

      setEditMember(null)
      await fetchData()
    } catch (err) {
      console.error('Failed to edit member:', err)
    } finally {
      setEditSubmitting(false)
    }
  }

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Team Members
          </h2>
          <Badge variant="info">{memberRows.length} members</Badge>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '180px' }}>
            <Select
              options={filterOptions}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            />
          </div>
          <Button variant="primary" size="md" onClick={() => { resetAddForm(); setAddModalOpen(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Member
          </Button>
        </div>
      </div>

      {/* Team table */}
      <GlassCard padding="0">
        <Table<MemberRow>
          columns={tableColumns}
          data={filteredRows}
          loading={false}
          pageSize={15}
          emptyMessage="No team members found"
          rowKey={(row) => row.id}
          onRowClick={openEditModal}
        />
      </GlassCard>

      {/* Add Member Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Team Member" size="sm">
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Name"
            placeholder="Full name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="team@company.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            required
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={addRole}
            onChange={(e) => setAddRole(e.target.value)}
          />
          <Select
            label="Department"
            options={DEPARTMENT_OPTIONS}
            value={addDepartment}
            onChange={(e) => setAddDepartment(e.target.value)}
          />

          {addError && (
            <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{addError}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={addSubmitting}>
            Add Team Member
          </Button>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        open={editMember !== null}
        onClose={() => setEditMember(null)}
        title={`Edit ${editMember?.name ?? 'Member'}`}
        size="sm"
      >
        {editMember && (
          <form onSubmit={handleEditMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Name" value={editMember.name} disabled style={{ opacity: 0.5 }} />
            <Input label="Email" value={editMember.email} disabled style={{ opacity: 0.5 }} />
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            />
            <Select
              label="Department"
              options={DEPARTMENT_OPTIONS}
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
            />
            <Button type="submit" variant="primary" fullWidth loading={editSubmitting}>
              Save Changes
            </Button>
          </form>
        )}
      </Modal>
    </div>
  )
}
