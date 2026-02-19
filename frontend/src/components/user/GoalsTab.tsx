import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard, Button, Input, Modal, Badge, Select } from '@/components/ui';
import type { Database } from '@/types/database';

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalType = 'savings' | 'investment' | 'emergency' | 'vacation' | 'custom';

const GOAL_TYPE_OPTIONS = [
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'custom', label: 'Custom' },
];

const GOAL_TYPE_BADGE_VARIANT: Record<string, 'purple' | 'info' | 'warning' | 'success' | 'default'> = {
  savings: 'success',
  investment: 'purple',
  emergency: 'warning',
  vacation: 'info',
  custom: 'default',
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

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
          animation: 'goals-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes goals-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
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
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '16px', maxWidth: '300px' }}>
        No goals yet. Create your first savings goal.
      </p>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: number) => void;
  deleting: number | null;
}

function GoalCard({ goal, onDelete, deleting }: GoalCardProps) {
  const progressPercent = Math.min(100, Math.max(0, goal.progress));

  return (
    <GlassCard padding="20px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {goal.title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          loading={deleting === goal.id}
          onClick={() => onDelete(goal.id)}
          aria-label={`Delete goal: ${goal.title}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </Button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: 'var(--surface-input)',
          overflow: 'hidden',
          marginBottom: '10px',
        }}
      >
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
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
        {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
      </p>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Badge variant="info">
          {progressPercent.toFixed(0)}%
        </Badge>
        <Badge variant={GOAL_TYPE_BADGE_VARIANT[goal.goal_type] ?? 'default'}>
          {goal.goal_type.charAt(0).toUpperCase() + goal.goal_type.slice(1)}
        </Badge>
      </div>
    </GlassCard>
  );
}

export function GoalsTab() {
  const { profile } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('savings');

  const fetchGoals = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data ?? []);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const resetForm = () => {
    setTitle('');
    setTargetAmount('');
    setGoalType('savings');
    setFormError(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    const trimmedTitle = title.trim();
    const parsedAmount = parseFloat(targetAmount);

    if (!trimmedTitle) {
      setFormError('Please enter a goal title.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid target amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase.from('goals').insert({
        user_id: profile.id,
        title: trimmedTitle,
        target_amount: parsedAmount,
        current_amount: 0,
        progress: 0,
        goal_type: goalType,
      });

      if (error) throw error;

      handleCloseModal();
      await fetchGoals();
    } catch (err) {
      console.error('Failed to create goal:', err);
      setFormError('Failed to create goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (goalId: number) => {
    if (!profile?.id) return;
    setDeleting(goalId);

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', profile.id);

      if (error) throw error;
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err) {
      console.error('Failed to delete goal:', err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Create button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Goals
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
          Create Goal
        </Button>
      </div>

      {/* Create Goal Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal} title="Create Goal" size="sm">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Title"
            placeholder="e.g., Emergency Fund"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          <Select
            label="Goal Type"
            options={GOAL_TYPE_OPTIONS}
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} deleting={deleting} />
          ))}
        </div>
      )}
    </div>
  );
}
