import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Select } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AdminSettingRow = Database['public']['Tables']['admin_settings']['Row'];
type SystemEventRow = Database['public']['Tables']['system_events']['Row'];
type ApiBalanceRow = Database['public']['Tables']['api_balance']['Row'];

interface SettingDraft {
  id: number;
  setting_key: string;
  setting_value: string;
  setting_type: string | null;
  description: string | null;
  original_value: string;
}

interface SopSection {
  title: string;
  procedures: { name: string; description: string }[];
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

function truncate(str: string | null, maxLen: number): string {
  if (!str) return '--';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function settingTypeBadgeVariant(
  type: string | null,
): 'info' | 'purple' | 'warning' | 'default' {
  switch (type) {
    case 'string':
      return 'info';
    case 'number':
      return 'purple';
    case 'boolean':
      return 'warning';
    default:
      return 'default';
  }
}

/* ------------------------------------------------------------------ */
/*  Toggle Component                                                   */
/* ------------------------------------------------------------------ */

function Toggle({
  active,
  onToggle,
  disabled = false,
}: {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      onClick={disabled ? undefined : onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: active
          ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
          : 'var(--surface-hover)',
        transition: 'background 200ms ease',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: active ? '22px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#F8FAFC',
          transition: 'left 200ms ease',
        }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared hook: fetch admin_settings                                  */
/* ------------------------------------------------------------------ */

function useAdminSettings(filterType?: string) {
  const [settings, setSettings] = useState<AdminSettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      let query = supabaseAdmin
        .from('admin_settings')
        .select('*')
        .order('setting_key', { ascending: true })
        .limit(500);

      if (filterType) {
        query = query.eq('setting_type', filterType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch admin settings:', error.message);
        setSettings([]);
        return;
      }

      setSettings(data ?? []);
    } catch (err) {
      console.error('Unexpected error fetching admin settings:', err);
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

/* ------------------------------------------------------------------ */
/*  Settings tab                                                       */
/* ------------------------------------------------------------------ */

const SECURITY_OPTIONS: SelectOption[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const BACKUP_OPTIONS: SelectOption[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function SettingsContent() {
  const { settings, loading, refetch } = useAdminSettings();
  const [drafts, setDrafts] = useState<SettingDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(
      settings.map((s) => ({
        id: s.id,
        setting_key: s.setting_key,
        setting_value: s.setting_value,
        setting_type: s.setting_type,
        description: s.description,
        original_value: s.setting_value,
      })),
    );
  }, [settings]);

  function updateDraft(id: number, value: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, setting_value: value } : d)),
    );
  }

  function toggleBooleanDraft(id: number) {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const current = d.setting_value.toLowerCase();
        return { ...d, setting_value: current === 'true' ? 'false' : 'true' };
      }),
    );
  }

  const hasChanges = drafts.some((d) => d.setting_value !== d.original_value);

  async function handleSave() {
    setSaving(true);
    try {
      const changed = drafts.filter((d) => d.setting_value !== d.original_value);
      for (const draft of changed) {
        const { error } = await supabaseAdmin
          .from('admin_settings')
          .update({ setting_value: draft.setting_value })
          .eq('id', draft.id);

        if (error) {
          console.error(`Failed to update setting ${draft.setting_key}:`, error.message);
        }
      }
      await refetch();
    } catch (err) {
      console.error('Unexpected error saving settings:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading settings...
        </p>
      </GlassCard>
    );
  }

  if (settings.length === 0) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          No system settings configured. Add settings via Supabase dashboard.
        </p>
      </GlassCard>
    );
  }

  function renderSettingControl(draft: SettingDraft) {
    const key = draft.setting_key.toLowerCase();

    // Toggle-style buttons
    if (key === 'maintenance_mode' || key === 'registration_enabled') {
      const isOn = draft.setting_value.toLowerCase() === 'true';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Toggle active={isOn} onToggle={() => toggleBooleanDraft(draft.id)} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isOn ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    }

    // Number inputs
    if (key === 'api_rate_limit' || key === 'max_users') {
      return (
        <Input
          type="number"
          value={draft.setting_value}
          onChange={(e) => updateDraft(draft.id, e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      );
    }

    // Select inputs
    if (key === 'security_level') {
      return (
        <Select
          options={SECURITY_OPTIONS}
          value={draft.setting_value.toLowerCase()}
          onChange={(e) => updateDraft(draft.id, e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      );
    }

    if (key === 'backup_frequency') {
      return (
        <Select
          options={BACKUP_OPTIONS}
          value={draft.setting_value.toLowerCase()}
          onChange={(e) => updateDraft(draft.id, e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      );
    }

    // Default: text input
    return (
      <Input
        value={draft.setting_value}
        onChange={(e) => updateDraft(draft.id, e.target.value)}
        style={{ maxWidth: '300px' }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '14px 0',
                borderBottom: '1px solid var(--border-divider)',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {draft.setting_key}
                  </p>
                  <Badge variant={settingTypeBadgeVariant(draft.setting_type)}>
                    {draft.setting_type ?? 'unknown'}
                  </Badge>
                </div>
                {draft.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {draft.description}
                  </p>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {renderSettingControl(draft)}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Business Info tab                                                  */
/* ------------------------------------------------------------------ */

const BUSINESS_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'support_email', label: 'Support Email' },
  { key: 'website_url', label: 'Website URL' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'description', label: 'Description' },
];

function BusinessInfoContent() {
  const { settings, loading, refetch } = useAdminSettings('business');
  const [formValues, setFormValues] = useState<Record<string, { id: number | null; value: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const values: Record<string, { id: number | null; value: string }> = {};
    for (const field of BUSINESS_FIELDS) {
      const match = settings.find((s) => s.setting_key === field.key);
      values[field.key] = {
        id: match?.id ?? null,
        value: match?.setting_value ?? '',
      };
    }
    setFormValues(values);
  }, [settings]);

  function updateField(key: string, value: string) {
    setFormValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const [key, entry] of Object.entries(formValues)) {
        if (entry.id !== null) {
          const { error } = await supabaseAdmin
            .from('admin_settings')
            .update({ setting_value: entry.value })
            .eq('id', entry.id);

          if (error) {
            console.error(`Failed to update ${key}:`, error.message);
          }
        }
      }
      await refetch();
    } catch (err) {
      console.error('Unexpected error saving business info:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading business info...
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Business Information
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {BUSINESS_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              value={formValues[field.key]?.value ?? ''}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          ))}
        </div>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Access Controls tab                                                */
/* ------------------------------------------------------------------ */

const ACCOUNT_TYPE_OPTIONS = ['Individual', 'Family', 'Business'];

function AccessControlsContent() {
  const { settings, loading, refetch } = useAdminSettings();
  const [saving, setSaving] = useState(false);

  // Derive toggle states from settings
  const getSettingValue = useCallback(
    (key: string): string => {
      const match = settings.find((s) => s.setting_key === key);
      return match?.setting_value ?? 'false';
    },
    [settings],
  );

  const getSettingId = useCallback(
    (key: string): number | null => {
      const match = settings.find((s) => s.setting_key === key);
      return match?.id ?? null;
    },
    [settings],
  );

  const signinEnabled = getSettingValue('signin_enabled').toLowerCase() === 'true';
  const signupEnabled = getSettingValue('signup_enabled').toLowerCase() === 'true';
  const demoMode = getSettingValue('demo_mode').toLowerCase() === 'true';
  const allowedAccountTypesRaw = getSettingValue('allowed_account_types');

  const [localAllowedTypes, setLocalAllowedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (allowedAccountTypesRaw && allowedAccountTypesRaw !== 'false') {
      try {
        const parsed = JSON.parse(allowedAccountTypesRaw);
        if (Array.isArray(parsed)) {
          setLocalAllowedTypes(parsed as string[]);
          return;
        }
      } catch {
        // If not JSON, try comma-separated
        setLocalAllowedTypes(
          allowedAccountTypesRaw.split(',').map((s: string) => s.trim()).filter(Boolean),
        );
        return;
      }
    }
    setLocalAllowedTypes([]);
  }, [allowedAccountTypesRaw]);

  async function toggleSetting(key: string, currentValue: boolean) {
    const id = getSettingId(key);
    if (id === null) return;

    setSaving(true);
    try {
      const { error } = await supabaseAdmin
        .from('admin_settings')
        .update({ setting_value: currentValue ? 'false' : 'true' })
        .eq('id', id);

      if (error) {
        console.error(`Failed to toggle ${key}:`, error.message);
        return;
      }
      await refetch();
    } catch (err) {
      console.error(`Unexpected error toggling ${key}:`, err);
    } finally {
      setSaving(false);
    }
  }

  function toggleAccountType(type: string) {
    const lower = type.toLowerCase();
    setLocalAllowedTypes((prev) =>
      prev.includes(lower) ? prev.filter((t) => t !== lower) : [...prev, lower],
    );
  }

  async function saveAllowedTypes() {
    const id = getSettingId('allowed_account_types');
    if (id === null) return;

    setSaving(true);
    try {
      const { error } = await supabaseAdmin
        .from('admin_settings')
        .update({ setting_value: JSON.stringify(localAllowedTypes) })
        .eq('id', id);

      if (error) {
        console.error('Failed to save allowed account types:', error.message);
        return;
      }
      await refetch();
    } catch (err) {
      console.error('Unexpected error saving allowed account types:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading access controls...
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Authentication Controls
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Sign-In Enabled</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Allow users to sign in to the platform</p>
            </div>
            <Toggle
              active={signinEnabled}
              onToggle={() => toggleSetting('signin_enabled', signinEnabled)}
              disabled={saving}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-divider)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Sign-Up Enabled</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Allow new user registrations</p>
            </div>
            <Toggle
              active={signupEnabled}
              onToggle={() => toggleSetting('signup_enabled', signupEnabled)}
              disabled={saving}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-divider)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Demo Mode</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enable demo mode with sample data</p>
            </div>
            <Toggle
              active={demoMode}
              onToggle={() => toggleSetting('demo_mode', demoMode)}
              disabled={saving}
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Allowed Account Types
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ACCOUNT_TYPE_OPTIONS.map((type) => {
            const isChecked = localAllowedTypes.includes(type.toLowerCase());
            return (
              <label
                key={type}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              >
                <span
                  onClick={() => toggleAccountType(type)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: isChecked
                      ? '2px solid #7C3AED'
                      : '2px solid var(--highlight-line)',
                    background: isChecked ? 'rgba(124,58,237,0.2)' : 'transparent',
                    transition: 'all 200ms ease',
                    cursor: 'pointer',
                  }}
                >
                  {isChecked && (
                    <span style={{ color: '#7C3AED', fontSize: '14px', lineHeight: 1 }}>
                      &#x2713;
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{type}</span>
              </label>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Button size="sm" onClick={saveAllowedTypes} loading={saving}>
            Save Account Types
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2FA Management tab                                                 */
/* ------------------------------------------------------------------ */

function TwoFAManagementContent() {
  const { settings, loading, refetch } = useAdminSettings();
  const [saving, setSaving] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const twoFaSetting = settings.find((s) => s.setting_key === '2fa_enabled');
  const is2FAEnabled = twoFaSetting?.setting_value?.toLowerCase() === 'true';

  async function toggle2FA() {
    if (!twoFaSetting) return;
    setSaving(true);
    try {
      const { error } = await supabaseAdmin
        .from('admin_settings')
        .update({ setting_value: is2FAEnabled ? 'false' : 'true' })
        .eq('id', twoFaSetting.id);

      if (error) {
        console.error('Failed to toggle 2FA:', error.message);
        return;
      }
      await refetch();
    } catch (err) {
      console.error('Unexpected error toggling 2FA:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleVerify() {
    setVerifyResult(null);
    const trimmed = totpCode.trim();
    if (/^\d{6}$/.test(trimmed)) {
      setVerifyResult('Valid TOTP format. Actual verification requires an Edge Function.');
    } else {
      setVerifyResult('Invalid format. TOTP code must be exactly 6 digits.');
    }
  }

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading 2FA settings...
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px" accent="purple">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Two-Factor Authentication
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          Two-Factor Authentication adds an extra layer of security for admin accounts.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>2FA Status</p>
            <Badge variant={is2FAEnabled ? 'success' : 'warning'}>
              {is2FAEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <Button
            variant={is2FAEnabled ? 'danger' : 'primary'}
            size="sm"
            onClick={toggle2FA}
            loading={saving}
            disabled={!twoFaSetting}
          >
            {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>

        {is2FAEnabled && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '8px' }}>
            2FA is managed through Supabase Auth. Admin users can set up TOTP via their account settings.
          </p>
        )}

        {!twoFaSetting && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            The "2fa_enabled" setting key was not found. Add it via Supabase dashboard to manage 2FA.
          </p>
        )}
      </GlassCard>

      <GlassCard padding="24px">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          TOTP Verification (Test)
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Enter a 6-digit TOTP code to validate the format. Actual verification needs an Edge Function.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <Input
            label="TOTP Code"
            value={totpCode}
            onChange={(e) => {
              setTotpCode(e.target.value);
              setVerifyResult(null);
            }}
            placeholder="123456"
            style={{ maxWidth: '200px' }}
          />
          <Button size="sm" onClick={handleVerify} disabled={!totpCode.trim()}>
            Verify
          </Button>
        </div>
        {verifyResult && (
          <p
            style={{
              fontSize: '13px',
              marginTop: '10px',
              color: verifyResult.startsWith('Valid') ? '#34D399' : '#EF4444',
            }}
          >
            {verifyResult}
          </p>
        )}
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  System Events tab                                                  */
/* ------------------------------------------------------------------ */

function SystemEventsContent() {
  const [events, setEvents] = useState<SystemEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [eventTypeCount, setEventTypeCount] = useState(0);

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Total count
        const { count: total, error: countErr } = await supabaseAdmin
          .from('system_events')
          .select('*', { count: 'exact', head: true });

        if (countErr) {
          console.error('Failed to count system events:', countErr.message);
        } else {
          setTotalCount(total ?? 0);
        }

        // Today count
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: today, error: todayErr } = await supabaseAdmin
          .from('system_events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString());

        if (todayErr) {
          console.error('Failed to count today events:', todayErr.message);
        } else {
          setTodayCount(today ?? 0);
        }

        // Fetch recent events
        const { data, error } = await supabaseAdmin
          .from('system_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.error('Failed to fetch system events:', error.message);
          setEvents([]);
          return;
        }

        const eventsData = data ?? [];
        setEvents(eventsData);

        // Count distinct event types
        const eventTypes = new Set(eventsData.map((e) => e.event_type));
        setEventTypeCount(eventTypes.size);
      } catch (err) {
        console.error('Unexpected error fetching system events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const eventColumns: Column<SystemEventRow>[] = useMemo(
    () => [
      {
        key: 'event_type',
        header: 'Event Type',
        sortable: true,
        width: '160px',
        render: (row) => <Badge variant="info">{row.event_type}</Badge>,
      },
      {
        key: 'tenant_type',
        header: 'Tenant Type',
        sortable: true,
        width: '120px',
        render: (row) => row.tenant_type ?? '--',
      },
      {
        key: 'source',
        header: 'Source',
        sortable: true,
        width: '120px',
        render: (row) => row.source ?? '--',
      },
      {
        key: 'data',
        header: 'Data',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {truncate(row.data, 80)}
          </span>
        ),
      },
      {
        key: 'correlation_id',
        header: 'Correlation ID',
        width: '140px',
        render: (row) => (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {truncate(row.correlation_id, 20)}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '180px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Events" value={totalCount.toLocaleString()} accent="purple" />
        <KpiCard label="Events Today" value={todayCount.toLocaleString()} accent="blue" />
        <KpiCard label="Event Types" value={eventTypeCount.toLocaleString()} accent="teal" />
      </div>

      <GlassCard padding="0">
        <Table<SystemEventRow>
          columns={eventColumns}
          data={events}
          loading={loading}
          emptyMessage="No system events recorded"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SOPs tab                                                           */
/* ------------------------------------------------------------------ */

const SOP_SECTIONS: SopSection[] = [
  {
    title: 'Daily Operations',
    procedures: [
      { name: 'System Health Check', description: 'Verify all services are running, check error logs' },
      { name: 'Transaction Queue Review', description: 'Process pending transactions, investigate failures' },
      { name: 'Investment Processing', description: 'Execute staged trades, verify completions' },
      { name: 'Revenue Monitoring', description: 'Check subscription payments, verify fee collection' },
    ],
  },
  {
    title: 'User Management',
    procedures: [
      { name: 'Account Creation', description: 'New user onboarding workflow' },
      { name: 'Support Triage', description: 'Handle user support requests, escalation procedures' },
      { name: 'Compliance Check', description: 'Verify KYC/AML requirements' },
    ],
  },
  {
    title: 'Financial Operations',
    procedures: [
      { name: 'Revenue Verification', description: 'Cross-check subscription payments' },
      { name: 'Fee Processing', description: 'Verify fee calculations and collections' },
      { name: 'Payout Reconciliation', description: 'Match payouts with ledger entries' },
    ],
  },
  {
    title: 'AI/ML Management',
    procedures: [
      { name: 'Model Performance Check', description: 'Review accuracy metrics' },
      { name: 'Training Data Updates', description: 'Verify new merchant mappings' },
      { name: 'Drift Detection', description: 'Monitor for model performance degradation' },
    ],
  },
  {
    title: 'Emergency Procedures',
    procedures: [
      { name: 'System Downtime Response', description: 'Notification, diagnosis, recovery steps' },
      { name: 'Data Loss Recovery', description: 'Backup restoration procedures' },
      { name: 'Security Incident', description: 'Containment, investigation, remediation steps' },
    ],
  },
];

function SopsContent() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function toggleSection(index: number) {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {SOP_SECTIONS.map((section, idx) => {
        const isExpanded = expanded[idx] ?? false;
        return (
          <GlassCard key={idx} padding="0">
            <div
              onClick={() => toggleSection(idx)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {section.title}
              </h3>
              <span
                style={{
                  fontSize: '16px',
                  color: 'var(--text-muted)',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                }}
              >
                &#x25BC;
              </span>
            </div>

            {isExpanded && (
              <div
                style={{
                  padding: '0 24px 20px',
                  borderTop: '1px solid var(--border-divider)',
                }}
              >
                <ol
                  style={{
                    paddingLeft: '20px',
                    margin: '16px 0 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {section.procedures.map((proc, pIdx) => (
                    <li
                      key={pIdx}
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {proc.name}
                      </span>
                      {' -- '}
                      {proc.description}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  API Balance tab                                                    */
/* ------------------------------------------------------------------ */

function ApiBalanceContent() {
  const [balanceRow, setBalanceRow] = useState<ApiBalanceRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data, error } = await supabaseAdmin
          .from('api_balance')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Failed to fetch API balance:', error.message);
          setBalanceRow(null);
          return;
        }

        setBalanceRow(data && data.length > 0 ? data[0] : null);
      } catch (err) {
        console.error('Unexpected error fetching API balance:', err);
        setBalanceRow(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard
          label="Current API Balance"
          value={loading ? '...' : balanceRow ? usd(balanceRow.balance) : '$0.00'}
          accent="teal"
        />
      </div>

      <GlassCard padding="28px" accent="blue">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          API Balance Info
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          API balance is used for LLM processing costs. Monitor usage in the Monitoring tab.
          Top up balance via Supabase dashboard or payment integration.
        </p>
        {balanceRow && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Last updated: {formatDate(balanceRow.updated_at)}
          </p>
        )}
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  API Keys Management tab                                            */
/* ------------------------------------------------------------------ */

interface ApiKeyConfig {
  key: string;
  label: string;
  category: 'ai' | 'payments' | 'trading' | 'analytics' | 'auth' | 'other';
  description: string;
  isSecret?: boolean;
}

const API_KEY_DEFINITIONS: ApiKeyConfig[] = [
  // AI
  { key: 'deepseek_api_key', label: 'DeepSeek API Key', category: 'ai', description: 'AI merchant mapping & recommendations', isSecret: true },
  // Payments
  { key: 'stripe_secret_key', label: 'Stripe Secret Key', category: 'payments', description: 'Payment processing (live)', isSecret: true },
  { key: 'stripe_publishable_key', label: 'Stripe Publishable Key', category: 'payments', description: 'Stripe client-side key' },
  // Trading
  { key: 'alpaca_api_key', label: 'Alpaca API Key', category: 'trading', description: 'Stock trading (sandbox)' },
  { key: 'alpaca_api_secret', label: 'Alpaca API Secret', category: 'trading', description: 'Stock trading secret', isSecret: true },
  // Analytics / Firebase
  { key: 'firebase_api_key', label: 'Firebase API Key', category: 'analytics', description: 'Firebase client config' },
  { key: 'firebase_auth_domain', label: 'Firebase Auth Domain', category: 'auth', description: 'Firebase authentication domain' },
  { key: 'firebase_project_id', label: 'Firebase Project ID', category: 'analytics', description: 'Firebase project identifier' },
  { key: 'firebase_storage_bucket', label: 'Firebase Storage Bucket', category: 'analytics', description: 'Firebase storage' },
  { key: 'firebase_messaging_sender_id', label: 'Firebase Messaging Sender ID', category: 'analytics', description: 'Push notification sender' },
  { key: 'firebase_app_id', label: 'Firebase App ID', category: 'analytics', description: 'Firebase app identifier' },
  { key: 'firebase_measurement_id', label: 'Firebase Measurement ID', category: 'analytics', description: 'Google Analytics (GA4)' },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  ai: { label: 'AI', color: '#7C3AED' },
  payments: { label: 'Payments', color: '#34D399' },
  trading: { label: 'Trading', color: '#3B82F6' },
  analytics: { label: 'Analytics', color: '#F59E0B' },
  auth: { label: 'Auth', color: '#EC4899' },
  other: { label: 'Other', color: 'var(--text-muted)' },
};

function maskValue(value: string): string {
  if (!value || value.length < 8) return '••••••••';
  return '••••••••' + value.slice(-4);
}

function ApiKeysContent() {
  const { settings, loading, refetch } = useAdminSettings('api_key');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [addingKey, setAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');

  function getStoredValue(settingKey: string): { id: number | null; value: string } {
    const match = settings.find((s) => s.setting_key === settingKey);
    return { id: match?.id ?? null, value: match?.setting_value ?? '' };
  }

  function startEditing(key: string, currentValue: string) {
    setEditing((prev) => ({ ...prev, [key]: currentValue }));
  }

  function cancelEditing(key: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveKey(settingKey: string) {
    const newValue = editing[settingKey];
    if (newValue === undefined) return;

    setSaving(settingKey);
    try {
      const stored = getStoredValue(settingKey);

      if (stored.id !== null) {
        // Update existing
        await supabaseAdmin
          .from('admin_settings')
          .update({ setting_value: newValue } as any)
          .eq('id', stored.id);
      } else {
        // Insert new
        await supabaseAdmin
          .from('admin_settings')
          .insert({
            setting_key: settingKey,
            setting_value: newValue,
            setting_type: 'api_key',
            description: API_KEY_DEFINITIONS.find((d) => d.key === settingKey)?.description ?? '',
          } as any);
      }

      cancelEditing(settingKey);
      await refetch();
    } catch (err) {
      console.error(`Failed to save API key ${settingKey}:`, err);
    } finally {
      setSaving(null);
    }
  }

  async function addCustomKey() {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    setSaving('__new__');
    try {
      await supabaseAdmin
        .from('admin_settings')
        .insert({
          setting_key: newKeyName.trim().toLowerCase().replace(/\s+/g, '_'),
          setting_value: newKeyValue.trim(),
          setting_type: 'api_key',
          description: newKeyDesc.trim() || null,
        } as any);

      setNewKeyName('');
      setNewKeyValue('');
      setNewKeyDesc('');
      setAddingKey(false);
      await refetch();
    } catch (err) {
      console.error('Failed to add custom API key:', err);
    } finally {
      setSaving(null);
    }
  }

  async function deleteKey(settingKey: string) {
    const stored = getStoredValue(settingKey);
    if (stored.id === null) return;

    setSaving(settingKey);
    try {
      await supabaseAdmin
        .from('admin_settings')
        .delete()
        .eq('id', stored.id);
      await refetch();
    } catch (err) {
      console.error(`Failed to delete API key ${settingKey}:`, err);
    } finally {
      setSaving(null);
    }
  }

  const filteredKeys = filterCategory === 'all'
    ? API_KEY_DEFINITIONS
    : API_KEY_DEFINITIONS.filter((k) => k.category === filterCategory);

  // Find custom keys (in settings but not in definitions)
  const definedKeys = new Set(API_KEY_DEFINITIONS.map((d) => d.key));
  const customKeys = settings.filter((s) => !definedKeys.has(s.setting_key));

  const configuredCount = API_KEY_DEFINITIONS.filter((d) => getStoredValue(d.key).value).length + customKeys.length;

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading API keys...</p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Keys Defined" value={String(API_KEY_DEFINITIONS.length)} accent="purple" />
        <KpiCard label="Keys Configured" value={String(configuredCount)} accent="teal" />
        <KpiCard label="Custom Keys" value={String(customKeys.length)} accent="blue" />
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[{ value: 'all', label: 'All' }, ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v.label }))].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterCategory(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: filterCategory === opt.value ? '#7C3AED' : 'var(--border-subtle)',
              background: filterCategory === opt.value ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: filterCategory === opt.value ? '#7C3AED' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 200ms ease',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* API Keys list */}
      <GlassCard padding="24px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            API Keys & Secrets
          </h3>
          <Button size="sm" onClick={() => setAddingKey(true)}>
            + Add Custom Key
          </Button>
        </div>

        {/* Add custom key form */}
        {addingKey && (
          <div style={{
            padding: '16px',
            marginBottom: '16px',
            background: 'var(--surface-input)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <Input label="Key Name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. plaid_api_key" />
            <Input label="Value" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="Enter key value" type="password" />
            <Input label="Description (optional)" value={newKeyDesc} onChange={(e) => setNewKeyDesc(e.target.value)} placeholder="What is this key used for?" />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => { setAddingKey(false); setNewKeyName(''); setNewKeyValue(''); setNewKeyDesc(''); }}>Cancel</Button>
              <Button size="sm" onClick={addCustomKey} loading={saving === '__new__'} disabled={!newKeyName.trim() || !newKeyValue.trim()}>Save Key</Button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {filteredKeys.map((keyDef) => {
            const stored = getStoredValue(keyDef.key);
            const isEditing = keyDef.key in editing;
            const isRevealed = revealed[keyDef.key];
            const isSaving = saving === keyDef.key;
            const catInfo = CATEGORY_LABELS[keyDef.category];

            return (
              <div
                key={keyDef.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border-divider)',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {keyDef.label}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: `${catInfo.color}22`,
                      color: catInfo.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {catInfo.label}
                    </span>
                    {keyDef.isSecret && (
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                        SECRET
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{keyDef.description}</p>
                </div>

                <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isEditing ? (
                    <>
                      <Input
                        value={editing[keyDef.key]}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [keyDef.key]: e.target.value }))}
                        type="text"
                        style={{ width: '280px', fontSize: '13px', fontFamily: 'monospace' }}
                        placeholder="Enter new value"
                      />
                      <Button size="sm" onClick={() => saveKey(keyDef.key)} loading={isSaving}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => cancelEditing(keyDef.key)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: stored.value ? 'var(--text-secondary)' : 'var(--text-muted)',
                        background: 'var(--surface-input)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        minWidth: '140px',
                        textAlign: 'center',
                      }}>
                        {stored.value
                          ? (isRevealed ? stored.value : maskValue(stored.value))
                          : 'Not configured'}
                      </span>
                      {stored.value && (
                        <button
                          onClick={() => toggleReveal(keyDef.key)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            padding: '4px',
                            fontFamily: 'inherit',
                          }}
                          aria-label={isRevealed ? 'Hide value' : 'Show value'}
                        >
                          {isRevealed ? '🙈' : '👁'}
                        </button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(keyDef.key, stored.value)}
                      >
                        {stored.value ? 'Update' : 'Set'}
                      </Button>
                      {stored.value && (
                        <Button variant="danger" size="sm" onClick={() => deleteKey(keyDef.key)} loading={isSaving}>
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Custom keys */}
          {customKeys.length > 0 && (
            <>
              <div style={{ padding: '16px 0 8px', marginTop: '8px', borderTop: '2px solid var(--border-divider)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Custom Keys
                </p>
              </div>
              {customKeys.map((s) => {
                const isEditing = s.setting_key in editing;
                const isRevealed = revealed[s.setting_key];
                const isSaving = saving === s.setting_key;

                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid var(--border-divider)',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.setting_key}
                      </p>
                      {s.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.description}</p>
                      )}
                    </div>
                    <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isEditing ? (
                        <>
                          <Input
                            value={editing[s.setting_key]}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [s.setting_key]: e.target.value }))}
                            type="text"
                            style={{ width: '280px', fontSize: '13px', fontFamily: 'monospace' }}
                          />
                          <Button size="sm" onClick={() => saveKey(s.setting_key)} loading={isSaving}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelEditing(s.setting_key)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <span style={{
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            color: 'var(--text-secondary)',
                            background: 'var(--surface-input)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            minWidth: '140px',
                            textAlign: 'center',
                          }}>
                            {isRevealed ? s.setting_value : maskValue(s.setting_value)}
                          </span>
                          <button
                            onClick={() => toggleReveal(s.setting_key)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '4px', fontFamily: 'inherit' }}
                          >
                            {isRevealed ? '🙈' : '👁'}
                          </button>
                          <Button variant="ghost" size="sm" onClick={() => startEditing(s.setting_key, s.setting_value)}>Update</Button>
                          <Button variant="danger" size="sm" onClick={() => deleteKey(s.setting_key)} loading={isSaving}>Delete</Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </GlassCard>

      {/* Info note */}
      <GlassCard padding="20px" accent="purple">
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Note:</strong> Keys marked as <span style={{ color: '#EF4444', fontWeight: 600 }}>SECRET</span> should also be set as Supabase Edge Function secrets
          via <code style={{ background: 'var(--surface-input)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>supabase secrets set KEY_NAME=value</code> for
          server-side access. Values stored here are for admin reference and can be used by client-side features.
        </p>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SystemOperationsTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'settings', label: 'Settings', content: <SettingsContent /> },
      { key: 'api-keys', label: 'API Keys', content: <ApiKeysContent /> },
      { key: 'business', label: 'Business Info', content: <BusinessInfoContent /> },
      { key: 'access', label: 'Access Controls', content: <AccessControlsContent /> },
      { key: '2fa', label: '2FA Management', content: <TwoFAManagementContent /> },
      { key: 'events', label: 'System Events', content: <SystemEventsContent /> },
      { key: 'sops', label: 'SOPs', content: <SopsContent /> },
      { key: 'balance', label: 'API Balance', content: <ApiBalanceContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Tabs tabs={tabs} defaultTab="settings" />
    </div>
  );
}

export default SystemOperationsTab;
