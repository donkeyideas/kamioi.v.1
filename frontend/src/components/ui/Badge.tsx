import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'purple' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<
  BadgeVariant,
  { dot: string; bg: string; color: string }
> = {
  success: {
    dot: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    color: '#34D399',
  },
  warning: {
    dot: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    color: '#FBBF24',
  },
  error: {
    dot: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    color: '#EF4444',
  },
  info: {
    dot: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    color: '#3B82F6',
  },
  purple: {
    dot: '#7C3AED',
    bg: 'rgba(124,58,237,0.12)',
    color: '#7C3AED',
  },
  default: {
    dot: 'rgba(248,250,252,0.4)',
    bg: 'rgba(255,255,255,0.06)',
    color: 'rgba(248,250,252,0.6)',
  },
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const vs = variantStyles[variant];

  return (
    <span
      className={clsx('aurora-badge', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1.5,
        background: vs.bg,
        color: vs.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: vs.dot,
          flexShrink: 0,
        }}
      />
      {children}
    </span>
  );
}

export default Badge;
