import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { DemoGoal } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

export function DemoGoalsTab({ initialGoals }: { initialGoals: DemoGoal[] }) {
  const [goals, setGoals] = useState<DemoGoal[]>(initialGoals)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [toast, setToast] = useState('')

  const handleAddGoal = () => {
    if (!newName || !newTarget) return
    const goal: DemoGoal = {
      id: Date.now(),
      name: newName,
      target_amount: parseFloat(newTarget),
      current_amount: 0,
      deadline: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      status: 'active',
    }
    setGoals(prev => [goal, ...prev])
    setNewName('')
    setNewTarget('')
    setShowAdd(false)
    setToast('Goal created! (Demo)')
    setTimeout(() => setToast(''), 3000)
  }

  const handleContribute = (id: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g
      const added = Math.min(25, g.target_amount - g.current_amount)
      const newAmount = g.current_amount + added
      return { ...g, current_amount: newAmount, status: newAmount >= g.target_amount ? 'completed' : 'active' }
    }))
    setToast('$25 contributed! (Demo)')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: '#fff',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Your Goals ({goals.filter(g => g.status === 'active').length} active)
        </h2>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ New Goal'}
        </Button>
      </div>

      {showAdd && (
        <GlassCard accent="purple" padding="24px">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', opacity: 0.8 }}>Goal Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., New Car Fund"
                style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'inherit', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ width: '160px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', opacity: 0.8 }}>Target ($)</label>
              <input
                type="number"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="1000"
                style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'inherit', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleAddGoal}>Create</Button>
          </div>
        </GlassCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {goals.map(goal => {
          const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100)
          const isComplete = goal.status === 'completed'
          return (
            <GlassCard key={goal.id} accent={isComplete ? 'teal' : 'purple'} padding="24px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{goal.name}</span>
                <Badge variant={isComplete ? 'success' : 'info'}>{isComplete ? 'Completed' : `${pct.toFixed(0)}%`}</Badge>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>{fmt(goal.current_amount)}</span>
                  <span>{fmt(goal.target_amount)}</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface-input)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isComplete ? 'linear-gradient(90deg, #06B6D4, #34D399)' : 'linear-gradient(90deg, #7C3AED, #3B82F6)',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Deadline: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {!isComplete && (
                  <Button variant="secondary" size="sm" onClick={() => handleContribute(goal.id)}>
                    + $25
                  </Button>
                )}
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
