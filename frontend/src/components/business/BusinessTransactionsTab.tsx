import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Table, Badge, Select, Button, Modal, GradientDivider } from '@/components/ui'
import type { Column, SelectOption } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Business {
  id: number
  name: string
}

interface BusinessMember {
  id: number
  business_id: number
  user_id: number
  role: string
  department: string | null
  status: string
  joined_at: string
  user_name?: string
  user_email?: string
}

interface Transaction {
  id: number
  user_id: number
  merchant: string | null
  amount: number
  round_up: number
  category: string | null
  status: string
  created_at: string
}

interface TransactionRow extends Transaction {
  employee_name: string
  department: string
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
          animation: 'biz-tx-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-tx-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Table columns                                                      */
/* ------------------------------------------------------------------ */

const columns: Column<TransactionRow>[] = [
  {
    key: 'created_at',
    header: 'Date',
    width: '130px',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {formatDate(row.created_at)}
      </span>
    ),
  },
  {
    key: 'employee_name',
    header: 'Employee',
    render: (row) => (
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {row.employee_name}
      </span>
    ),
  },
  {
    key: 'merchant',
    header: 'Merchant',
    render: (row) => (
      <span style={{ color: 'var(--text-primary)' }}>
        {row.merchant ?? '--'}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    width: '110px',
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: 500 }}>
        {formatCurrency(row.amount)}
      </span>
    ),
  },
  {
    key: 'round_up',
    header: 'Round-Up',
    align: 'right',
    width: '100px',
    render: (row) => (
      <span style={{ fontWeight: 500, color: '#06B6D4' }}>
        {formatCurrency(row.round_up)}
      </span>
    ),
  },
  {
    key: 'department',
    header: 'Department',
    width: '130px',
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        {row.department}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (row) => {
      const variantMap: Record<string, 'success' | 'warning' | 'error'> = {
        completed: 'success',
        pending: 'warning',
        failed: 'error',
      }
      return (
        <Badge variant={variantMap[row.status] ?? 'default'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      )
    },
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessTransactionsTab() {
  const { profile } = useAuth()

  const [members, setMembers] = useState<BusinessMember[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [memberFilter, setMemberFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null)

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

      const { data: memberData } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', bizData.id)

      const memberList = (memberData as BusinessMember[] | null) ?? []

      // Fetch user names for members
      const userIds = memberList.map((m) => m.user_id)
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds)

        const userMap = new Map<number, { name: string; email: string }>()
        for (const u of usersData ?? []) {
          userMap.set(u.id, { name: u.name ?? 'Unknown', email: u.email ?? '' })
        }
        for (const m of memberList) {
          const user = userMap.get(m.user_id)
          m.user_name = user?.name ?? 'Unknown'
          m.user_email = user?.email ?? ''
        }
      }

      setMembers(memberList)

      if (userIds.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })

        setTransactions((txData as Transaction[] | null) ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch business transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* ---- Derived ---- */

  const memberDeptMap = useMemo(() => {
    const map = new Map<number, { name: string; department: string }>()
    for (const m of members) {
      map.set(m.user_id, {
        name: m.user_name ?? 'Unknown',
        department: m.department ?? 'Unassigned',
      })
    }
    return map
  }, [members])

  const enrichedTransactions = useMemo<TransactionRow[]>(() => {
    return transactions.map((tx) => {
      const info = memberDeptMap.get(tx.user_id)
      return {
        ...tx,
        employee_name: info?.name ?? 'Unknown',
        department: info?.department ?? 'Unassigned',
      }
    })
  }, [transactions, memberDeptMap])

  const filtered = useMemo(() => {
    let result = enrichedTransactions

    if (memberFilter !== 'all') {
      const userId = parseInt(memberFilter, 10)
      result = result.filter((tx) => tx.user_id === userId)
    }

    if (departmentFilter !== 'all') {
      result = result.filter((tx) => tx.department === departmentFilter)
    }

    return result
  }, [enrichedTransactions, memberFilter, departmentFilter])

  /* ---- Filter options ---- */

  const memberOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: 'all', label: 'All Team Members' }]
    for (const m of members) {
      opts.push({ value: String(m.user_id), label: m.user_name ?? 'Unknown' })
    }
    return opts
  }, [members])

  const departmentOptions = useMemo<SelectOption[]>(() => {
    const depts = new Set<string>()
    for (const m of members) {
      depts.add(m.department ?? 'Unassigned')
    }
    const opts: SelectOption[] = [{ value: 'all', label: 'All Departments' }]
    for (const d of Array.from(depts).sort()) {
      opts.push({ value: d, label: d })
    }
    return opts
  }, [members])

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters */}
      <GlassCard padding="16px 20px">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', maxWidth: '280px' }}>
            <Select
              label="Team Member"
              options={memberOptions}
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 200px', maxWidth: '280px' }}>
            <Select
              label="Department"
              options={departmentOptions}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={() => { /* export placeholder */ }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Transactions table */}
      <GlassCard padding="0">
        <Table<TransactionRow>
          columns={columns}
          data={filtered}
          loading={false}
          pageSize={15}
          emptyMessage="No transactions found"
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedTx(row)}
        />
      </GlassCard>

      {/* Transaction Detail Modal */}
      <Modal
        open={selectedTx !== null}
        onClose={() => setSelectedTx(null)}
        title="Transaction Detail"
        size="sm"
      >
        {selectedTx && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <DetailRow label="Date" value={formatDate(selectedTx.created_at)} />
            <DetailRow label="Employee" value={selectedTx.employee_name} />
            <DetailRow label="Department" value={selectedTx.department} />
            <DetailRow label="Merchant" value={selectedTx.merchant ?? '--'} />
            <DetailRow label="Category" value={selectedTx.category ?? '--'} />
            <GradientDivider margin="4px 0" />
            <DetailRow label="Amount" value={formatCurrency(selectedTx.amount)} highlight />
            <DetailRow label="Round-Up" value={formatCurrency(selectedTx.round_up)} />
            <DetailRow label="Status" value={selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1)} />
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ---- Detail row sub-component ---- */

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: highlight ? 700 : 500,
          color: highlight ? '#7C3AED' : 'var(--text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
