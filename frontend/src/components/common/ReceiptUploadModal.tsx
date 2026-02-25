import { useState, useRef, useCallback, useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button } from '@/components/ui'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import {
  uploadReceipt,
  processReceipt,
  confirmReceipt,
  type ReceiptParsedData,
  type ReceiptAllocation,
} from '@/services/api'

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ReceiptUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  dashboardType: 'individual' | 'business' | 'family'
}

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'completed' | 'error' | 'manual-entry'

interface ManualItem {
  name: string
  amount: string
  brand: string
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '20px',
  },
  panel: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '720px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    background: 'var(--surface-modal, #1e1e2f)',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(124, 58, 237, 0.15)',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-input, rgba(255,255,255,0.05))',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
    borderRadius: '8px',
    color: 'var(--text-secondary, #999)',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
    padding: 0,
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary, #fff)',
    marginBottom: '16px',
    paddingRight: '52px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  dropzone: {
    border: '2px dashed var(--border-subtle)',
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    background: 'var(--surface-input)',
  },
  dropzoneActive: {
    borderColor: 'var(--aurora-purple)',
    background: 'rgba(124, 58, 237, 0.08)',
  },
  uploadIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--aurora-blue), var(--aurora-purple))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  fileTypes: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '16px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  howItWorks: {
    background: 'var(--surface-input)',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
  },
  howTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  stepList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  exampleBox: {
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(59, 130, 246, 0.1))',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '16px',
    fontSize: '13px',
  },
  exampleLabel: {
    color: 'var(--aurora-purple)',
    fontWeight: 600,
    fontSize: '12px',
    marginBottom: '4px',
  },
  exampleText: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  // Processing
  progressContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '24px',
    padding: '32px 0',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid var(--border-subtle)',
    borderTop: '3px solid var(--aurora-purple)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  stepIndicator: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--border-subtle)',
    transition: 'all 300ms ease',
  },
  stepDotActive: {
    background: 'var(--aurora-purple)',
    boxShadow: '0 0 8px rgba(124, 58, 237, 0.5)',
  },
  stepDotDone: {
    background: 'var(--status-success)',
  },
  // Allocation
  allocCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'var(--surface-input)',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    marginBottom: '8px',
  },
  allocLogo: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  allocInfo: {
    flex: 1,
  },
  allocName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  allocReason: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  allocRight: {
    textAlign: 'right' as const,
  },
  allocAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--aurora-green, #10b981)',
  },
  allocPct: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  // Summary section
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },
  summaryLabel: {
    color: 'var(--text-secondary)',
  },
  summaryValue: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  divider: {
    height: '1px',
    background: 'var(--border-subtle)',
    margin: '12px 0',
  },
  // Form
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  itemRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  // Buttons
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  // Items table
  itemsTable: {
    width: '100%',
    marginTop: '8px',
  },
  itemsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '13px',
    borderBottom: '1px solid var(--border-subtle)',
  },
}

/* -------------------------------------------------------------------------- */
/*  SVG Icons                                                                  */
/* -------------------------------------------------------------------------- */

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Keyframe injection                                                         */
/* -------------------------------------------------------------------------- */

const SPIN_CSS = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
if (typeof document !== 'undefined' && !document.getElementById('receipt-spin-css')) {
  const style = document.createElement('style')
  style.id = 'receipt-spin-css'
  style.textContent = SPIN_CSS
  document.head.appendChild(style)
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function ReceiptUploadModal({ isOpen, onClose, onComplete, dashboardType }: ReceiptUploadModalProps) {
  // Core state
  const [step, setStep] = useState<ProcessingStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Receipt data
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [parsedData, setParsedData] = useState<ReceiptParsedData | null>(null)
  const [allocations, setAllocations] = useState<ReceiptAllocation[]>([])
  const [totalRoundUp, setTotalRoundUp] = useState(1)
  const [aiProvider, setAiProvider] = useState<string>('')

  // Manual entry
  const [manualRetailer, setManualRetailer] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualItems, setManualItems] = useState<ManualItem[]>([{ name: '', amount: '', brand: '' }])

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)

  /* ---- Reset ---- */
  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setReceiptId(null)
    setParsedData(null)
    setAllocations([])
    setTotalRoundUp(1)
    setAiProvider('')
    setManualRetailer('')
    setManualAmount('')
    setManualItems([{ name: '', amount: '', brand: '' }])
    setIsEditing(false)
    setIsDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  /* ---- Upload + Process pipeline ---- */
  const handleFile = useCallback(async (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setError('Invalid file type. Accepted: PNG, JPG, PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10 MB.')
      return
    }

    setError(null)
    setStep('uploading')

    // Step 1: Upload
    const { data: uploadData, error: uploadErr } = await uploadReceipt(file)
    if (uploadErr || !uploadData) {
      setError(uploadErr || 'Upload failed')
      setStep('error')
      return
    }
    setReceiptId(uploadData.receipt_id)

    // Step 2: Process (AI extraction + allocation)
    setStep('extracting')
    const { data: processData, error: processErr } = await processReceipt(uploadData.receipt_id)
    if (processErr || !processData) {
      // AI failed — offer manual entry
      setError(processErr || 'AI extraction failed')
      setStep('manual-entry')
      return
    }

    // Step 3: Display results
    setParsedData(processData.parsed_data)
    setAllocations(processData.allocation_data.allocations)
    setTotalRoundUp(processData.allocation_data.totalRoundUp)
    setAiProvider(processData.ai_provider)

    if (processData.allocation_data.allocations.length === 0) {
      // No stocks identified — let user review/edit
      setStep('manual-entry')
    } else {
      setStep('completed')
    }
  }, [])

  /* ---- Drag & Drop ---- */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  /* ---- File input ---- */
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  /* ---- Manual entry submit ---- */
  const handleManualSubmit = useCallback(async () => {
    if (!manualRetailer || !manualAmount) return

    const total = parseFloat(manualAmount) || 0
    const items = manualItems
      .filter(i => i.name && i.amount)
      .map(i => ({
        name: i.name,
        brand: i.brand || null,
        amount: parseFloat(i.amount) || 0,
        brandSymbol: null,
        brandConfidence: 0,
      }))

    const manual: ReceiptParsedData = {
      retailer: { name: manualRetailer, stockSymbol: null },
      items,
      totalAmount: total,
      timestamp: new Date().toISOString(),
    }

    setParsedData(manual)
    setStep('analyzing')

    // If we have a receipt_id, re-process to get allocations
    if (receiptId) {
      const { data, error: err } = await processReceipt(receiptId)
      if (data && !err) {
        setAllocations(data.allocation_data.allocations)
        setTotalRoundUp(data.allocation_data.totalRoundUp)
        setStep('completed')
        return
      }
    }

    // Fallback: no allocations, still let user confirm
    setAllocations([])
    setTotalRoundUp(1)
    setStep('completed')
  }, [manualRetailer, manualAmount, manualItems, receiptId])

  /* ---- Confirm transaction ---- */
  const handleConfirm = useCallback(async () => {
    if (!receiptId) return

    setStep('analyzing')
    const { data, error: err } = await confirmReceipt(
      receiptId,
      parsedData && allocations.length > 0
        ? { parsed_data: parsedData, allocation_data: { allocations, totalRoundUp } }
        : undefined,
    )

    if (err || !data) {
      setError(err || 'Failed to create transaction')
      setStep('error')
      return
    }

    // Dispatch event so TransactionsTab auto-refreshes
    window.dispatchEvent(new CustomEvent('receiptProcessed'))
    onComplete?.()
    handleClose()
  }, [receiptId, parsedData, allocations, totalRoundUp, onComplete, handleClose])

  /* ---- Processing steps ---- */
  const STEPS = ['Upload', 'Extract', 'Analyze', 'Complete']
  const stepIndex = step === 'uploading' ? 0 : step === 'extracting' ? 1 : step === 'analyzing' ? 2 : step === 'completed' ? 3 : -1

  /* ---- Lock body scroll + Escape key ---- */
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, handleClose])

  /* ==================================================================== */
  /*  RENDER                                                               */
  /* ==================================================================== */

  if (!isOpen) return null

  return createPortal(
    <div
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div style={styles.panel}>
        {/* Top glow line */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--highlight-line, rgba(124,58,237,0.4)), transparent)',
            pointerEvents: 'none',
            borderRadius: '16px 16px 0 0',
          }}
        />
        {/* Close button */}
        <button style={styles.closeBtn} onClick={handleClose} aria-label="Close modal">&#x2715;</button>
        <h2 style={styles.modalTitle}>Upload Receipt or Invoice</h2>

      {/* ---- IDLE: Upload zone ---- */}
      {step === 'idle' && (
        <>
          <div style={styles.header}>
            <div style={styles.title}>Smart Receipt Processing</div>
            <div style={styles.subtitle}>
              Upload your receipt and let our AI automatically invest your round-up across relevant stocks
            </div>
          </div>

          {/* Dropzone */}
          <div
            style={{ ...styles.dropzone, ...(isDragOver ? styles.dropzoneActive : {}) }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={styles.uploadIcon}>
              <UploadIcon />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Upload Receipt or Invoice
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Drag and drop your receipt here, or click to browse
            </div>
            <div style={styles.fileTypes}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileIcon /> PDF, JPG, JPEG, PNG</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CameraIcon /> Photo receipts</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--status-error)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* How it works */}
          <div style={styles.howItWorks}>
            <div style={styles.howTitle}>How it works:</div>
            <ol style={styles.stepList}>
              <li>1. Upload your receipt (PDF, JPG, PNG)</li>
              <li>2. AI extracts items, brands, and amounts</li>
              <li>3. System identifies relevant stocks (retailer + brands)</li>
              <li>4. Round-up is allocated across all relevant stocks</li>
              <li>5. Confirm to execute the investment</li>
            </ol>
            <div style={styles.exampleBox}>
              <div style={styles.exampleLabel}>Example:</div>
              <div style={styles.exampleText}>
                $100 purchase at Foot Locker (Nike + Under Armour) = $1 round-up split between FL, NKE, and UAA stocks
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---- PROCESSING: Upload/Extract/Analyze ---- */}
      {(step === 'uploading' || step === 'extracting' || step === 'analyzing') && (
        <div style={styles.progressContainer}>
          <div style={styles.spinner} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {step === 'uploading' && 'Uploading receipt...'}
            {step === 'extracting' && 'Extracting items with AI...'}
            {step === 'analyzing' && 'Analyzing brands & calculating allocation...'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {step === 'uploading' && 'Saving your receipt securely'}
            {step === 'extracting' && 'Our AI is reading your receipt and identifying items'}
            {step === 'analyzing' && 'Mapping brands to stocks and calculating your round-up split'}
          </div>
          {/* Step dots */}
          <div style={styles.stepIndicator}>
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  ...styles.stepDot,
                  ...(i === stepIndex ? styles.stepDotActive : {}),
                  ...(i < stepIndex ? styles.stepDotDone : {}),
                }}
                title={s}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- ERROR ---- */}
      {step === 'error' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Processing Failed
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {error || 'Something went wrong. Please try again or enter details manually.'}
          </div>
          <div style={styles.buttonRow}>
            <Button variant="secondary" onClick={reset} style={{ flex: 1 }}>Try Again</Button>
            <Button
              variant="primary"
              onClick={() => { setStep('manual-entry'); setError(null) }}
              style={{ flex: 1 }}
            >
              Enter Manually
            </Button>
          </div>
        </div>
      )}

      {/* ---- MANUAL ENTRY ---- */}
      {step === 'manual-entry' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {error ? 'AI extraction failed — Enter details manually' : 'Review & Edit Receipt Data'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Enter or correct the receipt details below for accurate stock allocation.
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Retailer / Store Name</label>
            <input
              style={styles.input}
              type="text"
              value={manualRetailer}
              onChange={(e) => setManualRetailer(e.target.value)}
              placeholder="e.g., Foot Locker, Target, Nike Store"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Total Amount</label>
            <input
              style={styles.input}
              type="number"
              step="0.01"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Items (Optional — for better stock allocation)</label>
            {manualItems.map((item, idx) => (
              <div key={idx} style={styles.itemRow}>
                <input
                  style={{ ...styles.input, flex: 2 }}
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const items = [...manualItems]
                    items[idx] = { ...items[idx], name: e.target.value }
                    setManualItems(items)
                  }}
                  placeholder="Item name"
                />
                <input
                  style={{ ...styles.input, flex: 1 }}
                  type="text"
                  value={item.brand}
                  onChange={(e) => {
                    const items = [...manualItems]
                    items[idx] = { ...items[idx], brand: e.target.value }
                    setManualItems(items)
                  }}
                  placeholder="Brand (e.g., Nike)"
                />
                <input
                  style={{ ...styles.input, width: '90px', flex: 'none' }}
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => {
                    const items = [...manualItems]
                    items[idx] = { ...items[idx], amount: e.target.value }
                    setManualItems(items)
                  }}
                  placeholder="$"
                />
                {idx > 0 && (
                  <button
                    onClick={() => setManualItems(manualItems.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setManualItems([...manualItems, { name: '', amount: '', brand: '' }])}
              style={{ background: 'none', border: 'none', color: 'var(--aurora-purple)', cursor: 'pointer', fontSize: '13px', padding: '4px 0' }}
            >
              + Add Item
            </button>
          </div>

          <div style={styles.buttonRow}>
            <Button variant="secondary" onClick={reset} style={{ flex: 1 }}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleManualSubmit}
              disabled={!manualRetailer || !manualAmount}
              style={{ flex: 1 }}
            >
              Process Receipt
            </Button>
          </div>
        </div>
      )}

      {/* ---- COMPLETED: Show results ---- */}
      {step === 'completed' && parsedData && (
        <div>
          {/* Transaction Summary */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Transaction Summary
              </div>
              {aiProvider && (
                <Badge variant="info">{aiProvider.toUpperCase()}</Badge>
              )}
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Retailer</span>
              <span style={styles.summaryValue}>
                {parsedData.retailer.name}
                {parsedData.retailer.stockSymbol && (
                  <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--aurora-purple)' }}>
                    ({parsedData.retailer.stockSymbol})
                  </span>
                )}
              </span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Total Amount</span>
              <span style={styles.summaryValue}>${parsedData.totalAmount.toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Round-Up Investment</span>
              <span style={{ ...styles.summaryValue, color: 'var(--aurora-green, #10b981)' }}>
                ${totalRoundUp.toFixed(2)}
              </span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* Items Purchased */}
          {parsedData.items.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Items Purchased
              </div>
              {parsedData.items.map((item, idx) => (
                <div key={idx} style={styles.itemsRow}>
                  <div>
                    <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    {item.brand && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {item.brand}
                        {item.brandSymbol && ` (${item.brandSymbol})`}
                      </span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Allocation Preview */}
          {allocations.length > 0 && (
            <>
              <div style={styles.divider} />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Investment Allocation
                </div>
                {allocations.map((alloc, idx) => (
                  <div key={idx} style={styles.allocCard}>
                    <div style={styles.allocLogo}>
                      <CompanyLogo name={alloc.stockName} size={36} />
                    </div>
                    <div style={styles.allocInfo}>
                      <div style={styles.allocName}>
                        {alloc.stockSymbol}
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '12px' }}>
                          {alloc.stockName}
                        </span>
                      </div>
                      <div style={styles.allocReason}>{alloc.reason}</div>
                    </div>
                    <div>
                      <Badge
                        variant={alloc.confidence >= 0.9 ? 'success' : alloc.confidence >= 0.7 ? 'warning' : 'info'}
                      >
                        {alloc.confidence >= 0.9 ? 'High' : alloc.confidence >= 0.7 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                    <div style={styles.allocRight}>
                      <div style={styles.allocAmount}>${alloc.amount.toFixed(2)}</div>
                      <div style={styles.allocPct}>{alloc.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={styles.buttonRow}>
            <Button variant="secondary" onClick={() => { setIsEditing(true); setStep('manual-entry'); setManualRetailer(parsedData.retailer.name); setManualAmount(String(parsedData.totalAmount)) }} style={{ flex: 1 }}>
              Edit
            </Button>
            <Button variant="secondary" onClick={reset} style={{ flex: 1 }}>
              New Receipt
            </Button>
            <Button variant="primary" onClick={handleConfirm} style={{ flex: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <CheckIcon /> Confirm Investment
              </span>
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>,
    document.body
  )
}

export default ReceiptUploadModal
