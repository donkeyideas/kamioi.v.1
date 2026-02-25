import { useState } from 'react'
import { Button } from '@/components/ui'
import { ReceiptUploadModal } from './ReceiptUploadModal'

function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  )
}

interface UploadReceiptButtonProps {
  onUploadComplete?: () => void
  dashboardType?: 'individual' | 'business' | 'family'
}

export function UploadReceiptButton({ onUploadComplete, dashboardType = 'individual' }: UploadReceiptButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowModal(true)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ReceiptIcon />
          Upload Receipt
        </span>
      </Button>
      <ReceiptUploadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={onUploadComplete}
        dashboardType={dashboardType}
      />
    </>
  )
}
