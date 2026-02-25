import { useEffect, useState, useCallback, useRef } from 'react'
import { saveEnrollment, syncTransactions } from '@/services/tellerService'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TellerConnectWidgetProps {
  open: boolean
  onClose: () => void
  onSuccess?: (result: { synced: number; mapped: number }) => void
}

interface TellerConnectInstance {
  open: () => void
  destroy?: () => void
}

interface TellerConnectSetupOptions {
  applicationId: string
  environment: 'sandbox' | 'development' | 'production'
  onSuccess: (enrollment: { accessToken: string; enrollment: { id: string; institution: { name: string; id: string } } }) => void
  onExit: () => void
  onInit?: () => void
}

declare global {
  interface Window {
    TellerConnect?: {
      setup: (options: TellerConnectSetupOptions) => TellerConnectInstance
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TELLER_APPLICATION_ID = 'app_pp4g9q3migl53hjbsi000'
const TELLER_ENVIRONMENT = 'sandbox' as const
const TELLER_CONNECT_SCRIPT = 'https://cdn.teller.io/connect/connect.js'

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
}

const modalStyle: React.CSSProperties = {
  background: 'var(--surface-card, #1a1a2e)',
  borderRadius: 16,
  border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
  width: '100%',
  maxWidth: 440,
  padding: '32px 28px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  position: 'relative',
}

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 'none',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TellerConnectWidget({ open, onClose, onSuccess }: TellerConnectWidgetProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'syncing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<TellerConnectInstance | null>(null)
  const scriptLoadedRef = useRef(false)

  // Load Teller Connect script
  useEffect(() => {
    if (scriptLoadedRef.current || document.querySelector(`script[src="${TELLER_CONNECT_SCRIPT}"]`)) {
      scriptLoadedRef.current = true
      return
    }

    const script = document.createElement('script')
    script.src = TELLER_CONNECT_SCRIPT
    script.async = true
    script.onload = () => { scriptLoadedRef.current = true }
    script.onerror = () => { setError('Failed to load Teller Connect') }
    document.head.appendChild(script)
  }, [])

  // Initialize and open Teller Connect when widget opens
  const initTellerConnect = useCallback(() => {
    if (!window.TellerConnect) {
      setError('Teller Connect not loaded. Please try again.')
      setStatus('error')
      return
    }

    setStatus('ready')
    setError(null)

    const instance = window.TellerConnect.setup({
      applicationId: TELLER_APPLICATION_ID,
      environment: TELLER_ENVIRONMENT,
      onInit: () => {
        // Teller Connect initialized
      },
      onSuccess: async (enrollment) => {
        setStatus('syncing')

        try {
          // Save enrollment to our backend
          await saveEnrollment(
            enrollment.accessToken,
            enrollment.enrollment.id,
            enrollment.enrollment.institution,
          )

          // Sync transactions
          const result = await syncTransactions(enrollment.enrollment.id)

          window.dispatchEvent(new CustomEvent('bankSyncComplete'))
          onSuccess?.({ synced: result.synced, mapped: result.mapped })
        } catch (err) {
          console.error('Post-connect sync error:', err)
        } finally {
          onClose()
        }
      },
      onExit: () => {
        onClose()
      },
    })

    instanceRef.current = instance
    instance.open()
  }, [onClose, onSuccess])

  // When opened, wait for script + init
  useEffect(() => {
    if (!open) {
      setStatus('loading')
      setError(null)
      return
    }

    // Poll for TellerConnect availability (script may still be loading)
    let attempts = 0
    const maxAttempts = 30 // 3 seconds
    const interval = setInterval(() => {
      attempts++
      if (window.TellerConnect) {
        clearInterval(interval)
        initTellerConnect()
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
        setError('Teller Connect failed to load. Please refresh and try again.')
        setStatus('error')
      }
    }, 100)

    return () => clearInterval(interval)
  }, [open, initTellerConnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      instanceRef.current?.destroy?.()
    }
  }, [])

  if (!open) return null

  // Only show overlay during syncing or error states
  // Teller Connect opens its own modal, so we just show status feedback
  if (status === 'loading' || status === 'ready') {
    // Teller Connect handles its own UI — show nothing unless there's an issue
    return null
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && status !== 'syncing') onClose() }}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
          &times;
        </button>

        {status === 'syncing' && (
          <>
            <div style={{ fontSize: 36 }}>🏦</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Syncing Transactions...
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              Fetching your transactions and mapping them to investments. This may take a moment.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 36 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#EF4444', margin: 0 }}>
              Connection Error
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              {error || 'Something went wrong. Please try again.'}
            </p>
            <button
              onClick={() => { setError(null); initTellerConnect() }}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#06B6D4',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
