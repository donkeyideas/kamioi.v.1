import { useEffect, useCallback, type ReactNode } from 'react';
import { clsx } from 'clsx';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  className?: string;
}

const sizeMaxWidths: Record<ModalSize, string> = {
  sm: '420px',
  md: '560px',
  lg: '720px',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  padding: '20px',
};

const panelStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  background: 'rgba(15,11,26,0.9)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(124,58,237,0.2)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: 'rgba(248,250,252,0.6)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '16px',
  lineHeight: 1,
  transition: 'all 200ms ease',
  padding: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#F8FAFC',
  marginBottom: '16px',
  paddingRight: '40px',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      style={backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top light line */}
      <div
        className={clsx('aurora-modal-panel', className)}
        style={{
          ...panelStyle,
          maxWidth: sizeMaxWidths[size],
        }}
      >
        {/* Light line at top */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            pointerEvents: 'none',
            borderRadius: '16px 16px 0 0',
          }}
        />

        {/* Close button */}
        <button
          style={closeBtnStyle}
          onClick={onClose}
          aria-label="Close modal"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(248,250,252,0.6)';
          }}
        >
          &#x2715;
        </button>

        {title && <h2 style={titleStyle}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default Modal;
