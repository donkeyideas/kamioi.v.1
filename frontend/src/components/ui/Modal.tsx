import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { clsx } from 'clsx';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

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
  xl: '960px',
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
  background: 'var(--surface-modal)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(124,58,237,0.2)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--surface-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  color: 'var(--text-secondary)',
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
  color: 'var(--text-primary)',
  marginBottom: '16px',
  paddingRight: '52px',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previously focused element and manage focus
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element after render
    const timer = setTimeout(() => {
      if (panelRef.current) {
        const first = panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      // Restore focus to previously focused element
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Keyboard handler: Escape to close + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'aurora-modal-title' : undefined}
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
              'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
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
            e.currentTarget.style.background = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-input)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          &#x2715;
        </button>

        {title && <h2 id="aurora-modal-title" style={titleStyle}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default Modal;
