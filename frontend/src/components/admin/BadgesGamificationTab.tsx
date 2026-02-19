import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Modal } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BadgeRow {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  criteria: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserBadgeRow {
  id: number;
  user_id: number;
  badge_id: number;
  awarded_at: string;
}

interface BadgeCountGroup {
  badge_id: number;
  count: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Badge Definitions Tab                                              */
/* ------------------------------------------------------------------ */

function BadgeDefinitionsContent() {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formCriteria, setFormCriteria] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchBadges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableNotFound(true);
          setBadges([]);
          return;
        }
        console.error('Failed to fetch badges:', error.message);
        setBadges([]);
        return;
      }

      setBadges((data as BadgeRow[]) ?? []);
    } catch (err) {
      console.error('Unexpected error fetching badges:', err);
      setTableNotFound(true);
      setBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  function openCreateModal() {
    setEditingBadge(null);
    setFormName('');
    setFormDescription('');
    setFormIcon('');
    setFormCriteria('');
    setFormIsActive(true);
    setModalOpen(true);
  }

  function openEditModal(badge: BadgeRow) {
    setEditingBadge(badge);
    setFormName(badge.name);
    setFormDescription(badge.description ?? '');
    setFormIcon(badge.icon ?? '');
    setFormCriteria(badge.criteria ?? '');
    setFormIsActive(badge.is_active);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      if (editingBadge) {
        const { error } = await supabase
          .from('badges')
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            icon: formIcon.trim() || null,
            criteria: formCriteria.trim() || null,
            is_active: formIsActive,
          })
          .eq('id', editingBadge.id);

        if (error) {
          console.error('Failed to update badge:', error.message);
          return;
        }
      } else {
        const { error } = await supabase
          .from('badges')
          .insert({
            name: formName.trim(),
            description: formDescription.trim() || null,
            icon: formIcon.trim() || null,
            criteria: formCriteria.trim() || null,
            is_active: formIsActive,
          });

        if (error) {
          console.error('Failed to create badge:', error.message);
          return;
        }
      }

      setModalOpen(false);
      await fetchBadges();
    } catch (err) {
      console.error('Unexpected error saving badge:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete badge:', error.message);
        return;
      }

      await fetchBadges();
    } catch (err) {
      console.error('Unexpected error deleting badge:', err);
    }
  }

  const totalBadges = badges.length;
  const activeBadges = badges.filter((b) => b.is_active).length;

  const columns: Column<BadgeRow>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, width: '160px' },
      {
        key: 'description',
        header: 'Description',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.description ?? '--'}
          </span>
        ),
      },
      {
        key: 'icon',
        header: 'Icon',
        width: '120px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            {row.icon ?? '--'}
          </span>
        ),
      },
      {
        key: 'criteria',
        header: 'Criteria',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.criteria ?? '--'}
          </span>
        ),
      },
      {
        key: 'is_active',
        header: 'Active',
        width: '100px',
        render: (row) => (
          <Badge variant={row.is_active ? 'success' : 'error'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '180px',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '160px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={() => openEditModal(row)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (tableNotFound) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Badges table not configured. Run the badges migration to enable this feature.
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Badges" value={totalBadges.toLocaleString()} accent="purple" />
        <KpiCard label="Active Badges" value={activeBadges.toLocaleString()} accent="teal" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={openCreateModal}>Create Badge</Button>
      </div>

      <GlassCard padding="0">
        <Table<BadgeRow>
          columns={columns}
          data={badges}
          loading={loading}
          emptyMessage="No badges defined yet"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingBadge ? 'Edit Badge' : 'Create Badge'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Badge name"
          />
          <Input
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Badge description"
          />
          <Input
            label="Icon URL"
            value={formIcon}
            onChange={(e) => setFormIcon(e.target.value)}
            placeholder="https://example.com/icon.svg"
          />
          <Input
            label="Criteria"
            value={formCriteria}
            onChange={(e) => setFormCriteria(e.target.value)}
            placeholder="How this badge is earned"
          />
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <span
                onClick={() => setFormIsActive(!formIsActive)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formIsActive
                    ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
                    : 'var(--surface-hover)',
                  transition: 'background 200ms ease',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: formIsActive ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#F8FAFC',
                    transition: 'left 200ms ease',
                  }}
                />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {formIsActive ? 'Active' : 'Inactive'}
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!formName.trim()}>
              {editingBadge ? 'Update Badge' : 'Create Badge'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Award Queue Tab                                                    */
/* ------------------------------------------------------------------ */

function AwardQueueContent() {
  const [userBadges, setUserBadges] = useState<UserBadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formBadgeId, setFormBadgeId] = useState('');

  const fetchUserBadges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .order('awarded_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableNotFound(true);
          setUserBadges([]);
          return;
        }
        console.error('Failed to fetch user badges:', error.message);
        setUserBadges([]);
        return;
      }

      setUserBadges((data as UserBadgeRow[]) ?? []);
    } catch (err) {
      console.error('Unexpected error fetching user badges:', err);
      setTableNotFound(true);
      setUserBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserBadges();
  }, [fetchUserBadges]);

  async function handleAwardBadge() {
    const userId = parseInt(formUserId, 10);
    const badgeId = parseInt(formBadgeId, 10);
    if (isNaN(userId) || isNaN(badgeId)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          awarded_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to award badge:', error.message);
        return;
      }

      setModalOpen(false);
      setFormUserId('');
      setFormBadgeId('');
      await fetchUserBadges();
    } catch (err) {
      console.error('Unexpected error awarding badge:', err);
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<UserBadgeRow>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'user_id', header: 'User ID', sortable: true, width: '120px' },
      { key: 'badge_id', header: 'Badge ID', sortable: true, width: '120px' },
      {
        key: 'awarded_at',
        header: 'Awarded At',
        sortable: true,
        width: '200px',
        render: (row) => formatDate(row.awarded_at),
      },
    ],
    [],
  );

  if (tableNotFound) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Badges table not configured. Run the badges migration to enable this feature.
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="20px" accent="blue">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Badge awards are processed automatically when users meet criteria. Manual awards can be created below.
        </p>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => setModalOpen(true)}>Award Badge</Button>
      </div>

      <GlassCard padding="0">
        <Table<UserBadgeRow>
          columns={columns}
          data={userBadges}
          loading={loading}
          emptyMessage="No badge awards recorded"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Award Badge">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="User ID"
            type="number"
            value={formUserId}
            onChange={(e) => setFormUserId(e.target.value)}
            placeholder="Enter user ID"
          />
          <Input
            label="Badge ID"
            type="number"
            value={formBadgeId}
            onChange={(e) => setFormBadgeId(e.target.value)}
            placeholder="Enter badge ID"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAwardBadge}
              loading={saving}
              disabled={!formUserId.trim() || !formBadgeId.trim()}
            >
              Award Badge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto-Award Rules Tab                                               */
/* ------------------------------------------------------------------ */

interface AutoAwardRule {
  name: string;
  description: string;
  active: boolean;
}

const AUTO_AWARD_RULES: AutoAwardRule[] = [
  {
    name: 'First Transaction',
    description: 'Award when user completes their first transaction',
    active: true,
  },
  {
    name: 'Round-Up Champion',
    description: 'Award when cumulative round-ups exceed $100',
    active: true,
  },
  {
    name: 'Goal Setter',
    description: 'Award when user creates their first savings goal',
    active: true,
  },
  {
    name: 'Portfolio Builder',
    description: 'Award when portfolio value exceeds $500',
    active: false,
  },
  {
    name: 'Consistent Saver',
    description: 'Award when user has transactions in 3 consecutive months',
    active: false,
  },
];

function AutoAwardRulesContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="20px" accent="purple">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Auto-award rules trigger badge assignments when users meet specific criteria.
          Configure rules to automatically reward user achievements.
        </p>
      </GlassCard>

      {AUTO_AWARD_RULES.map((rule) => (
        <GlassCard key={rule.name} padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {rule.name}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {rule.description}
              </p>
            </div>
            <Badge variant={rule.active ? 'success' : 'warning'}>
              {rule.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </GlassCard>
      ))}

      <GlassCard padding="16px">
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          These rules are display-only for now -- actual automation requires Edge Functions.
        </p>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics Tab                                                      */
/* ------------------------------------------------------------------ */

function AnalyticsContent() {
  const [totalAwarded, setTotalAwarded] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [mostPopularBadgeId, setMostPopularBadgeId] = useState<number | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // Total badges awarded
        const { count: total, error: totalErr } = await supabase
          .from('user_badges')
          .select('*', { count: 'exact', head: true });

        if (totalErr) {
          if (totalErr.code === '42P01' || totalErr.message?.includes('does not exist')) {
            setTableNotFound(true);
            return;
          }
          console.error('Failed to count user badges:', totalErr.message);
          return;
        }

        setTotalAwarded(total ?? 0);

        // Fetch all user_badges for aggregation
        const { data: allAwards, error: awardsErr } = await supabase
          .from('user_badges')
          .select('user_id, badge_id');

        if (awardsErr) {
          console.error('Failed to fetch user badges for analytics:', awardsErr.message);
          return;
        }

        const awards = (allAwards as UserBadgeRow[]) ?? [];

        // Unique users
        const uniqueUserSet = new Set(awards.map((a) => a.user_id));
        setUniqueUsers(uniqueUserSet.size);

        // Group by badge_id and count
        const countMap = new Map<number, number>();
        for (const award of awards) {
          countMap.set(award.badge_id, (countMap.get(award.badge_id) ?? 0) + 1);
        }

        const groups: BadgeCountGroup[] = [];
        let maxCount = 0;
        let maxBadgeId: number | null = null;

        countMap.forEach((count, badgeId) => {
          groups.push({ badge_id: badgeId, count });
          if (count > maxCount) {
            maxCount = count;
            maxBadgeId = badgeId;
          }
        });

        setBadgeCounts(groups.sort((a, b) => b.count - a.count));
        setMostPopularBadgeId(maxBadgeId);
      } catch (err) {
        console.error('Unexpected error fetching badge analytics:', err);
        setTableNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading analytics...
        </p>
      </GlassCard>
    );
  }

  if (tableNotFound) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Badges table not configured. Run the badges migration to enable this feature.
        </p>
      </GlassCard>
    );
  }

  if (totalAwarded === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <KpiCard label="Total Badges Awarded" value="0" accent="purple" />
          <KpiCard label="Unique Users with Badges" value="0" accent="blue" />
          <KpiCard label="Most Popular Badge" value="--" accent="teal" />
        </div>
        <GlassCard padding="28px">
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
            No badge awards recorded yet. Award badges to users to see analytics.
          </p>
        </GlassCard>
      </div>
    );
  }

  const maxBarCount = badgeCounts.length > 0 ? badgeCounts[0].count : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Badges Awarded" value={totalAwarded.toLocaleString()} accent="purple" />
        <KpiCard label="Unique Users with Badges" value={uniqueUsers.toLocaleString()} accent="blue" />
        <KpiCard
          label="Most Popular Badge"
          value={mostPopularBadgeId !== null ? `Badge #${mostPopularBadgeId}` : '--'}
          accent="teal"
        />
      </div>

      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Badges Awarded by Badge ID
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {badgeCounts.map((group) => (
            <div key={group.badge_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '100px', flexShrink: 0 }}>
                Badge #{group.badge_id}
              </span>
              <div style={{ flex: 1, height: '24px', background: 'var(--surface-input)', borderRadius: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(group.count / maxBarCount) * 100}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #3B82F6)',
                    borderRadius: '6px',
                    minWidth: '2px',
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', width: '40px', textAlign: 'right' }}>
                {group.count}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BadgesGamificationTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'definitions', label: 'Badge Definitions', content: <BadgeDefinitionsContent /> },
      { key: 'queue', label: 'Award Queue', content: <AwardQueueContent /> },
      { key: 'rules', label: 'Auto-Award Rules', content: <AutoAwardRulesContent /> },
      { key: 'analytics', label: 'Analytics', content: <AnalyticsContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Tabs tabs={tabs} defaultTab="definitions" />
    </div>
  );
}

export default BadgesGamificationTab;
