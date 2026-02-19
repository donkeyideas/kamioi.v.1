import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Table, Badge, Select } from '@/components/ui'
import type { Column } from '@/components/ui'

/* ---- Types ---- */

interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  role: string
  status: string
  users: {
    id: number
    name: string
    email: string
  } | null
}

interface Transaction {
  id: number
  user_id: number
  merchant: string | null
  amount: number
  round_up: number
  category: string | null
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

interface FamilyTransaction extends Transaction {
  memberName: string
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

/* ---- Inline styles ---- */

const filtersRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '12px',
}

/* ---- Table columns ---- */

const columns: Column<FamilyTransaction>[] = [
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
    key: 'memberName',
    header: 'Member',
    render: (row) => (
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {row.memberName}
      </span>
    ),
  },
  {
    key: 'merchant',
    header: 'Merchant',
    render: (row) => (
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
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

/* ---- Component ---- */

export function FamilyTransactionsTab() {
  const { profile } = useAuth()

  const [transactions, setTransactions] = useState<FamilyTransaction[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [memberFilter, setMemberFilter] = useState('all')

  /* ---- Data fetching ---- */

  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) { setLoading(false); return }

      const { data: memberRecord } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', profile.id)
        .single()

      if (!memberRecord) { setLoading(false); return }

      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('*, users(id, name, email)')
        .eq('family_id', memberRecord.family_id)

      const membersData = (familyMembers ?? []) as FamilyMember[]
      setMembers(membersData)

      const memberUserIds = membersData.map((m) => m.user_id)
      if (memberUserIds.length === 0) { setLoading(false); return }

      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })

      const memberNameMap = new Map<number, string>()
      for (const m of membersData) {
        memberNameMap.set(m.user_id, m.users?.name ?? 'Unknown')
      }

      const mapped = ((txData ?? []) as Transaction[]).map((tx) => ({
        ...tx,
        memberName: memberNameMap.get(tx.user_id) ?? 'Unknown',
      }))

      setTransactions(mapped)
      setLoading(false)
    }
    fetchData()
  }, [profile?.id])

  /* ---- Derived data ---- */

  const memberOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Members' }]
    for (const m of members) {
      options.push({
        value: String(m.user_id),
        label: m.users?.name ?? 'Unknown',
      })
    }
    return options
  }, [members])

  const filtered = useMemo(() => {
    if (memberFilter === 'all') return transactions
    return transactions.filter((tx) => String(tx.user_id) === memberFilter)
  }, [transactions, memberFilter])

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters bar */}
      <GlassCard padding="16px 20px">
        <div style={filtersRowStyle}>
          <div style={{ flex: '0 0 240px' }}>
            <Select
              label="Filter by Member"
              options={memberOptions}
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            />
          </div>
        </div>
      </GlassCard>

      {/* Transactions table */}
      <GlassCard padding="0">
        <Table<FamilyTransaction>
          columns={columns}
          data={filtered}
          loading={loading}
          pageSize={15}
          emptyMessage="No family transactions found"
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  )
}
