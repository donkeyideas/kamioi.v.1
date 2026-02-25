import { useEffect, useState, useCallback } from 'react'
import { GlassCard, Button } from '@/components/ui'
import { listLinkedAccounts, disconnectAccount, type TellerEnrollment } from '@/services/tellerService'
import { TellerConnectWidget } from './TellerConnectWidget'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 0',
  borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
}

const bankIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
  flexShrink: 0,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface LinkedAccountsCardProps {
  onSyncComplete?: () => void
}

export function LinkedAccountsCard({ onSyncComplete }: LinkedAccountsCardProps) {
  const [enrollments, setEnrollments] = useState<TellerEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [showWidget, setShowWidget] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const { enrollments: e } = await listLinkedAccounts()
      setEnrollments(e)
    } catch {
      // Silently fail — user may not have Teller configured
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAccounts()
  }, [fetchAccounts])

  const handleDisconnect = async (enrollmentId: string) => {
    setDisconnecting(enrollmentId)
    try {
      await disconnectAccount(enrollmentId)
      setEnrollments((prev) => prev.filter((e) => e.enrollment_id !== enrollmentId))
    } catch (err) {
      console.error('Disconnect error:', err)
    } finally {
      setDisconnecting(null)
    }
  }

  const handleWidgetSuccess = () => {
    setShowWidget(false)
    void fetchAccounts()
    onSyncComplete?.()
    window.dispatchEvent(new CustomEvent('bankSyncComplete'))
  }

  return (
    <>
      <GlassCard accent="teal" style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Linked Bank Accounts
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Connect your bank to automatically sync transactions
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowWidget(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Link Account
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Loading accounts...
          </p>
        )}

        {/* Empty state */}
        {!loading && enrollments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
              No bank accounts linked yet
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Link your bank or credit card to start syncing transactions automatically
            </p>
          </div>
        )}

        {/* Enrollment list */}
        {enrollments.map((enrollment) => (
          <div key={enrollment.enrollment_id} style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={bankIconStyle}>
                {(enrollment.institution_name || 'B')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {enrollment.institution_name || 'Bank Account'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: enrollment.is_active ? '#10B981' : '#EF4444',
                      display: 'inline-block',
                    }} />
                    {enrollment.is_active ? 'Connected' : 'Disconnected'}
                  </span>
                  <span>·</span>
                  <span>Synced {formatDate(enrollment.last_synced_at)}</span>
                </div>
                {enrollment.teller_accounts && enrollment.teller_accounts.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {enrollment.teller_accounts.length} account{enrollment.teller_accounts.length !== 1 ? 's' : ''}
                    {enrollment.teller_accounts.filter((a) => a.last_four).length > 0 && (
                      <>
                        {' · '}
                        {enrollment.teller_accounts
                          .filter((a) => a.last_four)
                          .map((a) => `••${a.last_four}`)
                          .join(', ')}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDisconnect(enrollment.enrollment_id)}
              disabled={disconnecting === enrollment.enrollment_id}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#EF4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: 6,
                opacity: disconnecting === enrollment.enrollment_id ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {disconnecting === enrollment.enrollment_id ? 'Unlinking...' : 'Unlink'}
            </button>
          </div>
        ))}
      </GlassCard>

      {/* Teller Connect Widget */}
      <TellerConnectWidget
        open={showWidget}
        onClose={() => setShowWidget(false)}
        onSuccess={handleWidgetSuccess}
      />
    </>
  )
}
