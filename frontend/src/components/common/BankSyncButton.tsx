import { useState, useCallback } from 'react'
import { Button } from '@/components/ui'
import { runBankSync } from '@/services/bankSync'

/* ---- Icon ---- */

function BankSyncIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

/* ---- Component ---- */

interface BankSyncButtonProps {
  onSyncComplete?: () => void
}

export function BankSyncButton({ onSyncComplete }: BankSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ count: number; matched: number; show: boolean } | null>(null)

  const handleBankSync = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await runBankSync()
      setSyncResult({ count: result.count, matched: result.matched, show: true })
      window.dispatchEvent(new CustomEvent('bankSyncComplete'))
      onSyncComplete?.()
      setTimeout(() => setSyncResult(prev => prev ? { ...prev, show: false } : null), 4000)
    } catch (err) {
      console.error('Bank sync error:', err)
    } finally {
      setSyncing(false)
    }
  }, [onSyncComplete])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Button
        variant="primary"
        size="sm"
        onClick={handleBankSync}
        disabled={syncing}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
      >
        <BankSyncIcon />
        {syncing ? 'Syncing...' : 'Bank Sync'}
      </Button>
      {syncResult?.show && (
        <span style={{
          fontSize: '12px',
          color: '#06B6D4',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          animation: 'fadeIn 300ms ease',
        }}>
          +{syncResult.count} synced ({syncResult.matched} mapped)
        </span>
      )}
    </div>
  )
}
