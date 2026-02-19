import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { GlassCard } from './GlassCard';

type Accent = 'purple' | 'blue' | 'teal' | 'pink';
type ChangeType = 'positive' | 'neutral';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: ChangeType;
  icon?: ReactNode;
  accent?: Accent;
  className?: string;
}

const iconBgColors: Record<Accent, string> = {
  purple: 'rgba(124,58,237,0.15)',
  blue: 'rgba(59,130,246,0.15)',
  teal: 'rgba(6,182,212,0.15)',
  pink: 'rgba(236,72,153,0.15)',
};

const iconTextColors: Record<Accent, string> = {
  purple: '#7C3AED',
  blue: '#3B82F6',
  teal: '#06B6D4',
  pink: '#EC4899',
};

const hoverGlows: Record<Accent, string> = {
  purple: '0 8px 32px rgba(124,58,237,0.3)',
  blue: '0 8px 32px rgba(59,130,246,0.3)',
  teal: '0 8px 32px rgba(6,182,212,0.3)',
  pink: '0 8px 32px rgba(236,72,153,0.3)',
};

const changeBadgeStyles: Record<ChangeType, { bg: string; color: string }> = {
  positive: { bg: 'rgba(52,211,153,0.12)', color: '#34D399' },
  neutral: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
};

export function KpiCard({
  label,
  value,
  change,
  changeType = 'positive',
  icon,
  accent = 'purple',
  className,
}: KpiCardProps) {
  const badgeStyle = changeBadgeStyles[changeType];

  return (
    <GlassCard
      accent={accent}
      padding="24px"
      className={clsx('kpi-card', className)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = hoverGlows[accent];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: change ? '8px' : '0',
            }}
          >
            {value}
          </p>
          {change && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '20px',
                background: badgeStyle.bg,
                color: badgeStyle.color,
              }}
            >
              {change}
            </span>
          )}
        </div>

        {icon && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: iconBgColors[accent],
              color: iconTextColors[accent],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default KpiCard;
