import { type ReactNode } from 'react'
import { Sidebar, type SidebarItem } from './Sidebar'

interface DashboardLayoutProps {
  sidebarItems: SidebarItem[]
  activeKey: string
  onSelect: (key: string) => void
  sidebarTitle?: string
  sidebarSubtitle?: string
  onSignOut?: () => void
  children: ReactNode
}

export function DashboardLayout({
  sidebarItems,
  activeKey,
  onSelect,
  sidebarTitle,
  sidebarSubtitle,
  onSignOut,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={sidebarItems}
        activeKey={activeKey}
        onSelect={onSelect}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        onSignOut={onSignOut}
      />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
