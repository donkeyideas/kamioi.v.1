import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Button, Input, Select, Badge } from '@/components/ui'
import { LinkedAccountsCard } from '@/components/common/LinkedAccountsCard'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileForm {
  name: string
  phone: string
  city: string
  state: string
  zip_code: string
}

type RoundUpOption = 0.25 | 0.5 | 1.0 | 2.0

interface Toast {
  type: 'success' | 'error'
  message: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROUND_UP_OPTIONS: RoundUpOption[] = [0.25, 0.5, 1.0, 2.0]

const ROUND_UP_LABELS: Record<RoundUpOption, string> = {
  0.25: '$0.25',
  0.5: '$0.50',
  1.0: '$1.00',
  2.0: '$2.00',
}

/* ------------------------------------------------------------------ */
/*  Toast Banner                                                       */
/* ------------------------------------------------------------------ */

function ToastBanner({ toast }: { toast: Toast }) {
  const isSuccess = toast.type === 'success'
  return (
    <div
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 500,
        marginBottom: '16px',
        background: isSuccess
          ? 'rgba(52,211,153,0.1)'
          : 'rgba(239,68,68,0.1)',
        color: isSuccess ? '#34D399' : '#EF4444',
        border: `1px solid ${isSuccess ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}
    >
      {toast.message}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SettingsTab() {
  const { profile, signOut } = useAuth()
  const { userId, loading: userLoading } = useUserId()
  const navigate = useNavigate()

  /* ---- Profile form ---- */

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    phone: '',
    city: '',
    state: '',
    zip_code: '',
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileToast, setProfileToast] = useState<Toast | null>(null)

  /* ---- Round-up ---- */

  const [roundUp, setRoundUp] = useState<RoundUpOption>(1.0)
  const [roundUpSaving, setRoundUpSaving] = useState(false)
  const [roundUpToast, setRoundUpToast] = useState<Toast | null>(null)

  /* ---- Password ---- */

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordToast, setPasswordToast] = useState<Toast | null>(null)

  /* ---- AI Receipt Provider ---- */

  const [aiProvider, setAiProvider] = useState('deepseek')
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiToast, setAiToast] = useState<Toast | null>(null)

  /* ---- Sign out ---- */

  const [signingOut, setSigningOut] = useState(false)

  /* ---- Load profile data from Supabase ---- */

  useEffect(() => {
    if (userLoading) return
    if (!userId) { setProfileLoading(false); return }
    const load = async () => {
      setProfileLoading(true)
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('name, phone, city, state, zip_code, round_up_amount')
          .eq('id', userId)
          .single()

        if (error) throw error
        if (data) {
          setForm({
            name: data.name ?? '',
            phone: data.phone ?? '',
            city: data.city ?? '',
            state: data.state ?? '',
            zip_code: data.zip_code ?? '',
          })
          const ra = data.round_up_amount as number
          if (ROUND_UP_OPTIONS.includes(ra as RoundUpOption)) {
            setRoundUp(ra as RoundUpOption)
          }
        }
      } catch {
        // fall through — form stays with defaults
      } finally {
        setProfileLoading(false)
      }
    }
    void load()
  }, [userId, userLoading])

  /* ---- Helpers ---- */

  const handleFormChange = useCallback(
    (field: keyof ProfileForm) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
      },
    [],
  )

  const clearToastAfterDelay = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Toast | null>>) => {
      setTimeout(() => setter(null), 4000)
    },
    [],
  )

  /* ---- Save profile ---- */

  const saveProfile = useCallback(async () => {
    if (!userId) return
    setProfileSaving(true)
    setProfileToast(null)
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          zip_code: form.zip_code.trim() || null,
        })
        .eq('id', userId)

      if (error) throw error
      setProfileToast({ type: 'success', message: 'Profile updated successfully.' })
    } catch {
      setProfileToast({ type: 'error', message: 'Failed to update profile. Please try again.' })
    } finally {
      setProfileSaving(false)
      clearToastAfterDelay(setProfileToast)
    }
  }, [userId, form, clearToastAfterDelay])

  /* ---- Save round-up ---- */

  const saveRoundUp = useCallback(
    async (amount: RoundUpOption) => {
      if (!userId) return
      setRoundUp(amount)
      setRoundUpSaving(true)
      setRoundUpToast(null)
      try {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ round_up_amount: amount })
          .eq('id', userId)

        if (error) throw error
        setRoundUpToast({ type: 'success', message: `Round-up amount set to ${ROUND_UP_LABELS[amount]}.` })
      } catch {
        setRoundUpToast({ type: 'error', message: 'Failed to update round-up amount.' })
      } finally {
        setRoundUpSaving(false)
        clearToastAfterDelay(setRoundUpToast)
      }
    },
    [userId, clearToastAfterDelay],
  )

  /* ---- Load AI provider settings ---- */

  useEffect(() => {
    if (!userId) return
    const loadAiSettings = async () => {
      try {
        const { data } = await supabaseAdmin
          .from('user_settings')
          .select('setting_key, setting_value')
          .eq('user_id', userId)
          .in('setting_key', ['ai_vision_provider', 'deepseek_api_key', 'claude_api_key', 'openai_api_key'])

        if (data) {
          for (const row of data) {
            if (row.setting_key === 'ai_vision_provider') setAiProvider(row.setting_value || 'deepseek')
            if (row.setting_key === `${aiProvider}_api_key` && row.setting_value) {
              setUseOwnKey(true)
              setAiApiKey('••••••••••••••••') // masked
            }
          }
        }
      } catch {
        // fall through
      }
    }
    void loadAiSettings()
  }, [userId])

  /* ---- Save AI provider ---- */

  const saveAiProvider = useCallback(async (provider: string) => {
    if (!userId) return
    setAiProvider(provider)
    setAiSaving(true)
    setAiToast(null)
    try {
      // Upsert the provider setting
      const { error } = await supabaseAdmin
        .from('user_settings')
        .upsert({
          user_id: userId,
          setting_key: 'ai_vision_provider',
          setting_value: provider,
        }, { onConflict: 'user_id,setting_key' })

      if (error) throw error
      setAiToast({ type: 'success', message: `AI provider set to ${provider}.` })
    } catch {
      setAiToast({ type: 'error', message: 'Failed to save AI provider.' })
    } finally {
      setAiSaving(false)
      clearToastAfterDelay(setAiToast)
    }
  }, [userId, clearToastAfterDelay])

  const saveAiApiKey = useCallback(async () => {
    if (!userId || !aiApiKey || aiApiKey.startsWith('••')) return
    setAiSaving(true)
    setAiToast(null)
    try {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .upsert({
          user_id: userId,
          setting_key: `${aiProvider}_api_key`,
          setting_value: aiApiKey,
        }, { onConflict: 'user_id,setting_key' })

      if (error) throw error
      setAiApiKey('••••••••••••••••')
      setAiToast({ type: 'success', message: 'API key saved successfully.' })
    } catch {
      setAiToast({ type: 'error', message: 'Failed to save API key.' })
    } finally {
      setAiSaving(false)
      clearToastAfterDelay(setAiToast)
    }
  }, [userId, aiProvider, aiApiKey, clearToastAfterDelay])

  const removeAiApiKey = useCallback(async () => {
    if (!userId) return
    setAiSaving(true)
    try {
      await supabaseAdmin
        .from('user_settings')
        .delete()
        .eq('user_id', userId)
        .eq('setting_key', `${aiProvider}_api_key`)

      setUseOwnKey(false)
      setAiApiKey('')
      setAiToast({ type: 'success', message: 'API key removed. Platform key will be used.' })
    } catch {
      setAiToast({ type: 'error', message: 'Failed to remove API key.' })
    } finally {
      setAiSaving(false)
      clearToastAfterDelay(setAiToast)
    }
  }, [userId, aiProvider, clearToastAfterDelay])

  /* ---- Change password ---- */

  const changePassword = useCallback(async () => {
    setPasswordToast(null)

    if (newPassword.length < 8) {
      setPasswordToast({ type: 'error', message: 'Password must be at least 8 characters.' })
      clearToastAfterDelay(setPasswordToast)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordToast({ type: 'error', message: 'Passwords do not match.' })
      clearToastAfterDelay(setPasswordToast)
      return
    }

    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordToast({ type: 'success', message: 'Password changed successfully.' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch {
      setPasswordToast({ type: 'error', message: 'Failed to change password. Please try again.' })
    } finally {
      setPasswordSaving(false)
      clearToastAfterDelay(setPasswordToast)
    }
  }, [newPassword, confirmPassword, clearToastAfterDelay])

  /* ---- Sign out ---- */

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } catch {
      setSigningOut(false)
    }
  }, [signOut, navigate])

  /* ---- Loading state ---- */

  if (profileLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '24px',
            height: '24px',
            border: '2px solid var(--border-subtle)',
            borderTopColor: '#7C3AED',
            borderRadius: '50%',
            animation: 'settings-spin 600ms linear infinite',
          }}
        />
        <style>{`@keyframes settings-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ---- Render ---- */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        Settings
      </h2>

      {/* ============================================================ */}
      {/* Section 1: Profile                                           */}
      {/* ============================================================ */}
      <GlassCard accent="purple">
        <h3 style={sectionTitleStyle}>Profile</h3>

        {profileToast && <ToastBanner toast={profileToast} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Name"
            value={form.name}
            onChange={handleFormChange('name')}
            placeholder="Your full name"
          />

          <Input
            label="Email"
            value={profile?.email ?? ''}
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={handleFormChange('phone')}
            placeholder="(555) 123-4567"
            type="tel"
          />

          {/* Address row — 3 columns, stacks on mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
            }}
          >
            <Input
              label="City"
              value={form.city}
              onChange={handleFormChange('city')}
              placeholder="City"
            />
            <Input
              label="State"
              value={form.state}
              onChange={handleFormChange('state')}
              placeholder="State"
            />
            <Input
              label="Zip Code"
              value={form.zip_code}
              onChange={handleFormChange('zip_code')}
              placeholder="Zip code"
            />
          </div>

          <div>
            <Button
              variant="primary"
              loading={profileSaving}
              onClick={() => void saveProfile()}
            >
              Save Profile
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ============================================================ */}
      {/* Section 2: Round-Up Settings                                 */}
      {/* ============================================================ */}
      <GlassCard accent="blue">
        <h3 style={sectionTitleStyle}>Round-Up Settings</h3>

        {roundUpToast && <ToastBanner toast={roundUpToast} />}

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            margin: '0 0 16px',
          }}
        >
          Choose how much each purchase is rounded up for investing.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {ROUND_UP_OPTIONS.map((amount) => {
            const isActive = roundUp === amount
            return (
              <button
                key={amount}
                disabled={roundUpSaving}
                onClick={() => void saveRoundUp(amount)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: roundUpSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms ease',
                  background: isActive
                    ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
                    : 'var(--surface-input)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  boxShadow: isActive
                    ? '0 4px 20px rgba(124,58,237,0.3)'
                    : 'none',
                }}
              >
                {ROUND_UP_LABELS[amount]}
              </button>
            )
          })}
        </div>
      </GlassCard>

      {/* ============================================================ */}
      {/* Section 3: Subscription                                      */}
      {/* ============================================================ */}
      <GlassCard accent="teal">
        <h3 style={sectionTitleStyle}>Subscription</h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
            }}
          >
            Current plan:
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#06B6D4',
            }}
          >
            {profile?.subscription_tier ?? 'Free'}
          </span>
        </div>

        <Link
          to="/pricing"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          <Button variant="primary">
            Upgrade Plan
          </Button>
        </Link>
      </GlassCard>

      {/* ============================================================ */}
      {/* Section 4: Linked Bank Accounts                              */}
      {/* ============================================================ */}
      <LinkedAccountsCard />

      {/* ============================================================ */}
      {/* Section 5: AI Receipt Processing                             */}
      {/* ============================================================ */}
      <GlassCard accent="blue">
        <h3 style={sectionTitleStyle}>AI Receipt Processing</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Choose which AI provider to use for extracting data from uploaded receipts.
        </p>

        {aiToast && <ToastBanner toast={aiToast} />}

        {/* Provider Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['deepseek', 'claude', 'openai'].map((p) => (
            <button
              key={p}
              onClick={() => void saveAiProvider(p)}
              disabled={aiSaving}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${aiProvider === p ? 'var(--aurora-purple)' : 'var(--border-subtle)'}`,
                background: aiProvider === p ? 'rgba(124, 58, 237, 0.1)' : 'var(--surface-input)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 200ms ease',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                {p === 'deepseek' ? 'DeepSeek' : p === 'claude' ? 'Claude' : 'OpenAI'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {p === 'deepseek' ? 'Most affordable' : p === 'claude' ? 'Most accurate' : 'Balanced'}
              </div>
              {aiProvider === p && (
                <Badge variant="success" style={{ marginTop: '6px' }}>Active</Badge>
              )}
            </button>
          ))}
        </div>

        {/* BYOK Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={useOwnKey}
              onChange={(e) => {
                setUseOwnKey(e.target.checked)
                if (!e.target.checked) void removeAiApiKey()
              }}
              style={{ width: '16px', height: '16px' }}
            />
            Use my own API key (optional)
          </label>
          <Badge variant="info">BYOK</Badge>
        </div>

        {useOwnKey && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '500px' }}>
            <Input
              label={`${aiProvider === 'deepseek' ? 'DeepSeek' : aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API Key`}
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
              <Button
                variant="primary"
                size="sm"
                loading={aiSaving}
                onClick={() => void saveAiApiKey()}
                disabled={!aiApiKey || aiApiKey.startsWith('••')}
              >
                Save Key
              </Button>
            </div>
          </div>
        )}

        {!useOwnKey && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Using platform API key. Processing costs are tracked in your account balance.
          </p>
        )}
      </GlassCard>

      {/* ============================================================ */}
      {/* Section 6: Security                                          */}
      {/* ============================================================ */}
      <GlassCard accent="pink">
        <h3 style={sectionTitleStyle}>Security</h3>

        {passwordToast && <ToastBanner toast={passwordToast} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!showPasswordForm && (
            <div>
              <Button
                variant="secondary"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </Button>
            </div>
          )}

          {showPasswordForm && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '400px',
              }}
            >
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  loading={passwordSaving}
                  onClick={() => void changePassword()}
                >
                  Update Password
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordToast(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <Button
              variant="danger"
              loading={signingOut}
              onClick={() => void handleSignOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                               */
/* ------------------------------------------------------------------ */

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 16px',
}
