import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { CompanyLogo } from '@/components/common/CompanyLogo'

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'completed'

export const RECEIPT_ITEMS = [
  { name: 'Great Value Whole Milk 1 gal', brand: 'Great Value', amount: 3.48, ticker: 'WMT', stockName: 'Walmart Inc.', confidence: 0.85 },
  { name: 'Coca-Cola Classic 12pk', brand: 'Coca-Cola', amount: 6.98, ticker: 'KO', stockName: 'The Coca-Cola Co.', confidence: 0.97 },
  { name: "Lay's Classic Potato Chips", brand: "Lay's", amount: 4.28, ticker: 'PEP', stockName: 'PepsiCo Inc.', confidence: 0.95 },
  { name: 'Tide Pods Original 42ct', brand: 'Tide', amount: 12.97, ticker: 'PG', stockName: 'Procter & Gamble', confidence: 0.98 },
  { name: 'Bounty Paper Towels 6pk', brand: 'Bounty', amount: 11.47, ticker: 'PG', stockName: 'Procter & Gamble', confidence: 0.96 },
  { name: "Ben & Jerry's Half Baked Pint", brand: "Ben & Jerry's", amount: 5.49, ticker: 'UL', stockName: 'Unilever PLC', confidence: 0.92 },
  { name: 'Organic Bananas 1 bunch', brand: null, amount: 1.67, ticker: '', stockName: '', confidence: 0 },
  { name: 'Fresh Bakery French Bread', brand: null, amount: 1.27, ticker: '', stockName: '', confidence: 0 },
  { name: 'Colgate Total Toothpaste 5.1oz', brand: 'Colgate', amount: 4.29, ticker: 'CL', stockName: 'Colgate-Palmolive', confidence: 0.94 },
  { name: 'Farm Fresh Large Eggs 12ct', brand: null, amount: 3.52, ticker: '', stockName: '', confidence: 0 },
]

const RECEIPT_TOTAL = RECEIPT_ITEMS.reduce((s, i) => s + i.amount, 0)

function buildAllocations(roundUp: number) {
  // Group by ticker, sum amounts
  const map = new Map<string, { ticker: string; stockName: string; totalAmt: number; confidence: number }>()
  for (const item of RECEIPT_ITEMS) {
    if (!item.ticker) continue
    const existing = map.get(item.ticker)
    if (existing) {
      existing.totalAmt += item.amount
      existing.confidence = Math.max(existing.confidence, item.confidence)
    } else {
      map.set(item.ticker, { ticker: item.ticker, stockName: item.stockName, totalAmt: item.amount, confidence: item.confidence })
    }
  }

  const mappedTotal = Array.from(map.values()).reduce((s, v) => s + v.totalAmt, 0)

  return Array.from(map.values())
    .sort((a, b) => b.totalAmt - a.totalAmt)
    .map(v => {
      const pct = v.totalAmt / mappedTotal
      return {
        ticker: v.ticker,
        stockName: v.stockName,
        amount: Math.round(roundUp * pct * 100) / 100,
        percentage: Math.round(pct * 100),
        confidence: v.confidence,
        reason: v.ticker === 'WMT' ? 'Retailer + store brand items' : 'Identified in receipt items',
      }
    })
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

const stepLabels = ['Upload', 'Extract', 'Analyze', 'Complete']

function StepDots({ currentIdx }: { currentIdx: number }) {
  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
      {stepLabels.map((label, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: done ? '#34D399' : active ? '#7C3AED' : 'rgba(255,255,255,0.15)',
              boxShadow: active ? '0 0 12px rgba(124,58,237,0.6)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '8px', color: '#fff',
            }}>
              {done && '✓'}
            </div>
            <span style={{ fontSize: '10px', color: active ? '#A78BFA' : 'var(--text-muted)' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: '48px', height: '48px', border: '3px solid rgba(124,58,237,0.2)',
      borderTop: '3px solid #7C3AED', borderRadius: '50%',
      animation: 'demoSpin 1s linear infinite',
    }} />
  )
}

export function DemoReceiptModal({
  open,
  onClose,
  roundUpAmount,
  onComplete,
}: {
  open: boolean
  roundUpAmount: number
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState<ProcessingStep>('idle')

  useEffect(() => {
    if (!open) setStep('idle')
  }, [open])

  const startProcessing = useCallback(() => {
    setStep('uploading')
    setTimeout(() => {
      setStep('extracting')
      setTimeout(() => {
        setStep('analyzing')
        setTimeout(() => {
          setStep('completed')
        }, 1500)
      }, 2000)
    }, 1500)
  }, [])

  const handleConfirm = () => {
    onComplete()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const allocations = buildAllocations(roundUpAmount)
  const stepIdx = step === 'uploading' ? 0 : step === 'extracting' ? 1 : step === 'analyzing' ? 2 : 3

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  }

  const card: React.CSSProperties = {
    background: 'var(--surface-card, #1a1a2e)',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
    borderRadius: '16px', maxWidth: '600px', width: '100%',
    maxHeight: '85vh', overflowY: 'auto', padding: '32px',
    position: 'relative',
  }

  return createPortal(
    <div style={overlay} onClick={onClose}>
      {/* Spinner keyframes */}
      <style>{`@keyframes demoSpin { to { transform: rotate(360deg); } }`}</style>

      <div style={card} onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '20px', padding: '4px',
          }}
        >
          ✕
        </button>

        {/* ---- IDLE STAGE ---- */}
        {step === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Smart Receipt Processing
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                Upload your receipt and let our AI automatically invest your round-up across relevant stocks
              </p>
            </div>

            {/* Dropzone */}
            <div
              onClick={startProcessing}
              style={{
                border: '2px dashed rgba(124,58,237,0.3)', borderRadius: '12px',
                padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                background: 'rgba(124,58,237,0.04)',
                transition: 'border-color 200ms, background 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; e.currentTarget.style.background = 'rgba(124,58,237,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)' }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Upload Receipt or Invoice
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                Drag and drop your receipt here, or click to browse
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>📄 PDF, JPG, JPEG, PNG</span>
                <span>📷 Photo receipts</span>
              </div>
            </div>

            {/* How it works */}
            <div style={{
              background: 'rgba(124,58,237,0.06)', borderRadius: '12px', padding: '20px',
              border: '1px solid rgba(124,58,237,0.1)',
            }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>How it works:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>1. Upload your receipt (PDF, JPG, PNG)</span>
                <span>2. AI extracts items, brands, and amounts</span>
                <span>3. System identifies relevant stocks (retailer + brands)</span>
                <span>4. Round-up is allocated across all relevant stocks</span>
                <span>5. Confirm to execute the investment</span>
              </div>
              <div style={{
                marginTop: '12px', padding: '12px 16px', borderRadius: '8px',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#93C5FD' }}>Example: </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  $100 purchase at Foot Locker (Nike + Under Armour) = ${roundUpAmount} round-up split between FL, NKE, and UAA stocks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ---- PROCESSING STAGES ---- */}
        {(step === 'uploading' || step === 'extracting' || step === 'analyzing') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
            <Spinner />
            <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {step === 'uploading' && 'Uploading receipt...'}
              {step === 'extracting' && 'Extracting items with AI...'}
              {step === 'analyzing' && 'Analyzing brands & calculating allocation...'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {step === 'uploading' && 'Saving your receipt securely'}
              {step === 'extracting' && 'Our AI is reading your receipt and identifying items'}
              {step === 'analyzing' && 'Mapping brands to stocks and calculating round-up split'}
            </p>
            <StepDots currentIdx={stepIdx} />
          </div>
        )}

        {/* ---- COMPLETED STAGE ---- */}
        {step === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Transaction Summary */}
            <div style={{
              padding: '20px', borderRadius: '12px',
              background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                    Transaction Summary
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CompanyLogo name="Walmart" size={24} />
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Walmart</span>
                    <span style={{ fontSize: '13px', color: '#7C3AED', fontWeight: 600 }}>(WMT)</span>
                  </div>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                  background: 'rgba(52,211,153,0.15)', color: '#34D399', letterSpacing: '0.05em',
                }}>
                  AI PROCESSED
                </span>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 2px' }}>Total Amount</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{fmt(RECEIPT_TOTAL)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 2px' }}>Round-Up Investment</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#34D399', margin: 0 }}>{fmt(roundUpAmount)}</p>
                </div>
              </div>
            </div>

            {/* Items Purchased */}
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
                Items Purchased ({RECEIPT_ITEMS.length})
              </p>
              <div style={{
                borderRadius: '10px', border: '1px solid var(--border-divider, rgba(255,255,255,0.06))',
                overflow: 'hidden',
              }}>
                {RECEIPT_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: i < RECEIPT_ITEMS.length - 1 ? '1px solid var(--border-divider, rgba(255,255,255,0.06))' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {item.ticker ? (
                        <CompanyLogo name={item.ticker} size={20} />
                      ) : (
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name}</span>
                      {item.brand && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>({item.brand})</span>
                      )}
                      {item.ticker && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', flexShrink: 0 }}>{item.ticker}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '12px' }}>
                      {fmt(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Allocation */}
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
                Investment Allocation
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allocations.map(a => (
                  <div
                    key={a.ticker}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '10px',
                      background: 'var(--surface-input, rgba(255,255,255,0.04))',
                      border: '1px solid var(--border-divider, rgba(255,255,255,0.06))',
                    }}
                  >
                    <CompanyLogo name={a.ticker} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#7C3AED' }}>{a.ticker}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.stockName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.reason}</span>
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px',
                          background: a.confidence >= 0.9 ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                          color: a.confidence >= 0.9 ? '#34D399' : '#FBBF24',
                        }}>
                          {a.confidence >= 0.9 ? 'High' : 'Medium'}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#34D399' }}>{fmt(a.amount)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <Button variant="secondary" size="sm" onClick={() => setStep('idle')}>
                New Receipt
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirm}>
                Confirm Investment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
