import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Button, Badge } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationType = 'info' | 'success' | 'warning' | 'error'
type FilterKey = 'all' | 'unread' | 'info' | 'success' | 'warning'

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
/*  Utilities                                                          */
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
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

const typeDotColors: Record<NotificationType, string> = {
  info: '#3B82F6',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#EF4444',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NotificationsTab() {
  const { profile } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  /* ---- Fetch ---- */

  const fetchNotifications = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications((data as Notification[]) ?? [])
    } catch {
      // Silently handle — empty list shown
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  /* ---- Derived data ---- */

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.read)
      case 'info':
        return notifications.filter((n) => n.type === 'info')
      case 'success':
        return notifications.filter((n) => n.type === 'success')
      case 'warning':
        return notifications.filter((n) => n.type === 'warning')
      default:
        return notifications
    }
  }, [notifications, activeFilter])

  /* ---- Actions ---- */

  const markAllRead = useCallback(async () => {
    if (!profile) return
    setMarkingAll(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false)

      if (error) throw error
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // fail silently
    } finally {
      setMarkingAll(false)
    }
  }, [profile])

  const markSingleRead = useCallback(async (id: number) => {
    try {
      const { error } = await supabase
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

  /* ---- Filter config ---- */

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'info', label: 'Info' },
    { key: 'success', label: 'Success' },
    { key: 'warning', label: 'Warning' },
  ]

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#F8FAFC',
            margin: 0,
          }}
        >
          Notifications
        </h2>
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

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
        }}
      >
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
                background: isActive
                  ? 'rgba(124,58,237,0.15)'
                  : 'transparent',
                color: isActive
                  ? '#A78BFA'
                  : 'rgba(248,250,252,0.5)',
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

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#7C3AED',
              borderRadius: '50%',
              animation: 'notif-spin 600ms linear infinite',
            }}
          />
          <style>{`@keyframes notif-spin { to { transform: rotate(360deg); } }`}</style>
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
            stroke="rgba(248,250,252,0.2)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p
            style={{
              color: 'rgba(248,250,252,0.35)',
              fontSize: '14px',
              margin: 0,
            }}
          >
            No notifications
          </p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((n) => {
            const dotColor =
              typeDotColors[n.type as NotificationType] ?? 'rgba(248,250,252,0.3)'
            const isUnread = !n.read

            return (
              <GlassCard
                key={n.id}
                padding="16px 20px"
                onClick={() => {
                  if (isUnread) void markSingleRead(n.id)
                }}
                style={{
                  cursor: isUnread ? 'pointer' : 'default',
                  background: isUnread
                    ? 'rgba(15,11,26,0.63)'
                    : 'rgba(15,11,26,0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                  }}
                >
                  {/* Type dot */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                      marginTop: '5px',
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
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#F8FAFC',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'rgba(248,250,252,0.35)',
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
                        fontSize: '14px',
                        color: 'rgba(248,250,252,0.55)',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.message}
                    </p>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
