import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Button, Tabs } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AdminSettingRow = Database['public']['Tables']['admin_settings']['Row'];

interface TableInfo {
  name: string;
  count: number | null;
  loading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Known tables                                                       */
/* ------------------------------------------------------------------ */

const KNOWN_TABLES: string[] = [
  'users',
  'transactions',
  'portfolios',
  'goals',
  'notifications',
  'llm_mappings',
  'subscription_plans',
  'user_subscriptions',
  'admin_settings',
  'system_events',
  'api_usage',
  'api_balance',
  'roundup_ledger',
  'market_queue',
  'contact_messages',
  'advertisements',
  'promo_codes',
  'renewal_queue',
  'renewal_history',
];

/* ------------------------------------------------------------------ */
/*  Tables tab                                                         */
/* ------------------------------------------------------------------ */

function TablesContent() {
  const [tables, setTables] = useState<TableInfo[]>(
    KNOWN_TABLES.map((name) => ({ name, count: null, loading: true })),
  );
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      const results = await Promise.all(
        KNOWN_TABLES.map(async (tableName) => {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });

            if (error) {
              console.error(`Failed to count ${tableName}:`, error.message);
              return { name: tableName, count: null, loading: false };
            }

            return { name: tableName, count: count ?? 0, loading: false };
          } catch (err) {
            console.error(`Unexpected error counting ${tableName}:`, err);
            return { name: tableName, count: null, loading: false };
          }
        }),
      );

      setTables(results);
    }

    fetchCounts();
  }, []);

  const totalTables = useMemo(() => KNOWN_TABLES.length, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Tables" value={totalTables} accent="purple" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
      >
        {tables.map((table) => (
          <GlassCard key={table.name} padding="20px">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#F8FAFC',
                    marginBottom: '4px',
                  }}
                >
                  {table.name}
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(248,250,252,0.5)',
                  }}
                >
                  {table.loading
                    ? 'Counting...'
                    : table.count !== null
                      ? `${table.count.toLocaleString()} rows`
                      : 'Unable to fetch count'}
                </p>
              </div>
              <Button
                variant={selectedTable === table.name ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedTable(table.name)}
              >
                Browse
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Backups tab                                                        */
/* ------------------------------------------------------------------ */

function BackupsContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="28px" accent="blue">
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '12px',
          }}
        >
          Automatic Backups
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(248,250,252,0.6)',
            lineHeight: 1.6,
          }}
        >
          Database backups are managed automatically by Supabase. Visit your
          Supabase dashboard to view backup schedules and restore points.
        </p>
      </GlassCard>

      <GlassCard padding="28px">
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#F8FAFC',
            marginBottom: '12px',
          }}
        >
          Supabase Project Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)' }}>
            Project URL: Configured via VITE_SUPABASE_URL
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(248,250,252,0.5)' }}>
            Backup schedule, retention policies, and point-in-time recovery
            settings are available in the Supabase dashboard under Database
            &gt; Backups.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Maintenance tab                                                    */
/* ------------------------------------------------------------------ */

function MaintenanceContent() {
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
          No admin settings configured yet.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="24px">
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#F8FAFC',
          marginBottom: '16px',
        }}
      >
        Admin Settings
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {settings.map((setting) => (
          <div
            key={setting.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#F8FAFC',
                }}
              >
                {setting.setting_key}
              </p>
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DatabaseManagementTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'tables', label: 'Tables', content: <TablesContent /> },
      { key: 'backups', label: 'Backups', content: <BackupsContent /> },
      { key: 'maintenance', label: 'Maintenance', content: <MaintenanceContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Tabs tabs={tabs} defaultTab="tables" />
    </div>
  );
}

export default DatabaseManagementTab;
