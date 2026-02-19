import { useState, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
  onChange?: (key: string) => void;
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  borderBottom: '1px solid var(--border-subtle)',
  marginBottom: '24px',
  overflowX: 'auto',
};

const tabBtnBase: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '14px',
  padding: '12px 16px',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
  whiteSpace: 'nowrap',
  fontWeight: 500,
};

const tabBtnActive: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 600,
  borderBottomColor: '#7C3AED',
  borderImage: 'linear-gradient(90deg, #7C3AED, #3B82F6) 1',
};

export function Tabs({ tabs, defaultTab, className, onChange }: TabsProps) {
  const [activeKey, setActiveKey] = useState(
    defaultTab ?? tabs[0]?.key ?? '',
  );

  const activeTab = tabs.find((t) => t.key === activeKey);

  function handleTabClick(key: string) {
    setActiveKey(key);
    onChange?.(key);
  }

  if (tabs.length === 0) return null;

  return (
    <div className={clsx('aurora-tabs', className)}>
      <div style={tabBarStyle} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              style={{
                ...tabBtnBase,
                ...(isActive ? tabBtnActive : {}),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}

export default Tabs;
