import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { KpiCard, GlassCard, ActivityFeed, QuickActions } from '@/components/ui'
import type { ActivityItem, QuickAction } from '@/components/ui'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Business {
  id: number
  name: string
  industry: string | null
  created_by: number
  logo_url: string | null
  created_at: string
}

interface BusinessMember {
  id: number
  business_id: number
  user_id: number
  role: string
  department: string | null
  status: string
  joined_at: string
}

interface Transaction {
  id: number
  user_id: number
  merchant: string | null
  amount: number
  round_up: number
  category: string | null
  status: string
  created_at: string
}

interface Holding {
  id: number
  user_id: number
  ticker: string
  shares: number
  avg_price: number
  current_price: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function PortfolioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function RoundUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function GrowthIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
}

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: '20px',
  marginTop: '20px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '16px',
}

/* ------------------------------------------------------------------ */
/*  Loading spinner                                                    */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'biz-overview-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-overview-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessOverviewTab() {
  const { profile } = useAuth()

  const [business, setBusiness] = useState<Business | null>(null)
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)

  /* ---- Fetch data ---- */

  const fetchData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)

    try {
      // Get business for current user
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('created_by', profile.id)
        .limit(1)
        .single()

      if (!bizData) { setLoading(false); return }
      setBusiness(bizData as Business)

      const businessId = bizData.id

      // Fetch members, then transactions and holdings for all members
      const { data: memberData } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', businessId)

      const memberList = (memberData as BusinessMember[] | null) ?? []
      setMembers(memberList)

      const memberUserIds = memberList.map((m) => m.user_id)

      if (memberUserIds.length > 0) {
        const [txRes, holdRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .in('user_id', memberUserIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('holdings')
            .select('*')
            .in('user_id', memberUserIds),
        ])

        setTransactions((txRes.data as Transaction[] | null) ?? [])
        setHoldings((holdRes.data as Holding[] | null) ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch business overview:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* ---- Computed KPIs ---- */

  const portfolioValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * h.current_price, 0),
    [holdings],
  )

  const monthlyRevenue = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return transactions
      .filter((tx) => new Date(tx.created_at) >= monthStart && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount, 0)
  }, [transactions])

  const activeEmployees = useMemo(
    () => members.filter((m) => m.status === 'active').length,
    [members],
  )

  const totalRoundUps = useMemo(
    () => transactions.reduce((sum, tx) => sum + (tx.round_up ?? 0), 0),
    [transactions],
  )

  const investmentGrowth = useMemo(() => {
    const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avg_price, 0)
    if (totalCost === 0) return 0
    return ((portfolioValue - totalCost) / totalCost) * 100
  }, [holdings, portfolioValue])

  /* ---- Revenue trend chart data ---- */

  const revenueTrendData = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.status !== 'completed') continue
      const d = new Date(tx.created_at)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      map.set(key, (map.get(key) ?? 0) + tx.amount)
    }
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))
  }, [transactions])

  /* ---- Department breakdown chart data ---- */

  const departmentData = useMemo(() => {
    const deptTotals = new Map<string, number>()
    const memberDeptMap = new Map<number, string>()
    for (const m of members) {
      memberDeptMap.set(m.user_id, m.department ?? 'Unassigned')
    }
    for (const tx of transactions) {
      const dept = memberDeptMap.get(tx.user_id) ?? 'Unassigned'
      deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + tx.amount)
    }
    return Array.from(deptTotals.entries()).map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100,
    }))
  }, [members, transactions])

  /* ---- Recent activity feed ---- */

  const activityItems = useMemo<ActivityItem[]>(() => {
    const colors: Array<'purple' | 'blue' | 'teal' | 'pink'> = ['purple', 'blue', 'teal', 'pink']
    return transactions.slice(0, 6).map((tx, idx) => ({
      color: colors[idx % colors.length],
      text: `${tx.merchant ?? 'Transaction'} -- ${formatCurrency(tx.amount)}`,
      time: timeAgo(tx.created_at),
    }))
  }, [transactions])

  /* ---- Quick actions ---- */

  const quickActions = useMemo<QuickAction[]>(() => [
    {
      label: 'Add Team Member',
      gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
      onClick: () => { /* placeholder */ },
    },
    {
      label: 'Create Goal',
      gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      onClick: () => { /* placeholder */ },
    },
    {
      label: 'Generate Report',
      gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      onClick: () => { /* placeholder */ },
    },
    {
      label: 'View Analytics',
      gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      onClick: () => { /* placeholder */ },
    },
  ], [])

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {/* KPI Row */}
      <div style={kpiGridStyle}>
        <KpiCard
          label="Company Portfolio"
          value={formatCurrency(portfolioValue)}
          accent="purple"
          icon={<PortfolioIcon />}
        />
        <KpiCard
          label="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          accent="blue"
          icon={<RevenueIcon />}
        />
        <KpiCard
          label="Active Employees"
          value={activeEmployees}
          accent="teal"
          icon={<TeamIcon />}
        />
        <KpiCard
          label="Total Round-Ups"
          value={formatCurrency(totalRoundUps)}
          accent="pink"
          icon={<RoundUpIcon />}
        />
        <KpiCard
          label="Investment Growth"
          value={`${investmentGrowth >= 0 ? '+' : ''}${investmentGrowth.toFixed(1)}%`}
          accent="purple"
          icon={<GrowthIcon />}
        />
      </div>

      {/* Charts Row */}
      <div style={twoColStyle}>
        <LineChart
          title="Revenue Trend"
          data={revenueTrendData}
          dataKey="value"
          xKey="name"
          color="#7C3AED"
          height={260}
        />
        <BarChart
          title="Department Breakdown"
          data={departmentData}
          dataKey="amount"
          xKey="name"
          color="#3B82F6"
          height={260}
        />
      </div>

      {/* Activity Feed + Quick Actions */}
      <div style={twoColStyle}>
        <GlassCard accent="teal" padding="24px">
          <p style={sectionTitleStyle}>Recent Activity</p>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
              marginBottom: '12px',
            }}
          />
          <ActivityFeed items={activityItems} emptyMessage="No recent activity" />
        </GlassCard>

        <GlassCard accent="pink" padding="24px">
          <p style={sectionTitleStyle}>Quick Actions</p>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
              marginBottom: '12px',
            }}
          />
          <QuickActions actions={quickActions} />
        </GlassCard>
      </div>
    </div>
  )
}
