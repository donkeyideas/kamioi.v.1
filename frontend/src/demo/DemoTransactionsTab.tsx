import { useState, useMemo } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { COMPANY_LOOKUP, CompanyLogo, formatMerchantName } from '@/components/common/CompanyLogo'
import type { DemoTransaction } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusBadge: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
  completed: 'success',
  pending: 'warning',
  mapped: 'info',
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  background: active ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))' : 'var(--surface-input)',
  color: active ? '#A78BFA' : 'var(--text-secondary)',
})

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  background: 'var(--surface-row-hover)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  borderBottom: '1px solid var(--border-divider)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-divider)',
}

const PAGE_SIZE = 10

export function DemoTransactionsTab({ transactions: rawTransactions, roundUpOverride }: { transactions: DemoTransaction[]; roundUpOverride?: number }) {
  const transactions = useMemo(() => {
    if (roundUpOverride == null) return rawTransactions
    return rawTransactions.map(t => ({ ...t, round_up: roundUpOverride }))
  }, [rawTransactions, roundUpOverride])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.merchant.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    return list
  }, [transactions, statusFilter, search])

  const totalSpent = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions])
  const totalRoundUps = useMemo(() => transactions.reduce((s, t) => s + t.round_up, 0), [transactions])
  const totalInvested = useMemo(() => transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.round_up, 0), [transactions])

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, filtered.length)
  const pageData = filtered.slice(start, end)

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ---- Mapping modal state ---- */
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [mapMerchant, setMapMerchant] = useState('')
  const [mapForm, setMapForm] = useState({ ticker: '', companyName: '', notes: '' })
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

  const handleMap = (merchant: string) => {
    setMapMerchant(merchant)
    setMapForm({ ticker: '', companyName: '', notes: '' })
    setMapSuccess(null)
    setMapModalOpen(true)
  }

  const handleMapSubmit = () => {
    setMapSuccess(`Mapping submitted: ${mapMerchant} → ${mapForm.ticker}`)
    setTimeout(() => {
      setMapModalOpen(false)
      setMapSuccess(null)
      setToast(`Demo: "${mapMerchant}" mapped to ${mapForm.ticker}!`)
      setTimeout(() => setToast(''), 3000)
    }, 1500)
  }

  const statuses = ['all', 'completed', 'pending', 'mapped']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: '#fff',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Transactions" value={transactions.length} accent="purple" />
        <KpiCard label="Total Spent" value={fmt(totalSpent)} accent="blue" />
        <KpiCard label="Total Round-Ups" value={fmt(totalRoundUps)} accent="teal" />
        <KpiCard label="Total Invested" value={fmt(totalInvested)} accent="pink" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search merchants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px', background: 'var(--surface-input)', border: '1px solid var(--color-border-subtle)',
            borderRadius: '10px', color: 'inherit', fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: '220px',
          }}
        />
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={pillStyle(statusFilter === s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table with expandable receipt rows */}
      <GlassCard accent="purple" padding="24px">
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '100px' }}>Date</th>
                <th style={thStyle}>Merchant</th>
                <th style={thStyle}>Category</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Round-Up</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ticker</th>
                <th style={{ ...thStyle, width: '80px' }}></th>
              </tr>
            </thead>
            {pageData.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No transactions match your filters
                  </td>
                </tr>
              </tbody>
            )}
            {pageData.map(tx => {
              const isReceipt = !!(tx.subItems && tx.subItems.length > 0)
              const isExpanded = expandedIds.has(tx.id)

              return (
                <tbody key={tx.id}>
                    {/* Parent row */}
                    <tr
                      style={{
                        cursor: isReceipt ? 'pointer' : 'default',
                        transition: 'background 200ms ease',
                        background: isReceipt && isExpanded ? 'rgba(124,58,237,0.06)' : 'transparent',
                      }}
                      onClick={isReceipt ? () => toggleExpand(tx.id) : undefined}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isReceipt && isExpanded ? 'rgba(124,58,237,0.08)' : 'var(--surface-row-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isReceipt && isExpanded ? 'rgba(124,58,237,0.06)' : 'transparent' }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtDate(tx.date)}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isReceipt && (
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          )}
                          <CompanyLogo name={tx.merchant} size={22} />
                          <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{formatMerchantName(tx.merchant)}</span>
                          {isReceipt && (
                            <span style={{
                              fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                              background: 'rgba(124,58,237,0.15)', color: '#A78BFA',
                            }}>
                              {tx.subItems!.length} items
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tx.category}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ fontSize: '13px' }}>{fmt(tx.amount)}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: '13px' }}>{fmt(tx.round_up)}</span>
                      </td>
                      <td style={tdStyle}>
                        <Badge variant={statusBadge[tx.status] || 'info'}>{tx.status}</Badge>
                      </td>
                      <td style={tdStyle}>
                        {tx.ticker ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CompanyLogo name={tx.ticker} size={18} />
                            <span style={{ fontWeight: 600, color: '#06B6D4', fontSize: '13px' }}>{tx.ticker}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>--</span>}
                      </td>
                      <td style={tdStyle}>
                        {(tx.status !== 'completed' && !tx.ticker) ? (
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleMap(tx.merchant) }}>Map</Button>
                        ) : null}
                      </td>
                    </tr>

                    {/* Sub-item rows (receipt items) */}
                    {isReceipt && isExpanded && tx.subItems!.map((item, i) => {
                      const mappedTotal = tx.subItems!.filter(si => si.ticker).reduce((s, si) => s + si.amount, 0)
                      const itemRoundUp = item.ticker && mappedTotal > 0 ? Math.round(tx.round_up * (item.amount / mappedTotal) * 100) / 100 : 0
                      return (
                      <tr
                        key={`${tx.id}-sub-${i}`}
                        style={{
                          background: i % 2 === 0 ? 'rgba(124,58,237,0.03)' : 'rgba(124,58,237,0.06)',
                        }}
                      >
                        <td style={{ ...tdStyle, borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          {/* empty date for sub-items */}
                        </td>
                        <td style={{ ...tdStyle, borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px' }}>
                            {item.ticker ? (
                              <CompanyLogo name={item.ticker} size={18} />
                            ) : (
                              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{item.name}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          {item.brand && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.brand}</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmt(item.amount)}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          {itemRoundUp > 0 ? (
                            <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: '12px' }}>{fmt(itemRoundUp)}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>--</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          {item.ticker ? (
                            <Badge variant="success">mapped</Badge>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>no stock</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          {item.ticker ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <CompanyLogo name={item.ticker} size={16} />
                              <span style={{ fontWeight: 600, color: '#06B6D4', fontSize: '12px' }}>{item.ticker}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>--</span>}
                        </td>
                        <td style={{ ...tdStyle, borderBottom: i === tx.subItems!.length - 1 ? '2px solid rgba(124,58,237,0.2)' : '1px solid var(--border-divider)' }}>
                          {/* no action for sub-items */}
                        </td>
                      </tr>
                      )
                    })}
                </tbody>
              )
            })}
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)',
          }}>
            <span>Showing {start + 1}-{end} of {filtered.length}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
                  padding: '6px 14px', borderRadius: '6px',
                  border: '1px solid var(--border-subtle)', background: 'var(--surface-input)',
                  color: 'var(--text-secondary)', cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                  opacity: safePage === 0 ? 0.4 : 1,
                }}
                disabled={safePage === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                style={{
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
                  padding: '6px 14px', borderRadius: '6px',
                  border: '1px solid var(--border-subtle)', background: 'var(--surface-input)',
                  color: 'var(--text-secondary)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                }}
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Merchant Mapping Modal */}
      <Modal
        open={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false)
          setMapMerchant('')
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
                  {mapMerchant}
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
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    marginTop: '4px',
                  }}>
                    {companySuggestions.map(c => (
                      <div
                        key={c.ticker}
                        onMouseDown={() => {
                          setMapForm(prev => ({ ...prev, companyName: c.name, ticker: c.ticker }))
                          setShowSuggestions(false)
                        }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
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
                  padding: '10px 14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '40px',
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
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMapModalOpen(false)
                    setMapMerchant('')
                    setMapForm({ ticker: '', companyName: '', notes: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!mapForm.ticker.trim()}
                  onClick={handleMapSubmit}
                >
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
