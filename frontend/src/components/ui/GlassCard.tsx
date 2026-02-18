import type { ReactNode, HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Accent = 'purple' | 'blue' | 'teal' | 'pink';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: Accent;
  className?: string;
  children: ReactNode;
  padding?: string;
}

const accentGradients: Record<Accent, string> = {
  purple: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent)',
  blue: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)',
  teal: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)',
  pink: 'linear-gradient(90deg, transparent, rgba(236,72,153,0.6), transparent)',
};

export function GlassCard({
  accent,
  className,
  children,
  padding = '24px',
  ...rest
}: GlassCardProps) {
  return (
    <div
      data-accent={accent ?? undefined}
      className={clsx('glass-card', className)}
      style={{
        position: 'relative',
        background: 'rgba(15,11,26,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding,
        transition: 'transform 300ms ease, box-shadow 300ms ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...rest}
    >
      {/* Top light line (::before equivalent) */}
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
        }}
      />

      {/* Gradient accent bar at top (::after equivalent) */}
      {accent && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: accentGradients[accent],
            pointerEvents: 'none',
          }}
        />
      )}

      {children}
    </div>
  );
}

export default GlassCard;
