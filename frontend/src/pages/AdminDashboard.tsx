import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAdminPermissions, type PermissionKey } from '@/hooks/useAdminPermissions'
import { DashboardLayout, type NavItem, type NavSection } from '@/components/layout'
import { supabaseAdmin } from '@/lib/supabase'

const PlatformOverviewTab = lazy(() => import('@/components/admin/PlatformOverviewTab').then(m => ({ default: m.PlatformOverviewTab })))
const TransactionsAdminTab = lazy(() => import('@/components/admin/TransactionsAdminTab').then(m => ({ default: m.TransactionsAdminTab })))
const SubscriptionsTab = lazy(() => import('@/components/admin/SubscriptionsTab').then(m => ({ default: m.SubscriptionsTab })))
const InvestmentsTab = lazy(() => import('@/components/admin/InvestmentsTab').then(m => ({ default: m.InvestmentsTab })))
const AiCenterTab = lazy(() => import('@/components/admin/AiCenterTab').then(m => ({ default: m.AiCenterTab })))
const DatabaseManagementTab = lazy(() => import('@/components/admin/DatabaseManagementTab').then(m => ({ default: m.DatabaseManagementTab })))
const UserManagementTab = lazy(() => import('@/components/admin/UserManagementTab').then(m => ({ default: m.UserManagementTab })))
const FinancialAnalyticsTab = lazy(() => import('@/components/admin/FinancialAnalyticsTab').then(m => ({ default: m.FinancialAnalyticsTab })))
const NotificationsAdminTab = lazy(() => import('@/components/admin/NotificationsAdminTab').then(m => ({ default: m.NotificationsAdminTab })))
const ContentMarketingTab = lazy(() => import('@/components/admin/ContentMarketingTab').then(m => ({ default: m.ContentMarketingTab })))
const SeoGeoTab = lazy(() => import('@/components/admin/SeoGeoTab').then(m => ({ default: m.SeoGeoTab })))
const SystemOperationsTab = lazy(() => import('@/components/admin/SystemOperationsTab').then(m => ({ default: m.SystemOperationsTab })))
const MonitoringTab = lazy(() => import('@/components/admin/MonitoringTab').then(m => ({ default: m.MonitoringTab })))
const BadgesGamificationTab = lazy(() => import('@/components/admin/BadgesGamificationTab').then(m => ({ default: m.BadgesGamificationTab })))
const EmployeeManagementTab = lazy(() => import('@/components/admin/EmployeeManagementTab').then(m => ({ default: m.EmployeeManagementTab })))
const SocialPostsTab = lazy(() => import('@/components/admin/SocialPostsTab').then(m => ({ default: m.SocialPostsTab })))

function TabLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: 'var(--text-muted)' }}>
      Loading...
    </div>
  )
}

const adminNavSections: NavSection[] = [
  {
    items: [
      { id: 'overview', label: 'Platform Overview', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { id: 'transactions', label: 'Transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
      { id: 'subscriptions', label: 'Subscriptions & Demos', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
      { id: 'investments', label: 'Investments', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
      { id: 'ai-center', label: 'AI Center', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="10" y1="22" x2="14" y2="22"/></svg> },
      { id: 'database', label: 'Database Management', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
      { id: 'users', label: 'User Management', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { id: 'financial', label: 'Financial Analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
      { id: 'notifications', label: 'Notifications & Messaging', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
      { id: 'content', label: 'Content & Marketing', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
      { id: 'seo', label: 'SEO & Growth Analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
      { id: 'system', label: 'System & Operations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
      { id: 'monitoring', label: 'Monitoring', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      { id: 'badges', label: 'Badges & Gamification', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg> },
      { id: 'employees', label: 'Employee Management', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
      { id: 'social', label: 'Social Posts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg> },
    ],
  },
]

const subtitleMap: Record<string, string> = {
  overview: 'Platform metrics and system health at a glance',
  transactions: 'View and manage all platform transactions',
  subscriptions: 'Manage subscriptions and demo requests',
  investments: 'Investment summary and processing queue',
  'ai-center': 'LLM mappings, ML dashboard, and data management',
  database: 'Database tables, backups, and maintenance',
  users: 'Manage user accounts and permissions',
  financial: 'Revenue, fees, and financial reporting',
  notifications: 'Platform notifications and messaging',
  content: 'Blog, advertisements, and badge management',
  seo: 'SEO, GEO, AEO, CRO and conversion analytics',
  system: 'System settings, employees, and SOPs',
  monitoring: 'Loading reports, API tracking, and error logs',
  badges: 'Badge definitions, award queue, and gamification rules',
  employees: 'Employee directory, roles, and permissions',
  social: 'AI-powered social media post generation and scheduling',
}

// Map tab IDs to the permission keys that grant access.
// Tabs not listed here are always visible.
const TAB_PERMISSIONS: Record<string, PermissionKey[]> = {
  users: ['can_view_users', 'can_edit_users'],
  transactions: ['can_view_transactions', 'can_edit_transactions'],
  'ai-center': ['can_access_llm'],
  system: ['can_manage_system'],
  database: ['can_manage_system'],
  monitoring: ['can_manage_system'],
  employees: ['can_manage_system'],
  overview: ['can_view_analytics'],
  financial: ['can_view_analytics'],
  seo: ['can_view_analytics'],
  content: ['can_manage_advertisements'],
  social: ['can_manage_advertisements'],
}

function renderContent(activeTab: string) {
  switch (activeTab) {
    case 'overview':
      return <PlatformOverviewTab />
    case 'transactions':
      return <TransactionsAdminTab />
    case 'subscriptions':
      return <SubscriptionsTab />
    case 'investments':
      return <InvestmentsTab />
    case 'ai-center':
      return <AiCenterTab />
    case 'database':
      return <DatabaseManagementTab />
    case 'users':
      return <UserManagementTab />
    case 'financial':
      return <FinancialAnalyticsTab />
    case 'notifications':
      return <NotificationsAdminTab />
    case 'content':
      return <ContentMarketingTab />
    case 'seo':
      return <SeoGeoTab />
    case 'system':
      return <SystemOperationsTab />
    case 'monitoring':
      return <MonitoringTab />
    case 'badges':
      return <BadgesGamificationTab />
    case 'employees':
      return <EmployeeManagementTab />
    case 'social':
      return <SocialPostsTab />
    default:
      return <PlatformOverviewTab />
  }
}

/* ---- Delete Data Button ---- */

// Data categories with their tables (child-first for FK constraints).
// Does NOT delete: users, subscription_plans, admin_settings, api_balance (config/identity data).
const DATA_CATEGORIES = [
  {
    key: 'transactions',
    label: 'Transactions & Round-Ups',
    description: 'Transactions, round-up ledger, market queue',
    tables: ['roundup_ledger', 'market_queue', 'receipt_allocations', 'transactions'],
  },
  {
    key: 'receipts',
    label: 'Receipts',
    description: 'Receipt uploads and allocations',
    tables: ['receipt_allocations', 'receipts'],
  },
  {
    key: 'portfolios',
    label: 'Portfolios & Goals',
    description: 'Holdings, goals, statements',
    tables: ['portfolios', 'goals', 'statements'],
  },
  {
    key: 'ai',
    label: 'AI Data',
    description: 'LLM mappings, AI responses, API usage',
    tables: ['llm_mappings', 'ai_responses', 'api_usage'],
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions & Promos',
    description: 'Subscriptions, promo codes, renewals',
    tables: ['promo_code_usage', 'renewal_queue', 'renewal_history', 'subscription_analytics', 'subscription_changes', 'user_subscriptions', 'promo_codes'],
  },
  {
    key: 'notifications',
    label: 'Notifications & Messages',
    description: 'Notifications, contact messages',
    tables: ['notifications', 'contact_messages'],
  },
  {
    key: 'demo',
    label: 'Demo Access Logs',
    description: 'Demo access tracking logs',
    tables: ['demo_access_log'],
  },
  {
    key: 'social',
    label: 'Social Media Posts',
    description: 'All social media post data',
    tables: ['social_media_posts'],
  },
  {
    key: 'members',
    label: 'Families & Businesses',
    description: 'Family/business members and groups',
    tables: ['family_members', 'business_members', 'families', 'businesses'],
  },
  {
    key: 'settings',
    label: 'User Settings',
    description: 'Per-user preferences',
    tables: ['user_settings'],
  },
  {
    key: 'system',
    label: 'System Events & Ads',
    description: 'System event logs, advertisements',
    tables: ['system_events', 'advertisements'],
  },
  {
    key: 'blogs',
    label: 'Blog Posts',
    description: 'All blog content',
    tables: ['blog_posts'],
  },
] as const

function DeleteAllButton() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function handleOpen() {
    // Pre-select everything except blogs
    setSelected(new Set(DATA_CATEGORIES.filter(c => c.key !== 'blogs').map(c => c.key)))
    setOpen(true)
  }

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(DATA_CATEGORIES.map(c => c.key)))
  }

  function selectNone() {
    setSelected(new Set())
  }

  async function handleDelete() {
    setDeleting(true)
    setResult(null)

    // Collect unique tables from selected categories (preserve order)
    const seen = new Set<string>()
    const tables: string[] = []
    for (const cat of DATA_CATEGORIES) {
      if (!selected.has(cat.key)) continue
      for (const t of cat.tables) {
        if (!seen.has(t)) { seen.add(t); tables.push(t) }
      }
    }

    let deleted = 0
    let failed = 0
    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin.from(table).delete().gte('id', 0)
        if (!error) deleted++
        else failed++
      } catch {
        failed++
      }
    }

    setDeleting(false)
    setOpen(false)
    setResult(`Cleared ${deleted}/${tables.length} tables${failed ? ` (${failed} skipped)` : ''}`)
    setTimeout(() => setResult(null), 5000)
  }

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.1)',
            color: '#EF4444',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete Data
        </button>
        {result && (
          <span style={{ fontSize: '12px', color: '#34D399', fontWeight: 600 }}>{result}</span>
        )}
      </div>

      {/* Delete Options Modal */}
      {open && createPortal(
        <div
          onClick={() => !deleting && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface-card, #1a1a2e)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-divider)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#EF4444' }}>Delete Data</h3>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Select which data categories to delete. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Select All
                </button>
                <button onClick={selectNone} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Select None
                </button>
              </div>
            </div>

            {/* Checkbox List */}
            <div style={{ padding: '8px 24px', overflowY: 'auto', flex: 1 }}>
              {DATA_CATEGORIES.map(cat => (
                <label
                  key={cat.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-divider)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(cat.key)}
                    onChange={() => toggle(cat.key)}
                    style={{ width: '18px', height: '18px', accentColor: '#EF4444', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{cat.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selected.size} of {DATA_CATEGORIES.length} selected
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setOpen(false)}
                  disabled={deleting}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', background: 'var(--surface-input)',
                    color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || selected.size === 0}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    border: 'none', background: selected.size === 0 ? '#666' : '#EF4444',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'inherit', cursor: deleting || selected.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const { can, isSuperAdmin: isSuperAdminUser } = useAdminPermissions()
  const [activeTab, setActiveTab] = useState('overview')

  const handleNavigate = useCallback((item: NavItem) => {
    setActiveTab(item.id)
  }, [])

  const userName = profile?.name || 'Admin'
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Filter nav sections based on permissions (super admin sees everything)
  const filteredNavSections: NavSection[] = useMemo(() => {
    if (isSuperAdminUser) return adminNavSections

    return adminNavSections.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const requiredPerms = TAB_PERMISSIONS[item.id]
        if (!requiredPerms) return true // no permission mapping → always visible
        return requiredPerms.some((p) => can(p)) // show if ANY required perm is granted
      }),
    }))
  }, [can, isSuperAdminUser])

  // Permission guard for content rendering
  function canAccessTab(tabId: string): boolean {
    if (isSuperAdminUser) return true
    const requiredPerms = TAB_PERMISSIONS[tabId]
    if (!requiredPerms) return true
    return requiredPerms.some((p) => can(p))
  }

  return (
    <DashboardLayout
      navSections={filteredNavSections}
      activeNavId={activeTab}
      onNavigate={handleNavigate}
      sidebarUser={{ name: userName, role: isSuperAdminUser ? 'Super Administrator' : 'Administrator', initials }}
      greeting={`Welcome back, ${userName}`}
      userInitials={initials}
      headerActions={<DeleteAllButton />}
    >
      <h1 className="aurora-page-title">
        {activeTab === 'overview' ? 'Platform Overview' : adminNavSections[0].items.find(i => i.id === activeTab)?.label || 'Admin Dashboard'}
      </h1>
      <p className="aurora-page-subtitle">
        {subtitleMap[activeTab] || 'Platform management and monitoring'}
      </p>

      <Suspense fallback={<TabLoading />}>
        {canAccessTab(activeTab) ? (
          renderContent(activeTab)
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              You do not have permission to access this section.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Contact your Super Admin to request access.
            </p>
          </div>
        )}
      </Suspense>
    </DashboardLayout>
  )
}
