import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface QuickAction {
  label: string;
  icon?: ReactNode;
  gradient: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '16px',
  borderRadius: '12px',
  border: 'none',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 600,
  color: '#FFFFFF',
  cursor: 'pointer',
  transition: 'all 300ms ease',
  textAlign: 'left',
  width: '100%',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px 16px',
  color: 'rgba(248,250,252,0.3)',
  fontSize: '13px',
};

export function QuickActions({ actions, className }: QuickActionsProps) {
  if (actions.length === 0) {
    return (
      <div className={clsx('aurora-quick-actions', className)} style={emptyStyle}>
        No actions available
      </div>
    );
  }

  return (
    <div
      className={clsx('aurora-quick-actions', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          style={{
            ...btnStyle,
            background: action.gradient,
          }}
          onClick={action.onClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {action.icon && (
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {action.icon}
            </span>
          )}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export default QuickActions;
