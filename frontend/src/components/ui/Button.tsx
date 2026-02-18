import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<
  Variant,
  { base: React.CSSProperties; hover: React.CSSProperties }
> = {
  primary: {
    base: {
      background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
      color: '#FFFFFF',
      border: 'none',
    },
    hover: {
      boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
      filter: 'brightness(1.1)',
    },
  },
  secondary: {
    base: {
      background: 'rgba(255,255,255,0.06)',
      color: '#F8FAFC',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    hover: {
      background: 'rgba(255,255,255,0.1)',
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: 'rgba(248,250,252,0.6)',
      border: '1px solid transparent',
    },
    hover: {
      background: 'rgba(255,255,255,0.05)',
      color: '#F8FAFC',
    },
  },
  danger: {
    base: {
      background: 'rgba(239,68,68,0.1)',
      color: '#EF4444',
      border: '1px solid rgba(239,68,68,0.2)',
    },
    hover: {
      background: 'rgba(239,68,68,0.2)',
    },
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '13px' },
  md: { padding: '10px 20px', fontSize: '14px' },
  lg: { padding: '14px 28px', fontSize: '15px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  return (
    <button
      className={clsx('aurora-btn', className)}
      disabled={disabled || loading}
      style={{
        fontFamily: 'inherit',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 300ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        ...vs.base,
        ...ss,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, vs.hover);
        }
      }}
      onMouseLeave={(e) => {
        // Reset hover styles
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.filter = '';
        Object.assign(e.currentTarget.style, vs.base);
      }}
      {...rest}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            animation: 'aurora-spin 600ms linear infinite',
          }}
        />
      )}
      {children}

      {/* Inline keyframes for spinner */}
      {loading && (
        <style>{`
          @keyframes aurora-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </button>
  );
}

export default Button;
