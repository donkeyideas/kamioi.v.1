import { useState, useCallback, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout, type NavItem, type NavSection } from '@/components/layout'
import { BankSyncButton } from '@/components/common/BankSyncButton'

const OverviewTab = lazy(() => import('@/components/user/OverviewTab').then(m => ({ default: m.OverviewTab })))
const PortfolioTab = lazy(() => import('@/components/user/PortfolioTab').then(m => ({ default: m.PortfolioTab })))
const TransactionsTab = lazy(() => import('@/components/user/TransactionsTab').then(m => ({ default: m.TransactionsTab })))
const GoalsTab = lazy(() => import('@/components/user/GoalsTab').then(m => ({ default: m.GoalsTab })))
const AiInsightsTab = lazy(() => import('@/components/user/AiInsightsTab').then(m => ({ default: m.AiInsightsTab })))
const AnalyticsTab = lazy(() => import('@/components/user/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })))
const NotificationsTab = lazy(() => import('@/components/user/NotificationsTab').then(m => ({ default: m.NotificationsTab })))
const SettingsTab = lazy(() => import('@/components/user/SettingsTab').then(m => ({ default: m.SettingsTab })))

function TabLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: 'var(--text-muted)' }}>
      Loading...
    </div>
  )
}

/* ---- Navigation config ---- */

const userNavSections: NavSection[] = [
  {
    items: [
      { id: 'overview', label: 'Overview', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { id: 'portfolio', label: 'Portfolio', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      { id: 'transactions', label: 'Transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
      { id: 'goals', label: 'Goals', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
      { id: 'ai-insights', label: 'AI Insights', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="10" y1="22" x2="14" y2="22"/></svg> },
      { id: 'analytics', label: 'Analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
      { id: 'notifications', label: 'Notifications', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
      { id: 'settings', label: 'Settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    ],
  },
]

const subtitleMap: Record<string, string> = {
  overview: 'Your investment overview and activity',
  portfolio: 'Your holdings and portfolio performance',
  transactions: 'View and manage your transactions',
  goals: 'Track your savings goals',
  'ai-insights': 'AI-powered insights and recommendations',
  analytics: 'Spending and investment analytics',
  notifications: 'Your notifications and alerts',
  settings: 'Manage your account settings',
}

function renderContent(activeTab: string) {
  switch (activeTab) {
    case 'overview':
      return <OverviewTab />
    case 'portfolio':
      return <PortfolioTab />
    case 'transactions':
      return <TransactionsTab />
    case 'goals':
      return <GoalsTab />
    case 'ai-insights':
      return <AiInsightsTab />
    case 'analytics':
      return <AnalyticsTab />
    case 'notifications':
      return <NotificationsTab />
    case 'settings':
      return <SettingsTab />
    default:
      return <OverviewTab />
  }
}

export default function UserDashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const handleNavigate = useCallback((item: NavItem) => {
    setActiveTab(item.id)
  }, [])

  const userName = profile?.name || 'User'
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <DashboardLayout
      navSections={userNavSections}
      activeNavId={activeTab}
      onNavigate={handleNavigate}
      sidebarUser={{ name: userName, role: 'Investor', initials }}
      greeting={`Welcome back, ${userName}`}
      userInitials={initials}
      headerActions={<BankSyncButton onSyncComplete={() => setActiveTab('transactions')} />}
    >
      <h1 className="aurora-page-title">
        {activeTab === 'overview' ? 'Dashboard Overview' : userNavSections[0].items.find(i => i.id === activeTab)?.label || 'Dashboard'}
      </h1>
      <p className="aurora-page-subtitle">
        {subtitleMap[activeTab] || 'Your investment overview and activity'}
      </p>

      <Suspense fallback={<TabLoading />}>
        {renderContent(activeTab)}
      </Suspense>
    </DashboardLayout>
  )
}
