import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard } from '@/components/ui'
import BarChart from '@/components/charts/BarChart'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BusinessMember {
  user_id: number
  department: string | null
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

interface AiResponse {
  id: number
  user_id: number
  prompt: string
  response: string
  model: string | null
  created_at: string
}

interface Holding {
  user_id: number
  shares: number
  avg_price: number
  current_price: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function SpendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
    </svg>
  )
}

function DepartmentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function OptimizeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function RoiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Insight card                                                       */
/* ------------------------------------------------------------------ */

interface InsightCardProps {
  title: string
  accent: 'purple' | 'blue' | 'teal' | 'pink'
  icon: React.ReactNode
  children: React.ReactNode
}

function InsightCard({ title, accent, icon, children }: InsightCardProps) {
  const bgColors: Record<string, string> = {
    purple: 'rgba(124,58,237,0.15)',
    blue: 'rgba(59,130,246,0.15)',
    teal: 'rgba(6,182,212,0.15)',
    pink: 'rgba(236,72,153,0.15)',
  }
  const textColors: Record<string, string> = {
    purple: '#7C3AED',
    blue: '#3B82F6',
    teal: '#06B6D4',
    pink: '#EC4899',
  }

  return (
    <GlassCard accent={accent} padding="24px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: bgColors[accent],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColors[accent],
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
      {children}
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading / Empty                                                    */
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
          animation: 'biz-ai-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-ai-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyInsight({ message }: { message: string }) {
  return (
    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
      {message}
    </p>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessAiInsightsTab() {
  const { profile } = useAuth()

  const [members, setMembers] = useState<BusinessMember[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [aiResponses, setAiResponses] = useState<AiResponse[]>([])
  const [loading, setLoading] = useState(true)

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id')
        .eq('created_by', profile.id)
        .limit(1)
        .single()

      if (!bizData) { setLoading(false); return }

      const { data: memberData } = await supabase
        .from('business_members')
        .select('user_id, department')
        .eq('business_id', bizData.id)

      const memberList = (memberData as BusinessMember[] | null) ?? []
      setMembers(memberList)

      const userIds = memberList.map((m) => m.user_id)

      if (userIds.length > 0) {
        const [txRes, holdRes, aiRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .in('user_id', userIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('holdings')
            .select('user_id, shares, avg_price, current_price')
            .in('user_id', userIds),
          supabase
            .from('ai_responses')
            .select('*')
            .in('user_id', userIds)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        setTransactions((txRes.data as Transaction[] | null) ?? [])
        setHoldings((holdRes.data as Holding[] | null) ?? [])
        setAiResponses((aiRes.data as AiResponse[] | null) ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch AI insights data:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* ---- Computed: Spending analysis ---- */

  const categorySpend = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      const cat = tx.category ?? 'Uncategorized'
      map.set(cat, (map.get(cat) ?? 0) + tx.amount)
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [transactions])

  const topCategories = categorySpend.slice(0, 5)

  /* ---- Computed: Department cost comparison ---- */

  const departmentCosts = useMemo(() => {
    const memberDeptMap = new Map<number, string>()
    for (const m of members) {
      memberDeptMap.set(m.user_id, m.department ?? 'Unassigned')
    }

    const deptTotals = new Map<string, number>()
    for (const tx of transactions) {
      const dept = memberDeptMap.get(tx.user_id) ?? 'Unassigned'
      deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + tx.amount)
    }

    return Array.from(deptTotals.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
  }, [members, transactions])

  /* ---- Computed: ROI predictions ---- */

  const roiStats = useMemo(() => {
    const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avg_price, 0)
    const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.current_price, 0)
    const roi = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0

    const totalRoundUps = transactions.reduce((sum, tx) => sum + (tx.round_up ?? 0), 0)
    const months = new Set<string>()
    for (const tx of transactions) {
      const d = new Date(tx.created_at)
      months.add(`${d.getFullYear()}-${d.getMonth()}`)
    }
    const monthCount = Math.max(1, months.size)
    const monthlyRoundUp = totalRoundUps / monthCount
    const projectedAnnual = monthlyRoundUp * 12

    return { totalCost, totalValue, roi, totalRoundUps, projectedAnnual }
  }, [holdings, transactions])

  /* ---- Computed: Investment optimization ---- */

  const optimizationSuggestions = useMemo(() => {
    const suggestions: string[] = []

    if (transactions.length === 0) return suggestions

    // Low round-up participation
    const usersWithRoundUps = new Set(transactions.filter((tx) => tx.round_up > 0).map((tx) => tx.user_id))
    const totalUsers = new Set(transactions.map((tx) => tx.user_id)).size
    if (usersWithRoundUps.size < totalUsers * 0.7) {
      suggestions.push(
        `Only ${usersWithRoundUps.size} of ${totalUsers} team members have round-ups active. Increasing participation could significantly boost company investment volume.`
      )
    }

    // High spending in one category
    if (topCategories.length > 0) {
      const totalSpend = categorySpend.reduce((sum, c) => sum + c.total, 0)
      const topPct = totalSpend > 0 ? (topCategories[0].total / totalSpend) * 100 : 0
      if (topPct > 40) {
        suggestions.push(
          `${topCategories[0].category} accounts for ${topPct.toFixed(0)}% of total spending. Diversifying spending patterns could improve round-up distribution.`
        )
      }
    }

    // ROI suggestion
    if (roiStats.roi > 0) {
      suggestions.push(
        `Current portfolio ROI is ${roiStats.roi.toFixed(1)}%. With projected annual round-ups of ${formatCurrency(roiStats.projectedAnnual)}, your portfolio could grow significantly with continued investment.`
      )
    }

    if (suggestions.length === 0) {
      suggestions.push('Continue building transaction history for more detailed optimization suggestions.')
    }

    return suggestions
  }, [transactions, topCategories, categorySpend, roiStats])

  const hasData = transactions.length > 0

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          AI Insights
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
          Business spending analysis and investment optimization powered by AI.
        </p>
      </div>

      {/* Insight cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Business Spending Analysis */}
        <InsightCard title="Business Spending Analysis" accent="purple" icon={<SpendingIcon />}>
          {!hasData ? (
            <EmptyInsight message="Not enough transaction data for spending analysis." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Top spending categories across all team members:
              </p>
              {topCategories.map((cat, idx) => (
                <div
                  key={cat.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--surface-input)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-divider)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(124,58,237,0.15)',
                        color: '#7C3AED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {cat.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </InsightCard>

        {/* 2. Department Cost Comparison */}
        <InsightCard title="Department Cost Comparison" accent="blue" icon={<DepartmentIcon />}>
          {departmentCosts.length === 0 ? (
            <EmptyInsight message="No department cost data available yet." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              {departmentCosts.map((dept) => (
                <div
                  key={dept.name}
                  style={{
                    padding: '14px',
                    background: 'rgba(59,130,246,0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(59,130,246,0.12)',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                    {dept.name}
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {formatCurrency(dept.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </InsightCard>

        {/* 3. Investment Optimization */}
        <InsightCard title="Investment Optimization" accent="teal" icon={<OptimizeIcon />}>
          {optimizationSuggestions.length === 0 ? (
            <EmptyInsight message="Not enough data to generate optimization suggestions." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {optimizationSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(6,182,212,0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(6,182,212,0.12)',
                  }}
                >
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </InsightCard>

        {/* 4. ROI Predictions */}
        <InsightCard title="ROI Predictions" accent="pink" icon={<RoiIcon />}>
          {!hasData ? (
            <EmptyInsight message="No investment data available for ROI predictions." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(236,72,153,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(236,72,153,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  Total Cost Basis
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(roiStats.totalCost)}
                </p>
              </div>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(236,72,153,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(236,72,153,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  Current Value
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(roiStats.totalValue)}
                </p>
              </div>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(236,72,153,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(236,72,153,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  ROI
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {roiStats.roi >= 0 ? '+' : ''}{roiStats.roi.toFixed(1)}%
                </p>
              </div>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(236,72,153,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(236,72,153,0.12)',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                  Projected Annual
                </p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(roiStats.projectedAnnual)}
                </p>
              </div>
            </div>
          )}
        </InsightCard>
      </div>

      {/* Department spending chart */}
      <BarChart
        data={departmentCosts}
        dataKey="amount"
        xKey="name"
        title="Spending by Department"
        color="#3B82F6"
        height={280}
      />

      {/* AI responses empty state */}
      {aiResponses.length === 0 && (
        <GlassCard padding="24px">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <line x1="10" y1="22" x2="14" y2="22" />
            </svg>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '16px' }}>
              No AI analysis history yet. AI insights will appear as your team generates them.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
