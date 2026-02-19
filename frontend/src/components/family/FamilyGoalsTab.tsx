import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Button, Input, Modal, Badge } from '@/components/ui'

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

interface Goal {
  id: number
  user_id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  status: string
  created_at: string
}

interface GoalWithMember extends Goal {
  memberName: string
}

/* ---- Formatting helpers ---- */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/* ---- Styles ---- */

const goalGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '16px',
}

const progressBarBgStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: 'var(--surface-input)',
  overflow: 'hidden',
}

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
          animation: 'family-goals-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes family-goals-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ---- Empty State ---- */

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
        No family goals yet. Create a shared goal to get started.
      </p>
    </div>
  )
}

/* ---- Goal Card ---- */

interface GoalCardProps {
  goal: GoalWithMember
}

const STATUS_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  active: 'success',
  completed: 'info',
  paused: 'warning',
}

function GoalCard({ goal }: GoalCardProps) {
  const progressPercent = goal.target_amount > 0
    ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
    : 0

  return (
    <GlassCard padding="20px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {goal.name}
        </h3>
        <Badge variant={STATUS_BADGE_VARIANT[goal.status] ?? 'default'}>
          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
        </Badge>
      </div>

      {/* Progress bar */}
      <div style={progressBarBgStyle}>
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #7C3AED, #3B82F6)',
            transition: 'width 500ms ease',
          }}
        />
      </div>

      {/* Amount text */}
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 12px 0' }}>
        {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
      </p>

      {/* Footer info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant="info">
            {progressPercent.toFixed(0)}%
          </Badge>
          <Badge variant="purple">
            {goal.memberName}
          </Badge>
        </div>
        {goal.deadline && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Due: {formatDate(goal.deadline)}
          </span>
        )}
      </div>
    </GlassCard>
  )
}

/* ---- Component ---- */

export function FamilyGoalsTab() {
  const { profile } = useAuth()

  const [goals, setGoals] = useState<GoalWithMember[]>([])
  const [familyId, setFamilyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form state
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')

  /* ---- Data fetching ---- */

  const fetchGoals = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }

    const { data: memberRecord } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', profile.id)
      .single()

    if (!memberRecord) { setLoading(false); return }

    setFamilyId(memberRecord.family_id)

    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('*, users(id, name)')
      .eq('family_id', memberRecord.family_id)

    const membersData = (familyMembers ?? []) as FamilyMember[]
    const memberUserIds = membersData.map((m) => m.user_id)

    if (memberUserIds.length === 0) { setLoading(false); return }

    const { data: goalsData, error } = await supabase
      .from('goals')
      .select('*')
      .in('user_id', memberUserIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch goals:', error)
      setLoading(false)
      return
    }

    const memberNameMap = new Map<number, string>()
    for (const m of membersData) {
      memberNameMap.set(m.user_id, m.users?.name ?? 'Unknown')
    }

    const mapped: GoalWithMember[] = ((goalsData ?? []) as Goal[]).map((g) => ({
      ...g,
      memberName: memberNameMap.get(g.user_id) ?? 'Unknown',
    }))

    setGoals(mapped)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  /* ---- Create Goal ---- */

  const resetForm = () => {
    setGoalName('')
    setTargetAmount('')
    setDeadline('')
    setFormError(null)
  }

  const handleOpenModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id || !familyId) return

    const trimmedName = goalName.trim()
    const parsedAmount = parseFloat(targetAmount)

    if (!trimmedName) {
      setFormError('Please enter a goal name.')
      return
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid target amount greater than zero.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const { error } = await supabase.from('goals').insert({
        user_id: profile.id,
        name: trimmedName,
        target_amount: parsedAmount,
        current_amount: 0,
        status: 'active',
        deadline: deadline || null,
      })

      if (error) throw error

      handleCloseModal()
      await fetchGoals()
    } catch (err) {
      console.error('Failed to create goal:', err)
      setFormError('Failed to create goal. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Create button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Family Goals
        </h2>
        <Button variant="primary" size="md" onClick={handleOpenModal}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Goal
        </Button>
      </div>

      {/* Create Goal Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal} title="Create Family Goal" size="sm">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Goal Name"
            placeholder="e.g., Family Vacation Fund"
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
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
          <Input
            label="Deadline (optional)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          {formError && (
            <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{formError}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Create Goal
          </Button>
        </form>
      </Modal>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : goals.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={goalGridStyle}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
