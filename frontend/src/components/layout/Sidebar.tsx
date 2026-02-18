import { type ReactNode, useCallback } from 'react'

/* -----------------------------------------------
   Type definitions
   ----------------------------------------------- */

export interface NavItem {
  /** Unique key for this item */
  id: string
  /** Display label */
  label: string
  /** Icon element (JSX, e.g. an SVG or emoji span) */
  icon: ReactNode
  /** Route path or callback identifier */
  href?: string
  /** Optional badge count shown on the right */
  badge?: number
}

export interface NavSection {
  /** Optional section heading (e.g. "Main", "Settings") */
  label?: string
  items: NavItem[]
}

export interface SidebarUserProfile {
  name: string
  role: string
  /** 1-2 character initials for the avatar circle */
  initials: string
}

type ViewMode = 'user' | 'admin'

export interface SidebarProps {
  /** Array of navigation sections */
  sections: NavSection[]
  /** Currently active nav item id */
  activeId: string
  /** Callback when a nav item is clicked */
  onNavigate: (item: NavItem) => void
  /** User profile shown at the bottom */
  user?: SidebarUserProfile
  /** Callback when user profile section is clicked */
  onUserClick?: () => void
  /** Logo text next to the icon */
  logoText?: string
  /** Logo icon content (defaults to "K") */
  logoIcon?: ReactNode
  /** Whether to show the user/admin toggle */
  showViewToggle?: boolean
  /** Current view mode */
  viewMode?: ViewMode
  /** Callback when view toggle changes */
  onViewModeChange?: (mode: ViewMode) => void
  /** Whether sidebar is open on mobile */
  isOpen?: boolean
  /** Callback to close sidebar on mobile */
  onClose?: () => void
}

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export function Sidebar({
  sections,
  activeId,
  onNavigate,
  user,
  onUserClick,
  logoText = 'Kamioi',
  logoIcon = 'K',
  showViewToggle = false,
  viewMode = 'user',
  onViewModeChange,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const handleNavClick = useCallback(
    (item: NavItem) => {
      onNavigate(item)
      // On mobile, close sidebar after navigation
      onClose?.()
    },
    [onNavigate, onClose],
  )

  const sidebarClass = [
    'aurora-sidebar',
    isOpen ? 'aurora-sidebar--open' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`aurora-sidebar-overlay${isOpen ? ' aurora-sidebar-overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={sidebarClass}>
        {/* Logo */}
        <div className="aurora-sidebar__logo">
          <div className="aurora-sidebar__logo-icon">{logoIcon}</div>
          <span className="aurora-sidebar__logo-text">{logoText}</span>
        </div>

        {/* View toggle (user/admin) */}
        {showViewToggle && (
          <div className="aurora-sidebar__toggle">
            <button
              type="button"
              className={`aurora-sidebar__toggle-btn${viewMode === 'user' ? ' aurora-sidebar__toggle-btn--active' : ''}`}
              onClick={() => onViewModeChange?.('user')}
            >
              User
            </button>
            <button
              type="button"
              className={`aurora-sidebar__toggle-btn${viewMode === 'admin' ? ' aurora-sidebar__toggle-btn--active' : ''}`}
              onClick={() => onViewModeChange?.('admin')}
            >
              Admin
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="aurora-sidebar__nav">
          {sections.length === 0 ? (
            <div className="aurora-empty" style={{ padding: '32px 16px' }}>
              <div className="aurora-empty__text">No navigation items</div>
            </div>
          ) : (
            sections.map((section, sIdx) => (
              <div className="aurora-sidebar__nav-section" key={section.label ?? `section-${sIdx}`}>
                {section.label && (
                  <div className="aurora-sidebar__nav-label">{section.label}</div>
                )}
                {section.items.map((item) => {
                  const isActive = item.id === activeId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`aurora-nav-item${isActive ? ' aurora-nav-item--active' : ''}`}
                      onClick={() => handleNavClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="aurora-nav-item__icon">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="aurora-nav-item__badge">{item.badge}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </nav>

        {/* User profile footer */}
        {user && (
          <div className="aurora-sidebar__footer">
            <div
              className="aurora-sidebar__user"
              onClick={onUserClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onUserClick?.()
                }
              }}
              role={onUserClick ? 'button' : undefined}
              tabIndex={onUserClick ? 0 : undefined}
            >
              <div className="aurora-sidebar__user-avatar">{user.initials}</div>
              <div className="aurora-sidebar__user-info">
                <div className="aurora-sidebar__user-name">{user.name}</div>
                <div className="aurora-sidebar__user-role">{user.role}</div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
