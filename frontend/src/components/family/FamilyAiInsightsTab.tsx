import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard } from '@/components/ui'
import BarChart from '@/components/charts/BarChart'

/* ---- Types ---- */

interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  role: string
  users: {
    id: number
    name: string
  } | null
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
  model: string
  created_at: string
}

/* ---- Formatting helpers ---- */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

/* ---- Loading Spinner ---- */

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
          animation: 'family-ai-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes family-ai-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ---- Insight Card ---- */

interface InsightCardProps {
  title: string
  accent: 'purple' | 'blue' | 'teal'
  icon: React.ReactNode
  children: React.ReactNode
}

function InsightCard({ title, accent, icon, children }: InsightCardProps) {
  return (
    <GlassCard accent={accent} padding="24px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background:
              accent === 'purple'
                ? 'rgba(124,58,237,0.15)'
                : accent === 'blue'
                  ? 'rgba(59,130,246,0.15)'
                  : 'rgba(6,182,212,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color:
              accent === 'purple'
                ? '#7C3AED'
                : accent === 'blue'
                  ? '#3B82F6'
                  : '#06B6D4',
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

/* ---- SVG Icons ---- */

function SpendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
    </svg>
  )
}

function CategoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function RecommendationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
      <line x1="10" y1="22" x2="14" y2="22" />
    </svg>
  )
}

/* ---- Component ---- */

export function FamilyAiInsightsTab() {
  const { profile } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [aiResponses, setAiResponses] = useState<AiResponse[]>([])
  const [memberNameMap, setMemberNameMap] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }

    const { data: memberRecord } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', profile.id)
      .single()

    if (!memberRecord) { setLoading(false); return }

    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('*, users(id, name)')
      .eq('family_id', memberRecord.family_id)

    const membersData = (familyMembers ?? []) as FamilyMember[]
    const memberUserIds = membersData.map((m) => m.user_id)

    const nameMap = new Map<number, string>()
    for (const m of membersData) {
      nameMap.set(m.user_id, m.users?.name ?? 'Unknown')
    }
    setMemberNameMap(nameMap)

    if (memberUserIds.length === 0) { setLoading(false); return }

    const [txRes, aiRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_responses')
        .select('*')
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    setTransactions((txRes.data ?? []) as Transaction[])
    setAiResponses((aiRes.data ?? []) as AiResponse[])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ---- Computed: spending by category ---- */

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

  /* ---- Computed: spending by member ---- */

  const memberSpend = useMemo(() => {
    const map = new Map<number, number>()
    for (const tx of transactions) {
      map.set(tx.user_id, (map.get(tx.user_id) ?? 0) + tx.amount)
    }
    return Array.from(map.entries())
      .map(([userId, total]) => ({
        name: memberNameMap.get(userId) ?? 'Unknown',
        amount: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, memberNameMap])

  /* ---- Computed: round-up stats ---- */

  const roundUpStats = useMemo(() => {
    const roundUps = transactions.filter((t) => t.round_up > 0)
    const totalRoundUps = roundUps.reduce((sum, t) => sum + t.round_up, 0)
    const avgRoundUp = roundUps.length > 0 ? totalRoundUps / roundUps.length : 0

    const months = new Set<string>()
    for (const t of transactions) {
      const d = new Date(t.created_at)
      months.add(`${d.getFullYear()}-${d.getMonth()}`)
    }
    const monthCount = Math.max(1, months.size)
    const monthlyAvg = totalRoundUps / monthCount
    const projectedAnnual = monthlyAvg * 12

    return { totalRoundUps, avgRoundUp, projectedAnnual, count: roundUps.length }
  }, [transactions])

  /* ---- Chart data ---- */

  const chartData = useMemo(
    () => categorySpend.map((c) => ({
      name: c.category,
      amount: Math.round(c.total * 100) / 100,
    })),
    [categorySpend],
  )

  if (loading) {
    return <LoadingSpinner />
  }

  const hasTransactions = transactions.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          Family AI Insights
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
          AI-powered analysis of your family spending patterns, category breakdowns, and personalized recommendations.
        </p>
      </div>

      {/* Insight Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Family Spending Overview */}
        <InsightCard title="Family Spending Overview" accent="purple" icon={<SpendingIcon />}>
          {!hasTransactions ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              No transaction data available. Family members need to make purchases to generate spending insights.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Top spending categories across the family:
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

        {/* 2. Category Breakdown by Member */}
        <InsightCard title="Spending by Member" accent="blue" icon={<CategoryIcon />}>
          {memberSpend.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              No spending data available to break down by member.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              {memberSpend.map((m) => (
                <div
                  key={m.name}
                  style={{
                    padding: '14px',
                    background: 'rgba(59,130,246,0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(59,130,246,0.12)',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                    {m.name}
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {formatCurrency(m.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </InsightCard>

        {/* 3. Smart Recommendations */}
        <InsightCard title="Smart Recommendations" accent="teal" icon={<RecommendationIcon />}>
          {!hasTransactions ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Not enough data to generate recommendations. Link cards and make purchases to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Round-up recommendation */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(6,182,212,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(6,182,212,0.12)',
                }}
              >
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: 600 }}>
                  Family Round-Up Impact
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Your family has generated {formatCurrency(roundUpStats.totalRoundUps)} in round-ups across{' '}
                  {roundUpStats.count} transactions. The projected annual total is{' '}
                  {formatCurrency(roundUpStats.projectedAnnual)}.
                </p>
              </div>

              {/* AI-generated insights */}
              {aiResponses.length > 0 && (
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(6,182,212,0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(6,182,212,0.12)',
                  }}
                >
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: 600 }}>
                    Latest AI Insight
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    {aiResponses[0].response}
                  </p>
                </div>
              )}

              {/* General tips */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(6,182,212,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(6,182,212,0.12)',
                }}
              >
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: 600 }}>
                  Tips for Your Family
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Encourage all family members to enable round-ups for faster portfolio growth.
                  </li>
                  <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Set shared family goals to align savings priorities.
                  </li>
                  <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Review the spending breakdown by member to identify optimization opportunities.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </InsightCard>
      </div>

      {/* Spending by Category Chart */}
      <BarChart
        data={chartData}
        dataKey="amount"
        xKey="name"
        title="Family Spending by Category"
        color="#7C3AED"
        height={280}
      />
    </div>
  )
}
