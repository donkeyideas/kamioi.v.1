import { useState, useCallback, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout, type NavItem, type NavSection } from '@/components/layout'
import { BankSyncButton } from '@/components/common/BankSyncButton'

const BusinessOverviewTab = lazy(() => import('@/components/business/BusinessOverviewTab').then(m => ({ default: m.BusinessOverviewTab })))
const BusinessPortfolioTab = lazy(() => import('@/components/business/BusinessPortfolioTab').then(m => ({ default: m.BusinessPortfolioTab })))
const BusinessTransactionsTab = lazy(() => import('@/components/business/BusinessTransactionsTab').then(m => ({ default: m.BusinessTransactionsTab })))
const BusinessTeamTab = lazy(() => import('@/components/business/BusinessTeamTab').then(m => ({ default: m.BusinessTeamTab })))
const BusinessGoalsTab = lazy(() => import('@/components/business/BusinessGoalsTab').then(m => ({ default: m.BusinessGoalsTab })))
const BusinessAiInsightsTab = lazy(() => import('@/components/business/BusinessAiInsightsTab').then(m => ({ default: m.BusinessAiInsightsTab })))
const BusinessAnalyticsTab = lazy(() => import('@/components/business/BusinessAnalyticsTab').then(m => ({ default: m.BusinessAnalyticsTab })))
const BusinessReportsTab = lazy(() => import('@/components/business/BusinessReportsTab').then(m => ({ default: m.BusinessReportsTab })))
const BusinessSettingsTab = lazy(() => import('@/components/business/BusinessSettingsTab').then(m => ({ default: m.BusinessSettingsTab })))
const BusinessNotificationsTab = lazy(() => import('@/components/business/BusinessNotificationsTab').then(m => ({ default: m.BusinessNotificationsTab })))

function TabLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: 'var(--text-muted)' }}>
      Loading...
    </div>
  )
}

const businessNavSections: NavSection[] = [
  {
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        id: 'portfolio',
        label: 'Portfolio',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        ),
      },
      {
        id: 'transactions',
        label: 'Transactions',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      },
      {
        id: 'team',
        label: 'Team',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        id: 'goals',
        label: 'Goals',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        ),
      },
      {
        id: 'ai-insights',
        label: 'AI Insights',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
            <line x1="10" y1="22" x2="14" y2="22" />
          </svg>
        ),
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
]

const subtitleMap: Record<string, string> = {
  overview: 'Your business overview and activity',
  portfolio: 'Company investment holdings and performance',
  transactions: 'Team transactions and round-ups',
  team: 'Manage your team members',
  goals: 'Track company investment goals',
  'ai-insights': 'AI-powered business insights',
  analytics: 'Spending and investment analytics',
  reports: 'Generate and view reports',
  notifications: 'Business notifications and alerts',
  settings: 'Manage business settings',
}

function renderContent(activeTab: string) {
  switch (activeTab) {
    case 'overview':
      return <BusinessOverviewTab />
    case 'portfolio':
      return <BusinessPortfolioTab />
    case 'transactions':
      return <BusinessTransactionsTab />
    case 'team':
      return <BusinessTeamTab />
    case 'goals':
      return <BusinessGoalsTab />
    case 'ai-insights':
      return <BusinessAiInsightsTab />
    case 'analytics':
      return <BusinessAnalyticsTab />
    case 'reports':
      return <BusinessReportsTab />
    case 'notifications':
      return <BusinessNotificationsTab />
    case 'settings':
      return <BusinessSettingsTab />
    default:
      return <BusinessOverviewTab />
  }
}

export default function BusinessDashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const handleNavigate = useCallback((item: NavItem) => {
    setActiveTab(item.id)
  }, [])

  const userName = profile?.name || 'User'
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <DashboardLayout
      navSections={businessNavSections}
      activeNavId={activeTab}
      onNavigate={handleNavigate}
      sidebarUser={{ name: userName, role: 'Business Admin', initials }}
      greeting={`Welcome back, ${userName}`}
      userInitials={initials}
      headerActions={<BankSyncButton onSyncComplete={() => setActiveTab('transactions')} />}
    >
      <h1 className="aurora-page-title">
        {activeTab === 'overview' ? 'Dashboard Overview' : businessNavSections[0].items.find(i => i.id === activeTab)?.label || 'Dashboard'}
      </h1>
      <p className="aurora-page-subtitle">
        {subtitleMap[activeTab] || 'Your business overview and activity'}
      </p>

      <Suspense fallback={<TabLoading />}>
        {renderContent(activeTab)}
      </Suspense>
    </DashboardLayout>
  )
}
