import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Button, Modal, Input, Select, Badge } from '@/components/ui'
import type { SelectOption } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Goal {
  id: number
  user_id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  status: string
}

interface BusinessMember {
  id: number
  user_id: number
  department: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: 'Company-wide', label: 'Company-wide' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Design', label: 'Design' },
  { value: 'Product', label: 'Product' },
]

const GOAL_COLORS = ['#7C3AED', '#3B82F6', '#06B6D4', '#EC4899']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const progressBarBgStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: 'var(--surface-input)',
  overflow: 'hidden',
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
          animation: 'biz-goals-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-goals-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
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
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '16px', maxWidth: '300px' }}>
        No company goals yet. Create your first investment goal.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessGoalsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [goals, setGoals] = useState<Goal[]>([])
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [memberUserIds, setMemberUserIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  // Add modal
  const [modalOpen, setModalOpen] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [goalDepartment, setGoalDepartment] = useState('Company-wide')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle()

      if (!bizData) { setLoading(false); return }

      const { data: memberData } = await supabaseAdmin
        .from('business_members')
        .select('id, user_id, department')
        .eq('business_id', bizData.id)
        .limit(100)

      const memberList = (memberData as BusinessMember[] | null) ?? []
      setMembers(memberList)

      const userIds = memberList.map((m) => m.user_id)
      setMemberUserIds(userIds)

      if (userIds.length > 0) {
        const { data: goalsData } = await supabaseAdmin
          .from('goals')
          .select('*')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
          .limit(50)

        setGoals((goalsData as Goal[] | null) ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userLoading) void fetchData()
  }, [fetchData, userLoading])

  /* ---- Department breakdown ---- */

  const departmentGoals = useMemo(() => {
    const memberDeptMap = new Map<number, string>()
    for (const m of members) {
      memberDeptMap.set(m.user_id, m.department ?? 'Unassigned')
    }

    const deptMap = new Map<string, { target: number; current: number; count: number }>()
    for (const g of goals) {
      const dept = memberDeptMap.get(g.user_id) ?? 'Unassigned'
      const existing = deptMap.get(dept) ?? { target: 0, current: 0, count: 0 }
      existing.target += g.target_amount
      existing.current += g.current_amount
      existing.count += 1
      deptMap.set(dept, existing)
    }

    return Array.from(deptMap.entries())
      .map(([department, data]) => ({ department, ...data }))
      .sort((a, b) => b.target - a.target)
  }, [goals, members])

  /* ---- Create goal ---- */

  const resetForm = () => {
    setGoalName('')
    setGoalTarget('')
    setGoalDeadline('')
    setGoalDepartment('Company-wide')
    setFormError(null)
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = goalName.trim()
    const parsedTarget = parseFloat(goalTarget)

    if (!trimmedName) {
      setFormError('Goal name is required.')
      return
    }
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setFormError('Please enter a valid target amount greater than zero.')
      return
    }
    if (memberUserIds.length === 0) {
      setFormError('No team members to assign the goal to.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      // Create goal for the business owner (as business-level goal)
      const { error } = await supabaseAdmin.from('goals').insert({
        user_id: memberUserIds[0],
        name: trimmedName,
        target_amount: parsedTarget,
        current_amount: 0,
        deadline: goalDeadline || null,
        status: 'active',
      })

      if (error) throw error

      setModalOpen(false)
      resetForm()
      await fetchData()
    } catch (err) {
      console.error('Failed to create goal:', err)
      setFormError('Failed to create goal. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Company Goals
        </h2>
        <Button variant="primary" size="md" onClick={() => { resetForm(); setModalOpen(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Goal
        </Button>
      </div>

      {/* Add Goal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Company Goal" size="sm">
        <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Goal Name"
            placeholder="e.g., Q2 Investment Target"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            required
          />
          <Input
            label="Target Amount"
            type="number"
            placeholder="0.00"
            min="0.01"
            step="0.01"
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            required
          />
          <Input
            label="Deadline"
            type="date"
            value={goalDeadline}
            onChange={(e) => setGoalDeadline(e.target.value)}
          />
          <Select
            label="Assigned Department"
            options={DEPARTMENT_OPTIONS}
            value={goalDepartment}
            onChange={(e) => setGoalDepartment(e.target.value)}
          />

          {formError && (
            <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{formError}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Create Goal
          </Button>
        </form>
      </Modal>

      {/* Goal cards */}
      {goals.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}
        >
          {goals.map((goal, idx) => {
            const pct = goal.target_amount > 0
              ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
              : 0
            const barColor = GOAL_COLORS[idx % GOAL_COLORS.length]

            return (
              <GlassCard key={goal.id} padding="20px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {goal.name}
                  </h3>
                  <Badge variant={goal.status === 'active' ? 'success' : goal.status === 'completed' ? 'info' : 'default'}>
                    {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div style={progressBarBgStyle}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                      transition: 'width 500ms ease',
                    }}
                  />
                </div>

                {/* Amount row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: barColor }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>

                {/* Deadline */}
                {goal.deadline && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Deadline: {formatDate(goal.deadline)}
                    </span>
                  </div>
                )}

                {/* Contributors count */}
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <Badge variant="info">{pct.toFixed(0)}% complete</Badge>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Department goal breakdown */}
      {departmentGoals.length > 0 && (
        <GlassCard accent="teal" padding="24px">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Department Goal Breakdown
          </h3>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--highlight-line), transparent)',
              marginBottom: '16px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {departmentGoals.map((dept, idx) => {
              const pct = dept.target > 0 ? Math.min(100, (dept.current / dept.target) * 100) : 0
              const color = GOAL_COLORS[idx % GOAL_COLORS.length]

              return (
                <div key={dept.department}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dept.department}
                      </span>
                      <Badge variant="default">{dept.count} goals</Badge>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formatCurrency(dept.current)} / {formatCurrency(dept.target)}
                    </span>
                  </div>
                  <div style={progressBarBgStyle}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: '4px',
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        transition: 'width 500ms ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
