import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Table, Badge, Select, Button, Modal, GradientDivider, KpiCard, Input } from '@/components/ui'
import type { Column, SelectOption } from '@/components/ui'
import { COMPANY_LOOKUP, CompanyLogo, CompanyLink, formatMerchantName } from '@/components/common/CompanyLogo'

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
  date: string
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessTransactionsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [members, setMembers] = useState<BusinessMember[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [memberFilter, setMemberFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null)

  /* ---- Mapping modal state ---- */
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [mapTransaction, setMapTransaction] = useState<TransactionRow | null>(null)
  const [mapForm, setMapForm] = useState({ ticker: '', companyName: '', notes: '' })
  const [mapSubmitting, setMapSubmitting] = useState(false)
  const [mapSuccess, setMapSuccess] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  /* ---- Company autocomplete ---- */

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

  /* ---- Table columns ---- */

  const columns: Column<TransactionRow>[] = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      width: '130px',
      sortable: true,
      render: (row: TransactionRow) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: 'employee_name',
      header: 'Employee',
      render: (row: TransactionRow) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.employee_name}
        </span>
      ),
    },
    {
      key: 'merchant',
      header: 'Merchant',
      render: (row: TransactionRow) => {
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
      render: (row: TransactionRow) => (
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
      render: (row: TransactionRow) => (
        <span style={{ fontWeight: 500, color: '#06B6D4' }}>
          {formatCurrency(row.round_up)}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      width: '130px',
      render: (row: TransactionRow) => (
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {row.department}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row: TransactionRow) => {
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
      render: (row: TransactionRow) => row.status === 'failed' ? (
        <Button variant="secondary" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setMapTransaction(row); setMapForm({ ticker: '', companyName: '', notes: '' }); setMapModalOpen(true) }}>
          Map
        </Button>
      ) : null,
    },
  ], [])

  /* ---- Mapping submit handler ---- */

  const handleMapSubmit = useCallback(async () => {
    if (!mapTransaction || !mapForm.ticker.trim()) return
    setMapSubmitting(true)
    try {
      const { error } = await supabaseAdmin.from('llm_mappings').insert({
        merchant_name: mapTransaction.merchant ?? '',
        ticker: mapForm.ticker.trim().toUpperCase(),
        company_name: mapForm.companyName.trim() || null,
        category: 'business_submitted',
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
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'pending' } : t))

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

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle()

      if (!bizData) { setLoading(false); return }

      const { data: memberData } = await supabaseAdmin
        .from('business_members')
        .select('*')
        .eq('business_id', bizData.id)
        .limit(100)

      const memberList = (memberData as BusinessMember[] | null) ?? []

      // Fetch user names for members
      const userIds = memberList.map((m) => m.user_id)
      if (userIds.length > 0) {
        const { data: usersData } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .in('id', userIds)
          .limit(100)

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
        const { data: txData } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
          .limit(500)

        setTransactions((txData as Transaction[] | null) ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch business transactions:', err)
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Transactions" value={kpis.count.toLocaleString()} accent="purple" />
        <KpiCard label="Total Spent" value={formatCurrency(kpis.totalSpent)} accent="blue" />
        <KpiCard label="Total Round-Ups" value={formatCurrency(kpis.totalRoundUps)} accent="teal" />
        <KpiCard label="Total Invested" value={formatCurrency(kpis.invested)} accent="pink" />
      </div>

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
            <DetailRow label="Merchant" value={selectedTx.merchant ? formatMerchantName(selectedTx.merchant) : '--'} />
            <DetailRow label="Category" value={selectedTx.category ?? '--'} />
            <GradientDivider margin="4px 0" />
            <DetailRow label="Amount" value={formatCurrency(selectedTx.amount)} highlight />
            <DetailRow label="Round-Up" value={formatCurrency(selectedTx.round_up)} />
            <DetailRow label="Status" value={selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1)} />
          </div>
        )}
      </Modal>

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
                  {mapTransaction?.merchant ? formatMerchantName(mapTransaction.merchant) : '--'}
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
