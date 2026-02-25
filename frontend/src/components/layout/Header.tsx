import { useState, useCallback, type ChangeEvent } from 'react'
import { useTheme } from '@/context/ThemeContext'

/* -----------------------------------------------
   Type definitions
   ----------------------------------------------- */

export interface HeaderProps {
  /** Main greeting line, e.g. "Good morning, Alex" */
  greeting: string
  /** Optional subtext below the greeting */
  subtitle?: string
  /** Notification count (0 or undefined hides badge) */
  notificationCount?: number
  /** Callback when notification bell is clicked */
  onNotificationClick?: () => void
  /** User initials for the avatar circle */
  userInitials?: string
  /** Callback when the user avatar is clicked */
  onAvatarClick?: () => void
  /** Callback when search input value changes */
  onSearch?: (query: string) => void
  /** Placeholder text for the search bar */
  searchPlaceholder?: string
  /** Callback for mobile menu button */
  onMenuToggle?: () => void
  /** Optional action buttons rendered before the search bar */
  headerActions?: React.ReactNode
}

/* -----------------------------------------------
   SVG Icon helpers (inline, no external deps)
   ----------------------------------------------- */

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export function Header({
  greeting,
  subtitle,
  notificationCount = 0,
  onNotificationClick,
  userInitials = '',
  onAvatarClick,
  onSearch,
  searchPlaceholder = 'Search...',
  onMenuToggle,
  headerActions,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [searchValue, setSearchValue] = useState('')

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchValue(value)
      onSearch?.(value)
    },
    [onSearch],
  )

  return (
    <header className="aurora-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Mobile menu button */}
        <button
          type="button"
          className="aurora-mobile-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <MenuIcon />
        </button>

        <div className="aurora-header__left">
          <div className="aurora-header__greeting">{greeting}</div>
          {subtitle && <div className="aurora-header__subtext">{subtitle}</div>}
        </div>
      </div>

      <div className="aurora-header__right">
        {/* Custom action buttons */}
        {headerActions}

        {/* Search */}
        <div className="aurora-search" role="search">
          <span className="aurora-search__icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="aurora-search__input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
            aria-label="Search"
          />
        </div>

        {/* Theme toggle (dark → light → green → dark) */}
        <button
          type="button"
          className="aurora-header-btn"
          onClick={toggleTheme}
          aria-label={
            theme === 'dark' ? 'Switch to light mode'
              : theme === 'light' ? 'Switch to money green mode'
              : 'Switch to dark mode'
          }
          title={
            theme === 'dark' ? 'Switch to light mode'
              : theme === 'light' ? 'Switch to money green mode'
              : 'Switch to dark mode'
          }
        >
          {theme === 'dark' ? <SunIcon /> : theme === 'light' ? <DollarIcon /> : <MoonIcon />}
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="aurora-header-btn"
          onClick={onNotificationClick}
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
        >
          <BellIcon />
          {notificationCount > 0 && (
            <span className="aurora-header-btn__badge">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        {userInitials && (
          <div
            className="aurora-header__avatar"
            onClick={onAvatarClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onAvatarClick?.()
              }
            }}
            role={onAvatarClick ? 'button' : undefined}
            tabIndex={onAvatarClick ? 0 : undefined}
            aria-label="User menu"
          >
            {userInitials}
          </div>
        )}
      </div>
    </header>
  )
}
