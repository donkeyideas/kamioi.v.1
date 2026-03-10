import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { demoNotifications, type DemoNotification } from './demoData'

const typeColors: Record<string, string> = {
  success: '#34D399',
  info: '#3B82F6',
  warning: '#F59E0B',
}

export function DemoNotificationsTab() {
  const [notifications, setNotifications] = useState<DemoNotification[]>(demoNotifications)

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const toggleRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Notifications {unreadCount > 0 && <Badge variant="info">{unreadCount} new</Badge>}
        </h2>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notifications.map(n => (
          <GlassCard key={n.id} accent={n.read ? undefined : 'blue'} padding="16px">
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', opacity: n.read ? 0.7 : 1 }}
              onClick={() => toggleRead(n.id)}
            >
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                background: n.read ? 'var(--border-divider)' : typeColors[n.type],
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{n.message}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
