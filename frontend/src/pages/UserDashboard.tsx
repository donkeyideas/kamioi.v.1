import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout'
import { Header } from '@/components/layout'
import { KpiCard } from '@/components/ui'
import { AreaChart } from '@/components/charts'
import { Table } from '@/components/ui'
import { Badge } from '@/components/ui'

const sidebarItems = [
  { key: 'overview', label: 'Overview' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'goals', label: 'Goals' },
  { key: 'ai-insights', label: 'AI Insights' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'settings', label: 'Settings' },
]

const samplePortfolioData = [
  { name: 'Jan', value: 1200 },
  { name: 'Feb', value: 1350 },
  { name: 'Mar', value: 1280 },
  { name: 'Apr', value: 1520 },
  { name: 'May', value: 1680 },
  { name: 'Jun', value: 1750 },
  { name: 'Jul', value: 1920 },
]

const sampleTransactions = [
  { id: 1, merchant: 'Starbucks', amount: '$4.75', roundup: '$0.25', status: 'completed', date: '2026-02-18' },
  { id: 2, merchant: 'Amazon', amount: '$23.47', roundup: '$0.53', status: 'completed', date: '2026-02-17' },
  { id: 3, merchant: 'Uber', amount: '$12.30', roundup: '$0.70', status: 'processing', date: '2026-02-17' },
  { id: 4, merchant: 'Target', amount: '$45.12', roundup: '$0.88', status: 'completed', date: '2026-02-16' },
  { id: 5, merchant: 'Netflix', amount: '$15.99', roundup: '$0.01', status: 'completed', date: '2026-02-15' },
]

const transactionColumns = [
  { key: 'merchant', header: 'Merchant', sortable: true },
  { key: 'amount', header: 'Amount', sortable: true },
  { key: 'roundup', header: 'Round-Up', sortable: true },
  {
    key: 'status',
    header: 'Status',
    render: (row: Record<string, unknown>) => (
      <Badge variant={row.status === 'completed' ? 'success' : 'warning'}>
        {String(row.status)}
      </Badge>
    ),
  },
  { key: 'date', header: 'Date', sortable: true },
]

export default function UserDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activeKey={activeTab}
      onSelect={setActiveTab}
      onSignOut={signOut}
    >
      <Header
        title={`Welcome back, ${profile?.name || 'User'}`}
        subtitle="Here's your investment overview"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Portfolio Value"
          value="$1,920.00"
          change="+12.4% this month"
          changeType="positive"
        />
        <KpiCard
          label="Round-Ups This Month"
          value="$24.37"
          change="+$8.50 vs last month"
          changeType="positive"
        />
        <KpiCard
          label="Active Goals"
          value="3"
          change="2 on track"
          changeType="neutral"
        />
        <KpiCard
          label="AI Confidence"
          value="94%"
          change="+2% improvement"
          changeType="positive"
        />
      </div>

      {/* Chart */}
      <div className="mb-8">
        <AreaChart
          data={samplePortfolioData}
          dataKey="value"
          title="Portfolio Growth"
          color="#7C3AED"
          height={280}
        />
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <Table
          columns={transactionColumns}
          data={sampleTransactions}
          pageSize={5}
        />
      </div>
    </DashboardLayout>
  )
}
