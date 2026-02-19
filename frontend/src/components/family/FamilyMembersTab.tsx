import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Table, Badge, Button, Input, Select, Modal } from '@/components/ui'
import type { Column } from '@/components/ui'

/* ---- Types ---- */

interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  role: string
  status: string
  joined_at: string
  users: {
    id: number
    name: string
    email: string
  } | null
}

interface Holding {
  user_id: number
  shares: number
  current_price: number
}

interface MemberRow {
  id: number
  family_id: number
  user_id: number
  name: string
  email: string
  role: string
  status: string
  portfolioValue: number
  joined_at: string
}

/* ---- Formatting helpers ---- */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/* ---- Role options ---- */

const ROLE_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'member', label: 'Member' },
]

/* ---- Table columns ---- */

const buildColumns = (
  onEditRole: (member: MemberRow) => void,
): Column<MemberRow>[] => [
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {row.name}
      </span>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {row.email}
      </span>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    width: '120px',
    render: (row) => {
      const variantMap: Record<string, 'purple' | 'info' | 'default'> = {
        parent: 'purple',
        child: 'info',
        member: 'default',
      }
      return (
        <Badge variant={variantMap[row.role] ?? 'default'}>
          {row.role.charAt(0).toUpperCase() + row.role.slice(1)}
        </Badge>
      )
    },
  },
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (row) => {
      const variantMap: Record<string, 'success' | 'warning' | 'error'> = {
        active: 'success',
        pending: 'warning',
        inactive: 'error',
      }
      return (
        <Badge variant={variantMap[row.status] ?? 'default'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      )
    },
  },
  {
    key: 'portfolioValue',
    header: 'Portfolio Value',
    align: 'right',
    width: '140px',
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
        {formatCurrency(row.portfolioValue)}
      </span>
    ),
  },
  {
    key: 'joined_at',
    header: 'Joined',
    width: '120px',
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        {formatDate(row.joined_at)}
      </span>
    ),
  },
  {
    key: 'actions',
    header: '',
    width: '80px',
    render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => onEditRole(row)}>
        Edit
      </Button>
    ),
  },
]

/* ---- Component ---- */

export function FamilyMembersTab() {
  const { profile } = useAuth()

  const [memberRows, setMemberRows] = useState<MemberRow[]>([])
  const [familyId, setFamilyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Add member modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('member')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit role modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editMember, setEditMember] = useState<MemberRow | null>(null)
  const [editRole, setEditRole] = useState('member')
  const [editSubmitting, setEditSubmitting] = useState(false)

  /* ---- Data fetching ---- */

  const fetchMembers = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }

    const { data: memberRecord } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', profile.id)
      .single()

    if (!memberRecord) { setLoading(false); return }

    setFamilyId(memberRecord.family_id)

    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('*, users(id, name, email)')
      .eq('family_id', memberRecord.family_id)

    const membersData = (familyMembers ?? []) as FamilyMember[]
    const memberUserIds = membersData.map((m) => m.user_id)

    // Fetch holdings for portfolio values
    let holdingsData: Holding[] = []
    if (memberUserIds.length > 0) {
      const { data } = await supabase
        .from('holdings')
        .select('user_id, shares, current_price')
        .in('user_id', memberUserIds)
      holdingsData = (data ?? []) as Holding[]
    }

    // Calculate portfolio value per user
    const portfolioMap = new Map<number, number>()
    for (const h of holdingsData) {
      const current = portfolioMap.get(h.user_id) ?? 0
      portfolioMap.set(h.user_id, current + h.shares * h.current_price)
    }

    const rows: MemberRow[] = membersData.map((m) => ({
      id: m.id,
      family_id: m.family_id,
      user_id: m.user_id,
      name: m.users?.name ?? 'Unknown',
      email: m.users?.email ?? '--',
      role: m.role,
      status: m.status,
      portfolioValue: portfolioMap.get(m.user_id) ?? 0,
      joined_at: m.joined_at,
    }))

    setMemberRows(rows)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  /* ---- Add Member ---- */

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyId) return

    const trimmedEmail = addEmail.trim()
    if (!trimmedEmail) {
      setAddError('Please enter an email address.')
      return
    }

    setAddSubmitting(true)
    setAddError(null)

    try {
      // Look up user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', trimmedEmail)
        .single()

      if (userError || !userData) {
        setAddError('No user found with that email address.')
        setAddSubmitting(false)
        return
      }

      // Add to family_members
      const { error } = await supabase.from('family_members').insert({
        family_id: familyId,
        user_id: userData.id,
        role: addRole,
        status: 'pending',
      })

      if (error) throw error

      setAddModalOpen(false)
      setAddEmail('')
      setAddRole('member')
      await fetchMembers()
    } catch (err) {
      console.error('Failed to add member:', err)
      setAddError('Failed to add member. They may already be in the family.')
    } finally {
      setAddSubmitting(false)
    }
  }

  /* ---- Edit Role ---- */

  const handleOpenEditRole = (member: MemberRow) => {
    setEditMember(member)
    setEditRole(member.role)
    setEditModalOpen(true)
  }

  const handleSaveRole = async () => {
    if (!editMember) return
    setEditSubmitting(true)

    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: editRole })
        .eq('id', editMember.id)

      if (error) throw error

      setEditModalOpen(false)
      setEditMember(null)
      await fetchMembers()
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setEditSubmitting(false)
    }
  }

  /* ---- Columns with edit handler ---- */

  const tableColumns = buildColumns(handleOpenEditRole)

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Family Members
        </h2>
        <Button variant="primary" size="md" onClick={() => { setAddError(null); setAddEmail(''); setAddRole('member'); setAddModalOpen(true) }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Member
        </Button>
      </div>

      {/* Add Member Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Family Member" size="sm">
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="member@example.com"
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

          {addError && (
            <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{addError}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={addSubmitting}>
            Add Member
          </Button>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Member Role" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Change role for {editMember?.name}
          </p>
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
          />
          <Button variant="primary" fullWidth loading={editSubmitting} onClick={handleSaveRole}>
            Save Role
          </Button>
        </div>
      </Modal>

      {/* Members table */}
      <GlassCard padding="0">
        <Table<MemberRow>
          columns={tableColumns}
          data={memberRows}
          loading={loading}
          pageSize={10}
          emptyMessage="No family members found"
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  )
}
