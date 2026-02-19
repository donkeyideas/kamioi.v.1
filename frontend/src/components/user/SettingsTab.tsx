import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Button, Input } from '@/components/ui'

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

  /* ---- Sign out ---- */

  const [signingOut, setSigningOut] = useState(false)

  /* ---- Load profile data from Supabase ---- */

  useEffect(() => {
    if (!profile) { setProfileLoading(false); return }
    const load = async () => {
      setProfileLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, phone, city, state, zip_code, round_up_amount')
          .eq('id', profile.id)
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
  }, [profile])

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
    if (!profile) return
    setProfileSaving(true)
    setProfileToast(null)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          zip_code: form.zip_code.trim() || null,
        })
        .eq('id', profile.id)

      if (error) throw error
      setProfileToast({ type: 'success', message: 'Profile updated successfully.' })
    } catch {
      setProfileToast({ type: 'error', message: 'Failed to update profile. Please try again.' })
    } finally {
      setProfileSaving(false)
      clearToastAfterDelay(setProfileToast)
    }
  }, [profile, form, clearToastAfterDelay])

  /* ---- Save round-up ---- */

  const saveRoundUp = useCallback(
    async (amount: RoundUpOption) => {
      if (!profile) return
      setRoundUp(amount)
      setRoundUpSaving(true)
      setRoundUpToast(null)
      try {
        const { error } = await supabase
          .from('users')
          .update({ round_up_amount: amount })
          .eq('id', profile.id)

        if (error) throw error
        setRoundUpToast({ type: 'success', message: `Round-up amount set to ${ROUND_UP_LABELS[amount]}.` })
      } catch {
        setRoundUpToast({ type: 'error', message: 'Failed to update round-up amount.' })
      } finally {
        setRoundUpSaving(false)
        clearToastAfterDelay(setRoundUpToast)
      }
    },
    [profile, clearToastAfterDelay],
  )

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
      {/* Section 4: Security                                          */}
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
