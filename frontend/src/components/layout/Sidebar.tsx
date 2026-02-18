import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

export interface SidebarItem {
  key: string
  label: string
}

interface SidebarProps {
  items: SidebarItem[]
  activeKey: string
  onSelect: (key: string) => void
  title?: string
  subtitle?: string
  onSignOut?: () => void
}

export function Sidebar({ items, activeKey, onSelect, title = 'Kamioi', subtitle, onSignOut }: SidebarProps) {
  const { toggleTheme, isLight } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`
        flex flex-col h-screen sticky top-0
        bg-surface-sidebar backdrop-blur-xl
        border-r border-border-subtle
        transition-all duration-300
        ${collapsed ? 'w-[68px]' : 'w-[260px]'}
      `}
    >
      {/* Logo */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <span className="text-[22px] font-extrabold bg-gradient-to-r from-aurora-purple via-aurora-blue to-aurora-teal bg-clip-text text-transparent">
                {title}
              </span>
              {subtitle && (
                <p className="text-[11px] font-semibold text-aurora-purple uppercase tracking-[1px] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-[8px] hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map(item => {
          const isActive = item.key === activeKey
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              title={collapsed ? item.label : undefined}
              className={`
                w-full text-left px-3 py-2 rounded-[8px] text-[13px]
                transition-all duration-150 cursor-pointer
                ${isActive
                  ? 'bg-gradient-to-r from-aurora-purple/20 to-aurora-blue/20 text-white font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }
                ${collapsed ? 'flex justify-center' : ''}
              `}
            >
              {collapsed ? item.label.charAt(0) : item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-2">
        <button
          onClick={toggleTheme}
          className={`
            w-full py-2 rounded-[8px] text-[13px]
            bg-white/5 border border-border-subtle
            hover:bg-white/10 transition-colors cursor-pointer
            ${collapsed ? 'px-2' : 'px-3'}
          `}
        >
          {collapsed ? (isLight ? 'D' : 'L') : (isLight ? 'Dark Mode' : 'Light Mode')}
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className={`
              w-full py-2 rounded-[8px] text-[13px]
              bg-status-error/10 border border-status-error/20 text-status-error
              hover:bg-status-error/20 transition-colors cursor-pointer
              ${collapsed ? 'px-2' : 'px-3'}
            `}
          >
            {collapsed ? 'X' : 'Sign Out'}
          </button>
        )}
      </div>
    </aside>
  )
}
