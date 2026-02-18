import { useState, useCallback, type ReactNode } from 'react'
import { AuroraBackground } from './AuroraBackground'
import { Sidebar, type NavSection, type NavItem, type SidebarUserProfile } from './Sidebar'
import { Header } from './Header'

/* -----------------------------------------------
   Type definitions
   ----------------------------------------------- */

type ViewMode = 'user' | 'admin'

export interface DashboardLayoutProps {
  /** The main page content rendered in the scrollable area */
  children: ReactNode

  /* --- Sidebar props --- */
  /** Navigation sections for the sidebar */
  navSections: NavSection[]
  /** Currently active nav item id */
  activeNavId: string
  /** Callback when a nav item is clicked */
  onNavigate: (item: NavItem) => void
  /** User profile for the sidebar footer */
  sidebarUser?: SidebarUserProfile
  /** Callback when sidebar user profile is clicked */
  onSidebarUserClick?: () => void
  /** Logo text (defaults to "Kamioi") */
  logoText?: string
  /** Logo icon content */
  logoIcon?: ReactNode
  /** Whether to show user/admin view toggle */
  showViewToggle?: boolean
  /** Current view mode */
  viewMode?: ViewMode
  /** Callback when view toggle changes */
  onViewModeChange?: (mode: ViewMode) => void

  /* --- Header props --- */
  /** Main greeting displayed in header */
  greeting: string
  /** Subtext below greeting */
  headerSubtitle?: string
  /** Notification count for the bell icon */
  notificationCount?: number
  /** Callback when notification bell is clicked */
  onNotificationClick?: () => void
  /** User initials for the header avatar */
  userInitials?: string
  /** Callback when header avatar is clicked */
  onAvatarClick?: () => void
  /** Callback when search input changes */
  onSearch?: (query: string) => void
  /** Placeholder for the search input */
  searchPlaceholder?: string
}

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export function DashboardLayout({
  children,
  navSections,
  activeNavId,
  onNavigate,
  sidebarUser,
  onSidebarUserClick,
  logoText,
  logoIcon,
  showViewToggle,
  viewMode,
  onViewModeChange,
  greeting,
  headerSubtitle,
  notificationCount,
  onNotificationClick,
  userInitials,
  onAvatarClick,
  onSearch,
  searchPlaceholder,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="aurora-layout">
      {/* Animated background blobs */}
      <AuroraBackground />

      {/* Sidebar */}
      <Sidebar
        sections={navSections}
        activeId={activeNavId}
        onNavigate={onNavigate}
        user={sidebarUser}
        onUserClick={onSidebarUserClick}
        logoText={logoText}
        logoIcon={logoIcon}
        showViewToggle={showViewToggle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Content area (right of sidebar) */}
      <div className="aurora-layout__content">
        {/* Sticky header */}
        <Header
          greeting={greeting}
          subtitle={headerSubtitle}
          notificationCount={notificationCount}
          onNotificationClick={onNotificationClick}
          userInitials={userInitials}
          onAvatarClick={onAvatarClick}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
          onMenuToggle={openSidebar}
        />

        {/* Main scrollable content */}
        <main className="aurora-layout__main">
          {children}
        </main>
      </div>
    </div>
  )
}
