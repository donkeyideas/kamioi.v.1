import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Button, Badge } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationType = 'transaction' | 'team' | 'goal' | 'system'
type FilterKey = 'all' | 'unread' | 'transaction' | 'team' | 'goal' | 'system'

interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

const typeDotColors: Record<NotificationType, string> = {
  transaction: '#7C3AED',
  team: '#3B82F6',
  goal: '#06B6D4',
  system: '#FBBF24',
}

const typeBadgeVariant: Record<NotificationType, 'purple' | 'info' | 'success' | 'warning'> = {
  transaction: 'purple',
  team: 'info',
  goal: 'success',
  system: 'warning',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessNotificationsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  /* ---- Fetch ---- */

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    try {
      // Get all member user IDs for this business
      const { data: bizData } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle()

      if (!bizData) {
        // Also try just fetching notifications for the user
        const { data: notifData } = await supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200)

        setNotifications((notifData as Notification[] | null) ?? [])
        setLoading(false)
        return
      }

      // Get notifications for business owner
      const { data: notifData, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setNotifications((notifData as Notification[] | null) ?? [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userLoading) void fetchNotifications()
  }, [fetchNotifications, userLoading])

  /* ---- Derived ---- */

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.read)
      case 'transaction':
        return notifications.filter((n) => n.type === 'transaction')
      case 'team':
        return notifications.filter((n) => n.type === 'team')
      case 'goal':
        return notifications.filter((n) => n.type === 'goal')
      case 'system':
        return notifications.filter((n) => n.type === 'system')
      default:
        return notifications
    }
  }, [notifications, activeFilter])

  /* ---- Actions ---- */

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setMarkingAll(true)
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // fail silently
    } finally {
      setMarkingAll(false)
    }
  }, [userId])

  const markSingleRead = useCallback(async (id: number) => {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)

      if (error) throw error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    } catch {
      // fail silently
    }
  }, [])

  const markSingleUnread = useCallback(async (id: number) => {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: false })
        .eq('id', id)

      if (error) throw error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
      )
    } catch {
      // fail silently
    }
  }, [])

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkMarkRead = useCallback(async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .in('id', ids)

      if (error) throw error
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
      )
      setSelectedIds(new Set())
    } catch {
      // fail silently
    }
  }, [selectedIds])

  /* ---- Filter config ---- */

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'transaction', label: 'Transaction' },
    { key: 'team', label: 'Team' },
    { key: 'goal', label: 'Goal' },
    { key: 'system', label: 'System' },
  ]

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filter bar + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {filters.map((f) => {
          const isActive = activeFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: isActive ? '#A78BFA' : 'var(--text-muted)',
              }}
            >
              {f.label}
              {f.key === 'unread' && unreadCount > 0 && (
                <Badge variant="purple">{unreadCount}</Badge>
              )}
            </button>
          )
        })}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={() => void bulkMarkRead()}>
              Mark Selected Read ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={markingAll}
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '2px solid var(--border-subtle)',
              borderTopColor: '#7C3AED',
              borderRadius: '50%',
              animation: 'biz-notif-spin 600ms linear infinite',
            }}
          />
          <style>{`@keyframes biz-notif-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '240px',
            gap: '16px',
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
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            No notifications
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && filtered.length > 0 && (
        <GlassCard accent="purple" padding="0">
          {filtered.map((n, idx) => {
            const dotColor =
              typeDotColors[n.type as NotificationType] ?? 'var(--text-muted)'
            const badgeVar =
              typeBadgeVariant[n.type as NotificationType] ?? 'default'
            const isUnread = !n.read
            const isSelected = selectedIds.has(n.id)

            return (
              <div key={n.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 24px',
                    cursor: 'pointer',
                    borderLeft: isUnread ? '3px solid #7C3AED' : '3px solid transparent',
                    background: isSelected
                      ? 'rgba(124,58,237,0.1)'
                      : isUnread
                        ? 'var(--surface-hover)'
                        : 'transparent',
                    transition: 'background 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--surface-row-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected
                      ? 'rgba(124,58,237,0.1)'
                      : isUnread
                        ? 'var(--surface-hover)'
                        : 'transparent'
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(n.id)}
                    style={{
                      marginTop: '4px',
                      cursor: 'pointer',
                      accentColor: '#7C3AED',
                    }}
                  />

                  {/* Type dot */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                      marginTop: '4px',
                      boxShadow: `0 0 6px ${dotColor}40`,
                    }}
                  />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: isUnread ? 700 : 500,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {n.title}
                        </span>
                        <Badge variant={badgeVar}>
                          {n.type.charAt(0).toUpperCase() + n.type.slice(1)}
                        </Badge>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {timeAgo(n.created_at)}
                      </span>
                    </div>

                    {/* Message */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 8px',
                        lineHeight: 1.5,
                      }}
                    >
                      {n.message}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void markSingleRead(n.id) }}
                          style={{
                            fontFamily: 'inherit',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                          }}
                        >
                          Mark Read
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void markSingleUnread(n.id) }}
                          style={{
                            fontFamily: 'inherit',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                          }}
                        >
                          Mark Unread
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {idx < filtered.length - 1 && (
                  <div
                    style={{
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, var(--border-subtle), transparent)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </GlassCard>
      )}
    </div>
  )
}
