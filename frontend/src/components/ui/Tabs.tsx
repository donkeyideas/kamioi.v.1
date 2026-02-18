import { useState, type ReactNode } from 'react'

interface Tab {
  key: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key || '')

  const activeTab = tabs.find(t => t.key === active)

  return (
    <div>
      <div className="flex gap-1 border-b border-border-subtle mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`
              px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer
              border-b-2 -mb-px
              ${active === tab.key
                ? 'border-aurora-purple text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  )
}
