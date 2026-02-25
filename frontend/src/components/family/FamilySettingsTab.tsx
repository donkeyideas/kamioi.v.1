import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Button, Input, Select, Badge } from '@/components/ui'
import { LinkedAccountsCard } from '@/components/common/LinkedAccountsCard'

/* ---- Types ---- */

interface Family {
  id: number
  name: string
  created_by: number
  created_at: string
}

interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  role: string
  status: string
  users: {
    id: number
    name: string
    email: string
  } | null
}

interface UserSetting {
  id: number
  user_id: number
  key: string
  value: string
}

interface Toast {
  type: 'success' | 'error'
  message: string
}

/* ---- Constants ---- */

const ROUND_UP_OPTIONS = [
  { value: '0.25', label: '$0.25' },
  { value: '0.50', label: '$0.50' },
  { value: '1.00', label: '$1.00' },
  { value: '2.00', label: '$2.00' },
]

const NOTIFICATION_PREF_OPTIONS = [
  { value: 'all', label: 'All Notifications' },
  { value: 'important', label: 'Important Only' },
  { value: 'none', label: 'None' },
]

/* ---- Toast Banner ---- */

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

/* ---- Section Title Style ---- */

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 16px',
}

/* ---- Component ---- */

export function FamilySettingsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  // Family name
  const [familyName, setFamilyName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameToast, setNameToast] = useState<Toast | null>(null)

  // Preferences
  const [roundUpAmount, setRoundUpAmount] = useState('1.00')
  const [notifPref, setNotifPref] = useState('all')
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefToast, setPrefToast] = useState<Toast | null>(null)

  /* ---- Clear toast helper ---- */

  const clearToastAfterDelay = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Toast | null>>) => {
      setTimeout(() => setter(null), 4000)
    },
    [],
  )

  /* ---- Data fetching ---- */

  useEffect(() => {
    async function fetchData() {
      if (!userId) { setLoading(false); return }

      const { data: memberRecord } = await supabaseAdmin
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!memberRecord) { setLoading(false); return }

      // Fetch family info
      const { data: familyData } = await supabaseAdmin
        .from('families')
        .select('*')
        .eq('id', memberRecord.family_id)
        .maybeSingle()

      if (familyData) {
        setFamily(familyData as Family)
        setFamilyName(familyData.name ?? '')
      }

      // Fetch members
      const { data: familyMembers } = await supabaseAdmin
        .from('family_members')
        .select('*, users(id, name, email)')
        .eq('family_id', memberRecord.family_id)
        .limit(50)

      setMembers((familyMembers ?? []) as FamilyMember[])

      // Fetch user settings for preferences
      const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .limit(20)

      const settingsData = (settings ?? []) as UserSetting[]
      for (const s of settingsData) {
        if (s.key === 'family_round_up') setRoundUpAmount(s.value)
        if (s.key === 'family_notifications') setNotifPref(s.value)
      }

      setLoading(false)
    }
    if (!userLoading) fetchData()
  }, [userId, userLoading])

  /* ---- Save family name ---- */

  const saveFamilyName = useCallback(async () => {
    if (!family) return
    setNameSaving(true)
    setNameToast(null)

    try {
      const trimmed = familyName.trim()
      if (!trimmed) {
        setNameToast({ type: 'error', message: 'Family name cannot be empty.' })
        clearToastAfterDelay(setNameToast)
        setNameSaving(false)
        return
      }

      const { error } = await supabaseAdmin
        .from('families')
        .update({ name: trimmed })
        .eq('id', family.id)

      if (error) throw error
      setNameToast({ type: 'success', message: 'Family name updated successfully.' })
    } catch {
      setNameToast({ type: 'error', message: 'Failed to update family name. Please try again.' })
    } finally {
      setNameSaving(false)
      clearToastAfterDelay(setNameToast)
    }
  }, [family, familyName, clearToastAfterDelay])

  /* ---- Save preferences ---- */

  const savePreferences = useCallback(async () => {
    if (!userId) return
    setPrefSaving(true)
    setPrefToast(null)

    try {
      // Upsert round-up setting
      const { error: ruError } = await supabaseAdmin
        .from('user_settings')
        .upsert(
          { user_id: userId, key: 'family_round_up', value: roundUpAmount },
          { onConflict: 'user_id,key' },
        )
      if (ruError) throw ruError

      // Upsert notification setting
      const { error: nError } = await supabaseAdmin
        .from('user_settings')
        .upsert(
          { user_id: userId, key: 'family_notifications', value: notifPref },
          { onConflict: 'user_id,key' },
        )
      if (nError) throw nError

      setPrefToast({ type: 'success', message: 'Preferences saved successfully.' })
    } catch {
      setPrefToast({ type: 'error', message: 'Failed to save preferences. Please try again.' })
    } finally {
      setPrefSaving(false)
      clearToastAfterDelay(setPrefToast)
    }
  }, [userId, roundUpAmount, notifPref, clearToastAfterDelay])

  /* ---- Loading state ---- */

  if (loading) {
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
            animation: 'family-settings-spin 600ms linear infinite',
          }}
        />
        <style>{`@keyframes family-settings-spin { to { transform: rotate(360deg); } }`}</style>
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
        Family Settings
      </h2>

      {/* Section 1: Family Name */}
      <GlassCard accent="purple">
        <h3 style={sectionTitleStyle}>Family Name</h3>

        {nameToast && <ToastBanner toast={nameToast} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Family Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Enter family name"
          />
          <div>
            <Button
              variant="primary"
              loading={nameSaving}
              onClick={() => void saveFamilyName()}
            >
              Save Name
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Section 2: Family Preferences */}
      <GlassCard accent="blue">
        <h3 style={sectionTitleStyle}>Family Preferences</h3>

        {prefToast && <ToastBanner toast={prefToast} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Default Round-Up Amount"
            options={ROUND_UP_OPTIONS}
            value={roundUpAmount}
            onChange={(e) => setRoundUpAmount(e.target.value)}
          />

          <Select
            label="Notification Preferences"
            options={NOTIFICATION_PREF_OPTIONS}
            value={notifPref}
            onChange={(e) => setNotifPref(e.target.value)}
          />

          <div>
            <Button
              variant="primary"
              loading={prefSaving}
              onClick={() => void savePreferences()}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Section 3: Linked Bank Accounts */}
      <LinkedAccountsCard />

      {/* Section 4: Member Permissions Overview */}
      <GlassCard accent="teal">
        <h3 style={sectionTitleStyle}>Member Permissions</h3>

        {members.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            No family members found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map((m) => {
              const roleBadgeVariant: Record<string, 'purple' | 'info' | 'default'> = {
                parent: 'purple',
                child: 'info',
                member: 'default',
              }

              const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error'> = {
                active: 'success',
                pending: 'warning',
                inactive: 'error',
              }

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--surface-input)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-divider)',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.users?.name ?? 'Unknown'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {m.users?.email ?? '--'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Badge variant={roleBadgeVariant[m.role] ?? 'default'}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Badge>
                    <Badge variant={statusBadgeVariant[m.status] ?? 'default'}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
