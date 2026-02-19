import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type DotColor = 'purple' | 'blue' | 'teal' | 'pink';

export interface ActivityItem {
  color: DotColor;
  text: ReactNode;
  time: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
  emptyMessage?: string;
}

const dotColors: Record<DotColor, string> = {
  purple: '#7C3AED',
  blue: '#3B82F6',
  teal: '#06B6D4',
  pink: '#EC4899',
};

const dotGlows: Record<DotColor, string> = {
  purple: '0 0 8px rgba(124,58,237,0.4)',
  blue: '0 0 8px rgba(59,130,246,0.4)',
  teal: '0 0 8px rgba(6,182,212,0.4)',
  pink: '0 0 8px rgba(236,72,153,0.4)',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '32px 16px',
  color: 'var(--text-muted)',
  fontSize: '13px',
};

export function ActivityFeed({
  items,
  className,
  emptyMessage = 'No recent activity',
}: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className={clsx('aurora-activity-feed', className)} style={emptyStyle}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={clsx('aurora-activity-feed', className)}
      style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 0',
            borderBottom:
              i < items.length - 1
                ? '1px solid var(--border-divider)'
                : 'none',
          }}
        >
          {/* Dot */}
          <div
            style={{
              flexShrink: 0,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: dotColors[item.color],
              boxShadow: dotGlows[item.color],
              marginTop: '6px',
            }}
          />

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              {item.text}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityFeed;
