import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout'
import { Header } from '@/components/layout'
import { KpiCard, Badge, Table, Tabs } from '@/components/ui'
import { BarChart, LineChart } from '@/components/charts'

const sidebarItems = [
  { key: 'overview', label: 'Platform Overview' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'subscriptions', label: 'Subscriptions & Demos' },
  { key: 'investments', label: 'Investments' },
  { key: 'ai-center', label: 'AI Center' },
  { key: 'database', label: 'Database Management' },
  { key: 'users', label: 'User Management' },
  { key: 'financial', label: 'Financial Analytics' },
  { key: 'notifications', label: 'Notifications & Messaging' },
  { key: 'content', label: 'Content & Marketing' },
  { key: 'seo', label: 'SEO & GEO' },
  { key: 'system', label: 'System & Operations' },
  { key: 'monitoring', label: 'Monitoring' },
]

const sampleUserGrowth = [
  { name: 'Aug', users: 120 },
  { name: 'Sep', users: 185 },
  { name: 'Oct', users: 240 },
  { name: 'Nov', users: 310 },
  { name: 'Dec', users: 395 },
  { name: 'Jan', users: 480 },
  { name: 'Feb', users: 560 },
]

const sampleRevenue = [
  { name: 'Aug', revenue: 2400 },
  { name: 'Sep', revenue: 3200 },
  { name: 'Oct', revenue: 4100 },
  { name: 'Nov', revenue: 3800 },
  { name: 'Dec', revenue: 5200 },
  { name: 'Jan', revenue: 6100 },
  { name: 'Feb', revenue: 7400 },
]

const sampleRecentUsers = [
  { id: 1, name: 'Sarah Chen', email: 'sarah@example.com', type: 'individual', status: 'active', joined: '2026-02-18' },
  { id: 2, name: 'Marcus Johnson', email: 'marcus@example.com', type: 'family', status: 'active', joined: '2026-02-17' },
  { id: 3, name: 'Priya Patel', email: 'priya@example.com', type: 'business', status: 'pending', joined: '2026-02-17' },
  { id: 4, name: 'James Wilson', email: 'james@example.com', type: 'individual', status: 'active', joined: '2026-02-16' },
  { id: 5, name: 'Emma Davis', email: 'emma@example.com', type: 'individual', status: 'inactive', joined: '2026-02-15' },
]

const userColumns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  {
    key: 'type',
    header: 'Type',
    render: (row: Record<string, unknown>) => (
      <Badge variant="purple">{String(row.type)}</Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row: Record<string, unknown>) => {
      const status = String(row.status)
      const variant = status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'default'
      return <Badge variant={variant}>{status}</Badge>
    },
  },
  { key: 'joined', header: 'Joined', sortable: true },
]

const samplePendingMappings = [
  { id: 1, merchant: 'SBUX*STORE 12345', suggested_ticker: 'SBUX', confidence: '97%', status: 'pending' },
  { id: 2, merchant: 'AMZN MKTP US', suggested_ticker: 'AMZN', confidence: '99%', status: 'pending' },
  { id: 3, merchant: 'UBER TRIP', suggested_ticker: 'UBER', confidence: '95%', status: 'pending' },
  { id: 4, merchant: 'WM SUPERCENTER', suggested_ticker: 'WMT', confidence: '88%', status: 'pending' },
]

const mappingColumns = [
  { key: 'merchant', header: 'Merchant', sortable: true },
  { key: 'suggested_ticker', header: 'Suggested Ticker', sortable: true },
  { key: 'confidence', header: 'Confidence', sortable: true },
  {
    key: 'status',
    header: 'Status',
    render: () => <Badge variant="warning">Pending</Badge>,
  },
]

function OverviewContent() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Users" value="560" change="+80 this month" changeType="positive" />
        <KpiCard label="Revenue This Month" value="$7,400" change="+21.3% vs last month" changeType="positive" />
        <KpiCard label="Pending Mappings" value="4" change="Needs review" changeType="neutral" />
        <KpiCard label="System Health" value="99.9%" change="All systems operational" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <BarChart data={sampleUserGrowth} dataKey="users" title="User Growth" color="#7C3AED" height={260} />
        <LineChart data={sampleRevenue} dataKey="revenue" title="Monthly Revenue" color="#3B82F6" height={260} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
        <Table columns={userColumns} data={sampleRecentUsers} pageSize={5} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Pending LLM Mappings</h2>
        <Table columns={mappingColumns} data={samplePendingMappings} pageSize={5} />
      </div>
    </>
  )
}

function SubscriptionsContent() {
  return (
    <Tabs
      tabs={[
        { key: 'subscriptions', label: 'Subscriptions', content: <p className="text-text-muted text-sm">Subscription management — coming in Phase 7</p> },
        { key: 'demos', label: 'Demo Requests', content: <p className="text-text-muted text-sm">Demo requests — coming in Phase 7</p> },
      ]}
    />
  )
}

function InvestmentsContent() {
  return (
    <Tabs
      tabs={[
        { key: 'summary', label: 'Investment Summary', content: <p className="text-text-muted text-sm">Investment summary — coming in Phase 7</p> },
        { key: 'processing', label: 'Investment Processing', content: <p className="text-text-muted text-sm">Investment processing — coming in Phase 7</p> },
      ]}
    />
  )
}

function AiCenterContent() {
  return (
    <Tabs
      tabs={[
        { key: 'llm', label: 'LLM Center', content: <p className="text-text-muted text-sm">LLM Center — coming in Phase 7</p> },
        { key: 'ml', label: 'ML Dashboard', content: <p className="text-text-muted text-sm">ML Dashboard — coming in Phase 7</p> },
        { key: 'data', label: 'LLM Data Management', content: <p className="text-text-muted text-sm">LLM Data Management — coming in Phase 7</p> },
      ]}
    />
  )
}

function ContentMarketingContent() {
  return (
    <Tabs
      tabs={[
        { key: 'content', label: 'Content Management', content: <p className="text-text-muted text-sm">Content management — coming in Phase 7</p> },
        { key: 'ads', label: 'Advertisement', content: <p className="text-text-muted text-sm">Advertisements — coming in Phase 7</p> },
        { key: 'badges', label: 'Badges', content: <p className="text-text-muted text-sm">Badges — coming in Phase 7</p> },
      ]}
    />
  )
}

function SystemOpsContent() {
  return (
    <Tabs
      tabs={[
        { key: 'settings', label: 'System Settings', content: <p className="text-text-muted text-sm">System settings — coming in Phase 7</p> },
        { key: 'employees', label: 'Employee Management', content: <p className="text-text-muted text-sm">Employee management — coming in Phase 7</p> },
        { key: 'sops', label: 'SOPs', content: <p className="text-text-muted text-sm">Standard operating procedures — coming in Phase 7</p> },
      ]}
    />
  )
}

function MonitoringContent() {
  return (
    <Tabs
      tabs={[
        { key: 'loading', label: 'Loading Report', content: <p className="text-text-muted text-sm">Loading report — coming in Phase 7</p> },
        { key: 'api', label: 'API Tracking', content: <p className="text-text-muted text-sm">API tracking — coming in Phase 7</p> },
        { key: 'errors', label: 'Error Tracking', content: <p className="text-text-muted text-sm">Error tracking — coming in Phase 7</p> },
      ]}
    />
  )
}

function PlaceholderContent({ name }: { name: string }) {
  return <p className="text-text-muted text-sm">{name} — coming in Phase 7</p>
}

const contentMap: Record<string, React.ReactNode> = {
  overview: <OverviewContent />,
  transactions: <PlaceholderContent name="Transactions" />,
  subscriptions: <SubscriptionsContent />,
  investments: <InvestmentsContent />,
  'ai-center': <AiCenterContent />,
  database: <PlaceholderContent name="Database Management" />,
  users: <PlaceholderContent name="User Management" />,
  financial: <PlaceholderContent name="Financial Analytics" />,
  notifications: <PlaceholderContent name="Notifications & Messaging" />,
  content: <ContentMarketingContent />,
  seo: <PlaceholderContent name="SEO & GEO" />,
  system: <SystemOpsContent />,
  monitoring: <MonitoringContent />,
}

const titleMap: Record<string, string> = {
  overview: 'Platform Overview',
  transactions: 'Transactions',
  subscriptions: 'Subscriptions & Demos',
  investments: 'Investments',
  'ai-center': 'AI Center',
  database: 'Database Management',
  users: 'User Management',
  financial: 'Financial Analytics',
  notifications: 'Notifications & Messaging',
  content: 'Content & Marketing',
  seo: 'SEO & GEO',
  system: 'System & Operations',
  monitoring: 'Monitoring',
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activeKey={activeTab}
      onSelect={setActiveTab}
      sidebarSubtitle="Admin"
      onSignOut={signOut}
    >
      <Header
        title={titleMap[activeTab] || 'Admin Dashboard'}
        subtitle="Platform management and monitoring"
      />
      {contentMap[activeTab]}
    </DashboardLayout>
  )
}
