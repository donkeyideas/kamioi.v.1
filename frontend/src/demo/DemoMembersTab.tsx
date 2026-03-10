import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import type { DemoMember } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

export function DemoMembersTab({
  members,
  type,
}: {
  members: DemoMember[]
  type: 'family' | 'business'
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [toast, setToast] = useState('')

  const totalRoundUps = members.reduce((s, m) => s + m.round_ups_total, 0)
  const totalTx = members.reduce((s, m) => s + m.transactions_count, 0)

  const handleInvite = () => {
    if (!inviteEmail) return
    setToast(`Invite sent to ${inviteEmail}! (Demo)`)
    setInviteEmail('')
    setShowInvite(false)
    setTimeout(() => setToast(''), 3000)
  }

  const columns: Column<DemoMember>[] = [
    {
      key: 'name',
      header: 'Name',
      render: r => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '12px', fontWeight: 700,
          }}>
            {r.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: r => <Badge variant={r.role.includes('Head') || r.role.includes('CEO') ? 'info' : 'success'}>{r.role}</Badge>,
    },
    {
      key: 'round_ups_total',
      header: 'Total Round-Ups',
      align: 'right' as const,
      render: r => <span style={{ fontWeight: 600, color: '#7C3AED' }}>{fmt(r.round_ups_total)}</span>,
    },
    {
      key: 'transactions_count',
      header: 'Transactions',
      align: 'right' as const,
      render: r => <span>{r.transactions_count}</span>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: r => <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(r.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>,
    },
  ]

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label={`${type === 'family' ? 'Family' : 'Team'} Members`} value={members.length} accent="purple" />
        <KpiCard label="Combined Round-Ups" value={fmt(totalRoundUps)} accent="blue" />
        <KpiCard label="Total Transactions" value={totalTx} accent="teal" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {type === 'family' ? 'Family Members' : 'Team Members'}
        </h2>
        <Button variant="primary" size="sm" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Cancel' : `+ Invite ${type === 'family' ? 'Member' : 'Employee'}`}
        </Button>
      </div>

      {showInvite && (
        <GlassCard accent="purple" padding="20px">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', opacity: 0.8 }}>Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--surface-input)',
                  border: '1px solid var(--color-border-subtle)', borderRadius: '10px',
                  color: 'inherit', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleInvite}>Send Invite</Button>
          </div>
        </GlassCard>
      )}

      <GlassCard accent="blue" padding="24px">
        <Table<DemoMember> columns={columns} data={members} loading={false} emptyMessage="No members yet" pageSize={10} />
      </GlassCard>
    </div>
  )
}
