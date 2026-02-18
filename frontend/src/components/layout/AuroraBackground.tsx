import { memo } from 'react'

/**
 * AuroraBackground renders 4 animated gradient blobs that create
 * the signature aurora effect behind all dashboard content.
 * Fixed position, pointer-events: none, z-index: 0.
 */
function AuroraBackgroundBase() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="aurora-blob aurora-blob--purple" />
      <div className="aurora-blob aurora-blob--blue" />
      <div className="aurora-blob aurora-blob--teal" />
      <div className="aurora-blob aurora-blob--pink" />
    </div>
  )
}

export const AuroraBackground = memo(AuroraBackgroundBase)
