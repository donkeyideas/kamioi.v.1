import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'

type DemoProfile = {
  name: string
  email: string
  phone: string
  city: string
  state: string
  roundUpAmount: number
  plan: string
}

const roundUpPresets = [1, 2, 3, 4]

export function DemoSettingsTab({ profile: initial, onRoundUpChange }: { profile: DemoProfile; onRoundUpChange?: (amount: number) => void }) {
  const [profile, setProfile] = useState(initial)
  const [toast, setToast] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSave = () => showToast('Settings saved! (Demo)')

  const selectRoundUp = (amt: number) => {
    setProfile(p => ({ ...p, roundUpAmount: amt }))
    setShowCustom(false)
    onRoundUpChange?.(amt)
    showToast(`Round-up set to $${amt}! (Demo)`)
  }

  const handleCustomSubmit = () => {
    const val = parseInt(customAmount, 10)
    if (!val || val < 1 || val > 100) {
      showToast('Enter a whole number between 1 and 100')
      return
    }
    selectRoundUp(val)
    setCustomAmount('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--surface-input)',
    border: '1px solid var(--color-border-subtle)', borderRadius: '10px',
    color: 'inherit', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', opacity: 0.8,
  }

  const isPreset = roundUpPresets.includes(profile.roundUpAmount)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
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

      {/* Profile */}
      <GlassCard accent="purple" padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={{ ...inputStyle, opacity: 0.6 }} value={profile.email} disabled />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <Button variant="primary" size="sm" onClick={handleSave}>Save Profile</Button>
        </div>
      </GlassCard>

      {/* Round-Up Settings */}
      <GlassCard accent="blue" padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Round-Up Amount</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {roundUpPresets.map(amt => (
            <button
              key={amt}
              onClick={() => selectRoundUp(amt)}
              style={{
                padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: profile.roundUpAmount === amt && !showCustom
                  ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
                  : 'var(--surface-input)',
                color: profile.roundUpAmount === amt && !showCustom ? '#fff' : 'var(--text-secondary)',
              }}
            >
              ${amt}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            style={{
              padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: (showCustom || (!isPreset && profile.roundUpAmount > 0))
                ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
                : 'var(--surface-input)',
              color: (showCustom || (!isPreset && profile.roundUpAmount > 0)) ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Custom
          </button>
        </div>
        {showCustom && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>$</span>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
              style={{ ...inputStyle, width: '120px' }}
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={handleCustomSubmit}>Set</Button>
          </div>
        )}
        {!isPreset && profile.roundUpAmount > 0 && !showCustom && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Custom amount: <span style={{ color: '#A78BFA', fontWeight: 600 }}>${profile.roundUpAmount}</span>
          </p>
        )}
      </GlassCard>

      {/* Subscription */}
      <GlassCard accent="teal" padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Subscription</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#06B6D4' }}>{profile.plan}</span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Your current plan</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => showToast('Upgrade unavailable in demo')}>Upgrade</Button>
        </div>
      </GlassCard>

      {/* Security */}
      <GlassCard accent="purple" padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Security</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => showToast('Password change unavailable in demo')}>Change Password</Button>
          <Button variant="secondary" size="sm" onClick={() => showToast('2FA setup unavailable in demo')}>Enable 2FA</Button>
        </div>
      </GlassCard>
    </div>
  )
}
