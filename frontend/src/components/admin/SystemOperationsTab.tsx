import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AdminSettingRow = Database['public']['Tables']['admin_settings']['Row'];
type SystemEventRow = Database['public']['Tables']['system_events']['Row'];
type ApiBalanceRow = Database['public']['Tables']['api_balance']['Row'];

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
/*  Settings tab                                                       */
/* ------------------------------------------------------------------ */

function SettingsContent() {
  const [settings, setSettings] = useState<AdminSettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .order('setting_key', { ascending: true });

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
    }

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)' }}>
          Loading settings...
        </p>
      </GlassCard>
    );
  }

  if (settings.length === 0) {
    return (
      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'rgba(248,250,252,0.5)' }}>
          No system settings configured yet.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="24px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {settings.map((setting) => (
          <div
            key={setting.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              gap: '16px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#F8FAFC',
                  }}
                >
                  {setting.setting_key}
                </p>
                <Badge variant={settingTypeBadgeVariant(setting.setting_type)}>
                  {setting.setting_type ?? 'unknown'}
                </Badge>
              </div>
              {setting.description && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'rgba(248,250,252,0.4)',
                    marginTop: '2px',
                  }}
                >
                  {setting.description}
                </p>
              )}
            </div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(248,250,252,0.7)',
                flexShrink: 0,
                maxWidth: '300px',
                wordBreak: 'break-all',
              }}
            >
              {setting.setting_value}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  System Events tab                                                  */
/* ------------------------------------------------------------------ */

const eventColumns: Column<SystemEventRow>[] = [
  { key: 'event_type', header: 'Event Type', sortable: true, width: '160px' },
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
      <span style={{ fontSize: '12px', color: 'rgba(248,250,252,0.5)' }}>
        {truncate(row.data, 50)}
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
];

function SystemEventsContent() {
  const [events, setEvents] = useState<SystemEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Fetch total count
        const { count: total, error: countErr } = await supabase
          .from('system_events')
          .select('*', { count: 'exact', head: true });

        if (countErr) {
          console.error('Failed to count system events:', countErr.message);
        } else {
          setTotalCount(total ?? 0);
        }

        // Fetch today count
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: today, error: todayErr } = await supabase
          .from('system_events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString());

        if (todayErr) {
          console.error('Failed to count today events:', todayErr.message);
        } else {
          setTodayCount(today ?? 0);
        }

        // Fetch recent events
        const { data, error } = await supabase
          .from('system_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.error('Failed to fetch system events:', error.message);
          setEvents([]);
          return;
        }

        setEvents(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching system events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Events" value={totalCount.toLocaleString()} accent="purple" />
        <KpiCard label="Events Today" value={todayCount.toLocaleString()} accent="blue" />
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
/*  API Balance tab                                                    */
/* ------------------------------------------------------------------ */

function ApiBalanceContent() {
  const [balanceRow, setBalanceRow] = useState<ApiBalanceRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data, error } = await supabase
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
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '12px',
          }}
        >
          API Balance Info
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(248,250,252,0.6)',
            lineHeight: 1.6,
          }}
        >
          API balance is used for LLM processing costs. Top up via Supabase
          dashboard.
        </p>
        {balanceRow && (
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(248,250,252,0.4)',
              marginTop: '8px',
            }}
          >
            Last updated: {formatDate(balanceRow.updated_at)}
          </p>
        )}
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
      { key: 'events', label: 'System Events', content: <SystemEventsContent /> },
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
