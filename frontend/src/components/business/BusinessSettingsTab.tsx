import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { GlassCard, Button, Input, Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Business {
  id: number
  name: string
  industry: string | null
  logo_url: string | null
}

type RoundUpOption = 0.25 | 0.5 | 1.0 | 2.0

interface Toast {
  type: 'success' | 'error'
  message: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INDUSTRY_OPTIONS: SelectOption[] = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
]

const ROUND_UP_OPTIONS: RoundUpOption[] = [0.25, 0.5, 1.0, 2.0]

const ROUND_UP_LABELS: Record<RoundUpOption, string> = {
  0.25: '$0.25',
  0.5: '$0.50',
  1.0: '$1.00',
  2.0: '$2.00',
}

const DEFAULT_DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Design', 'Product']

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 16px',
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
        background: isSuccess ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
        color: isSuccess ? '#34D399' : '#EF4444',
        border: `1px solid ${isSuccess ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}
    >
      {toast.message}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading spinner                                                    */
/* ------------------------------------------------------------------ */

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
          animation: 'biz-settings-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-settings-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessSettingsTab() {
  const { profile } = useAuth()

  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  // Company profile form
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileToast, setProfileToast] = useState<Toast | null>(null)

  // Round-up settings
  const [roundUp, setRoundUp] = useState<RoundUpOption>(1.0)
  const [roundUpSaving, setRoundUpSaving] = useState(false)
  const [roundUpToast, setRoundUpToast] = useState<Toast | null>(null)

  // Notification preferences
  const [notifyTransactions, setNotifyTransactions] = useState(true)
  const [notifyTeam, setNotifyTeam] = useState(true)
  const [notifyGoals, setNotifyGoals] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifToast, setNotifToast] = useState<Toast | null>(null)

  // Department management
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS)
  const [newDept, setNewDept] = useState('')
  const [deptToast, setDeptToast] = useState<Toast | null>(null)

  /* ---- Fetch ---- */

  const fetchData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('created_by', profile.id)
        .limit(1)
        .single()

      if (bizData) {
        const biz = bizData as Business
        setBusiness(biz)
        setCompanyName(biz.name)
        setIndustry(biz.industry ?? '')
        setLogoUrl(biz.logo_url ?? '')
      }

      // Fetch user settings for notification prefs and round-up
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('key, value')
        .eq('user_id', profile.id)

      if (settingsData) {
        for (const s of settingsData) {
          if (s.key === 'biz_round_up') {
            const val = parseFloat(s.value)
            if (ROUND_UP_OPTIONS.includes(val as RoundUpOption)) setRoundUp(val as RoundUpOption)
          }
          if (s.key === 'notify_transactions') setNotifyTransactions(s.value === 'true')
          if (s.key === 'notify_team') setNotifyTeam(s.value === 'true')
          if (s.key === 'notify_goals') setNotifyGoals(s.value === 'true')
          if (s.key === 'biz_departments') {
            try {
              const parsed = JSON.parse(s.value) as string[]
              if (Array.isArray(parsed) && parsed.length > 0) setDepartments(parsed)
            } catch { /* use defaults */ }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* ---- Helpers ---- */

  const clearToastAfterDelay = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Toast | null>>) => {
      setTimeout(() => setter(null), 4000)
    },
    [],
  )

  /* ---- Save company profile ---- */

  const saveProfile = async () => {
    if (!business) return
    setProfileSaving(true)
    setProfileToast(null)

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: companyName.trim(),
          industry: industry || null,
          logo_url: logoUrl.trim() || null,
        })
        .eq('id', business.id)

      if (error) throw error
      setProfileToast({ type: 'success', message: 'Company profile updated successfully.' })
    } catch {
      setProfileToast({ type: 'error', message: 'Failed to update company profile.' })
    } finally {
      setProfileSaving(false)
      clearToastAfterDelay(setProfileToast)
    }
  }

  /* ---- Save round-up ---- */

  const saveRoundUp = async (amount: RoundUpOption) => {
    if (!profile?.id) return
    setRoundUp(amount)
    setRoundUpSaving(true)
    setRoundUpToast(null)

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: profile.id, key: 'biz_round_up', value: String(amount) })

      if (error) throw error
      setRoundUpToast({ type: 'success', message: `Company round-up set to ${ROUND_UP_LABELS[amount]}.` })
    } catch {
      setRoundUpToast({ type: 'error', message: 'Failed to update round-up setting.' })
    } finally {
      setRoundUpSaving(false)
      clearToastAfterDelay(setRoundUpToast)
    }
  }

  /* ---- Save notification prefs ---- */

  const saveNotifications = async () => {
    if (!profile?.id) return
    setNotifSaving(true)
    setNotifToast(null)

    try {
      const updates = [
        { user_id: profile.id, key: 'notify_transactions', value: String(notifyTransactions) },
        { user_id: profile.id, key: 'notify_team', value: String(notifyTeam) },
        { user_id: profile.id, key: 'notify_goals', value: String(notifyGoals) },
      ]

      const { error } = await supabase.from('user_settings').upsert(updates)
      if (error) throw error
      setNotifToast({ type: 'success', message: 'Notification preferences saved.' })
    } catch {
      setNotifToast({ type: 'error', message: 'Failed to save notification preferences.' })
    } finally {
      setNotifSaving(false)
      clearToastAfterDelay(setNotifToast)
    }
  }

  /* ---- Department management ---- */

  const addDepartment = async () => {
    const trimmed = newDept.trim()
    if (!trimmed || !profile?.id) return
    if (departments.includes(trimmed)) {
      setDeptToast({ type: 'error', message: 'Department already exists.' })
      clearToastAfterDelay(setDeptToast)
      return
    }

    const updated = [...departments, trimmed]
    setDepartments(updated)
    setNewDept('')

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: profile.id, key: 'biz_departments', value: JSON.stringify(updated) })

      if (error) throw error
      setDeptToast({ type: 'success', message: `${trimmed} added.` })
    } catch {
      setDeptToast({ type: 'error', message: 'Failed to save department.' })
    }
    clearToastAfterDelay(setDeptToast)
  }

  const removeDepartment = async (dept: string) => {
    if (!profile?.id) return
    const updated = departments.filter((d) => d !== dept)
    setDepartments(updated)

    try {
      await supabase
        .from('user_settings')
        .upsert({ user_id: profile.id, key: 'biz_departments', value: JSON.stringify(updated) })
    } catch {
      // silently fail - department already removed from local state
    }
  }

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Settings
      </h2>

      {/* ======================================================== */}
      {/* Company Profile                                           */}
      {/* ======================================================== */}
      <GlassCard accent="purple">
        <h3 style={sectionTitleStyle}>Company Profile</h3>

        {profileToast && <ToastBanner toast={profileToast} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company name"
          />
          <Select
            label="Industry"
            options={INDUSTRY_OPTIONS}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Select industry"
          />
          <Input
            label="Logo URL"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          <div>
            <Button variant="primary" loading={profileSaving} onClick={() => void saveProfile()}>
              Save Profile
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ======================================================== */}
      {/* Round-Up Settings                                         */}
      {/* ======================================================== */}
      <GlassCard accent="blue">
        <h3 style={sectionTitleStyle}>Round-Up Settings</h3>

        {roundUpToast && <ToastBanner toast={roundUpToast} />}

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Set the default round-up amount for all company transactions.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  boxShadow: isActive ? '0 4px 20px rgba(124,58,237,0.3)' : 'none',
                }}
              >
                {ROUND_UP_LABELS[amount]}
              </button>
            )
          })}
        </div>
      </GlassCard>

      {/* ======================================================== */}
      {/* Notification Preferences                                  */}
      {/* ======================================================== */}
      <GlassCard accent="teal">
        <h3 style={sectionTitleStyle}>Notification Preferences</h3>

        {notifToast && <ToastBanner toast={notifToast} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <ToggleRow
            label="Transaction alerts"
            description="Get notified when team members make transactions"
            checked={notifyTransactions}
            onChange={setNotifyTransactions}
          />
          <ToggleRow
            label="Team updates"
            description="Notifications when team members join or change roles"
            checked={notifyTeam}
            onChange={setNotifyTeam}
          />
          <ToggleRow
            label="Goal milestones"
            description="Alerts when company goals reach milestones"
            checked={notifyGoals}
            onChange={setNotifyGoals}
          />

          <div style={{ marginTop: '8px' }}>
            <Button variant="primary" loading={notifSaving} onClick={() => void saveNotifications()}>
              Save Preferences
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ======================================================== */}
      {/* Department Management                                     */}
      {/* ======================================================== */}
      <GlassCard accent="pink">
        <h3 style={sectionTitleStyle}>Department Management</h3>

        {deptToast && <ToastBanner toast={deptToast} />}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', maxWidth: '320px' }}>
            <Input
              placeholder="New department name"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addDepartment()
                }
              }}
            />
          </div>
          <Button variant="primary" size="md" onClick={() => void addDepartment()}>
            Add
          </Button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {departments.map((dept) => (
            <div
              key={dept}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            >
              {dept}
              <button
                type="button"
                onClick={() => void removeDepartment(dept)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  padding: 0,
                  lineHeight: 1,
                  transition: 'all 200ms ease',
                }}
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>

        {departments.length === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '16px 0 0' }}>
            No departments configured.
          </p>
        )}
      </GlassCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Toggle row sub-component                                           */
/* ------------------------------------------------------------------ */

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        background: 'var(--surface-input)',
        borderRadius: '10px',
        border: '1px solid var(--border-divider)',
      }}
    >
      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          background: checked
            ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
            : 'var(--border-subtle)',
          transition: 'background 200ms ease',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#FFFFFF',
            transition: 'left 200ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}
