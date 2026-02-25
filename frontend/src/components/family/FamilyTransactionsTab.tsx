import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Table, Badge, Select, KpiCard, Button, Modal, Input } from '@/components/ui'
import type { Column } from '@/components/ui'
import { COMPANY_LOOKUP, CompanyLogo, CompanyLink, formatMerchantName } from '@/components/common/CompanyLogo'

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
  status: 'pending' | 'mapped' | 'completed' | 'failed'
  date: string
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

/* ---- Component ---- */

export function FamilyTransactionsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [transactions, setTransactions] = useState<FamilyTransaction[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [memberFilter, setMemberFilter] = useState('all')

  /* ---- Mapping modal state ---- */
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [mapTransaction, setMapTransaction] = useState<FamilyTransaction | null>(null)
  const [mapForm, setMapForm] = useState({ ticker: '', companyName: '', notes: '' })
  const [mapSubmitting, setMapSubmitting] = useState(false)
  const [mapSuccess, setMapSuccess] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const companyOptions = useMemo(() => {
    const merchantEntries: { name: string; domain: string }[] = []
    const tickerByDomain = new Map<string, string>()
    for (const [key, info] of Object.entries(COMPANY_LOOKUP)) {
      if (key === key.toUpperCase() && key.length <= 5) {
        tickerByDomain.set(info.domain, key)
      } else {
        merchantEntries.push({ name: key, domain: info.domain })
      }
    }
    return merchantEntries
      .map(m => ({ name: m.name, ticker: tickerByDomain.get(m.domain) ?? '' }))
      .filter(m => m.ticker)
  }, [])

  const companySuggestions = useMemo(() => {
    const q = mapForm.companyName.trim().toLowerCase()
    if (q.length < 2) return []
    return companyOptions.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [mapForm.companyName, companyOptions])

  const handleMapSubmit = useCallback(async () => {
    if (!mapTransaction || !mapForm.ticker.trim()) return
    setMapSubmitting(true)
    try {
      const { error } = await supabaseAdmin.from('llm_mappings').insert({
        merchant_name: mapTransaction.merchant ?? '',
        ticker: mapForm.ticker.trim().toUpperCase(),
        company_name: mapForm.companyName.trim() || null,
        category: 'family_submitted',
        status: 'pending',
        user_id: userId ?? null,
        transaction_id: mapTransaction.id,
        confidence: null,
        ai_processed: false,
        admin_approved: null,
      })
      if (error) throw error

      // Update transaction status to 'pending' so the Map button disappears
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'pending' })
        .eq('id', mapTransaction.id)

      // Update local state immediately
      const txId = mapTransaction.id
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'pending' as const, memberName: t.memberName } : t))

      setMapSuccess(`Mapping submitted for "${mapTransaction.merchant}" → ${mapForm.ticker.trim().toUpperCase()}`)
      setTimeout(() => {
        setMapModalOpen(false)
        setMapTransaction(null)
        setMapForm({ ticker: '', companyName: '', notes: '' })
        setMapSuccess(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to submit mapping:', err)
    } finally {
      setMapSubmitting(false)
    }
  }, [mapTransaction, mapForm, userId])

  /* ---- Table columns ---- */

  const columns: Column<FamilyTransaction>[] = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      width: '130px',
      sortable: true,
      render: (row: FamilyTransaction) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: 'memberName',
      header: 'Member',
      render: (row: FamilyTransaction) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.memberName}
        </span>
      ),
    },
    {
      key: 'merchant',
      header: 'Merchant',
      render: (row: FamilyTransaction) => {
        const content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {row.merchant && <CompanyLogo name={row.merchant} size={22} />}
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
              {row.merchant ? formatMerchantName(row.merchant) : '--'}
            </span>
          </div>
        )
        if (row.merchant && COMPANY_LOOKUP[row.merchant]) {
          return <CompanyLink name={row.merchant}>{content}</CompanyLink>
        }
        return content
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '110px',
      sortable: true,
      render: (row: FamilyTransaction) => (
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
      render: (row: FamilyTransaction) => (
        <span style={{ fontWeight: 500, color: '#06B6D4' }}>
          {formatCurrency(row.round_up)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row: FamilyTransaction) => {
        const variantMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
          completed: 'success',
          mapped: 'default',
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
    {
      key: 'action',
      header: '',
      width: '90px',
      render: (row: FamilyTransaction) => row.status === 'failed' ? (
        <Button variant="secondary" size="sm" onClick={() => { setMapTransaction(row); setMapForm({ ticker: '', companyName: '', notes: '' }); setMapModalOpen(true) }}>
          Map
        </Button>
      ) : null,
    },
  ], [])

  /* ---- Data fetching ---- */

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: memberRecord } = await supabaseAdmin
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!memberRecord) { setLoading(false); return }

      const { data: familyMembers } = await supabaseAdmin
        .from('family_members')
        .select('*, users(id, name, email)')
        .eq('family_id', memberRecord.family_id)
        .limit(50)

      const membersData = (familyMembers ?? []) as FamilyMember[]
      setMembers(membersData)

      const memberUserIds = membersData.map((m) => m.user_id)
      if (memberUserIds.length === 0) { setLoading(false); return }

      const { data: txData } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(500)

      const memberNameMap = new Map<number, string>()
      for (const m of membersData) {
        memberNameMap.set(m.user_id, m.users?.name ?? 'Unknown')
      }

      const mapped = ((txData ?? []) as Transaction[]).map((tx) => ({
        ...tx,
        memberName: memberNameMap.get(tx.user_id) ?? 'Unknown',
      }))

      setTransactions(mapped)
    } catch (err) {
      console.error('Failed to fetch family transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userLoading) void fetchData()
  }, [fetchData, userLoading])

  // Re-fetch when bank sync completes
  useEffect(() => {
    const handler = () => void fetchData()
    window.addEventListener('bankSyncComplete', handler)
    return () => window.removeEventListener('bankSyncComplete', handler)
  }, [fetchData])

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

  const kpis = useMemo(() => {
    let count = 0
    let totalSpent = 0
    let totalRoundUps = 0
    let invested = 0

    for (const t of filtered) {
      count++
      totalSpent += t.amount ?? 0
      totalRoundUps += t.round_up ?? 0
      if (t.status === 'completed') {
        invested += t.round_up ?? 0
      }
    }

    return { count, totalSpent, totalRoundUps, invested }
  }, [filtered])

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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Transactions" value={kpis.count.toLocaleString()} accent="purple" />
        <KpiCard label="Total Spent" value={formatCurrency(kpis.totalSpent)} accent="blue" />
        <KpiCard label="Total Round-Ups" value={formatCurrency(kpis.totalRoundUps)} accent="teal" />
        <KpiCard label="Total Invested" value={formatCurrency(kpis.invested)} accent="pink" />
      </div>

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

      {/* Merchant Mapping Modal */}
      <Modal
        open={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false)
          setMapTransaction(null)
          setMapForm({ ticker: '', companyName: '', notes: '' })
          setMapSuccess(null)
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Submit Merchant Mapping
          </h3>

          {mapSuccess ? (
            <div style={{
              padding: '16px',
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: '10px',
              color: '#34D399',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
            }}>
              {mapSuccess}
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Merchant
                </label>
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}>
                  {mapTransaction?.merchant ?? '--'}
                </div>
              </div>

              <div>
                <Input
                  label="Company Name"
                  placeholder="Start typing a company name..."
                  value={mapForm.companyName}
                  onChange={(e) => {
                    setMapForm(prev => ({ ...prev, companyName: e.target.value, ticker: '' }))
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && companySuggestions.length > 0 && (
                  <div style={{
                    background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: '8px', maxHeight: '200px', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', marginTop: '4px',
                  }}>
                    {companySuggestions.map(c => (
                      <div
                        key={c.ticker}
                        onMouseDown={() => {
                          setMapForm(prev => ({ ...prev, companyName: c.name, ticker: c.ticker }))
                          setShowSuggestions(false)
                        }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: '10px',
                          borderBottom: '1px solid var(--border-divider)',
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <CompanyLogo name={c.name} size={24} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{c.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#A78BFA', fontWeight: 600 }}>{c.ticker}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Stock Ticker
                </label>
                <div style={{
                  padding: '10px 14px', background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px',
                }}>
                  {mapForm.ticker ? (
                    <>
                      <CompanyLogo name={mapForm.ticker} size={22} />
                      <span style={{ fontWeight: 600, color: '#A78BFA', fontSize: '14px' }}>{mapForm.ticker}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a company above</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Notes
                </label>
                <textarea
                  placeholder="Explain what this merchant is..."
                  value={mapForm.notes}
                  onChange={(e) => setMapForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)', borderRadius: '8px',
                    color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="sm" onClick={() => { setMapModalOpen(false); setMapTransaction(null); setMapForm({ ticker: '', companyName: '', notes: '' }) }}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={mapSubmitting} disabled={!mapForm.ticker.trim()} onClick={handleMapSubmit}>
                  Submit Mapping
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
