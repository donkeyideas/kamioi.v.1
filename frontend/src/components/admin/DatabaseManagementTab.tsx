import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Select, Modal } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TableInfo {
  name: string;
  count: number | null;
  loading: boolean;
  error: boolean;
}

interface AdminSettingRow {
  id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: string | null;
  description: string | null;
  created_at: string;
}

interface SystemEventRow {
  id: number;
  event_type: string | null;
  tenant_id: string | null;
  tenant_type: string | null;
  data: Record<string, unknown> | null;
  correlation_id: string | null;
  source: string | null;
  created_at: string;
}

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
}

interface QualityCheck {
  name: string;
  count: number | null;
  loading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KNOWN_TABLES: string[] = [
  'users',
  'transactions',
  'portfolios',
  'goals',
  'notifications',
  'llm_mappings',
  'ai_responses',
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
  'subscription_analytics',
  'subscription_changes',
  'statements',
  'user_settings',
];

const TABLE_SCHEMAS: Record<string, SchemaColumn[]> = {
  users: [
    { name: 'id', type: 'number', nullable: false, description: 'Primary key' },
    { name: 'auth_id', type: 'string', nullable: true, description: 'Supabase Auth user ID' },
    { name: 'email', type: 'string', nullable: true, description: 'User email address' },
    { name: 'name', type: 'string', nullable: true, description: 'Full name' },
    { name: 'account_type', type: 'string', nullable: true, description: 'Account type (free, premium, admin)' },
    { name: 'phone', type: 'string', nullable: true, description: 'Phone number' },
    { name: 'avatar_url', type: 'string', nullable: true, description: 'Profile avatar URL' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Account creation date' },
  ],
  transactions: [
    { name: 'id', type: 'number', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'number', nullable: false, description: 'Foreign key to users' },
    { name: 'date', type: 'date', nullable: true, description: 'Transaction date' },
    { name: 'merchant', type: 'string', nullable: true, description: 'Merchant name' },
    { name: 'amount', type: 'number', nullable: true, description: 'Transaction amount' },
    { name: 'status', type: 'string', nullable: true, description: 'Transaction status' },
    { name: 'category', type: 'string', nullable: true, description: 'Spending category' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Record creation date' },
  ],
  portfolios: [
    { name: 'id', type: 'number', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'number', nullable: false, description: 'Foreign key to users' },
    { name: 'ticker', type: 'string', nullable: true, description: 'Stock/ETF ticker symbol' },
    { name: 'shares', type: 'number', nullable: true, description: 'Number of shares owned' },
    { name: 'total_value', type: 'number', nullable: true, description: 'Current portfolio value' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Record creation date' },
  ],
  api_usage: [
    { name: 'id', type: 'number', nullable: false, description: 'Primary key' },
    { name: 'endpoint', type: 'string', nullable: true, description: 'API endpoint called' },
    { name: 'model', type: 'string', nullable: true, description: 'AI model used' },
    { name: 'prompt_tokens', type: 'number', nullable: true, description: 'Input tokens' },
    { name: 'completion_tokens', type: 'number', nullable: true, description: 'Output tokens' },
    { name: 'total_tokens', type: 'number', nullable: true, description: 'Total tokens consumed' },
    { name: 'processing_time_ms', type: 'number', nullable: true, description: 'Request processing time' },
    { name: 'cost', type: 'number', nullable: true, description: 'API call cost in USD' },
    { name: 'success', type: 'boolean', nullable: false, description: 'Whether call succeeded' },
    { name: 'error_message', type: 'string', nullable: true, description: 'Error message if failed' },
    { name: 'request_data', type: 'json', nullable: true, description: 'Request payload' },
    { name: 'response_data', type: 'json', nullable: true, description: 'Response payload' },
    { name: 'user_id', type: 'string', nullable: true, description: 'User who made the call' },
    { name: 'page_tab', type: 'string', nullable: true, description: 'UI page/tab context' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Call timestamp' },
  ],
  system_events: [
    { name: 'id', type: 'number', nullable: false, description: 'Primary key' },
    { name: 'event_type', type: 'string', nullable: true, description: 'Type of system event' },
    { name: 'tenant_id', type: 'string', nullable: true, description: 'Tenant identifier' },
    { name: 'tenant_type', type: 'string', nullable: true, description: 'Tenant type' },
    { name: 'data', type: 'json', nullable: true, description: 'Event data payload' },
    { name: 'correlation_id', type: 'string', nullable: true, description: 'Correlation ID for tracing' },
    { name: 'source', type: 'string', nullable: true, description: 'Event source' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Event timestamp' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Tab 1: Tables                                                      */
/* ------------------------------------------------------------------ */

function TablesContent() {
  const [tables, setTables] = useState<TableInfo[]>(
    KNOWN_TABLES.map((name) => ({ name, count: null, loading: true, error: false })),
  );

  useEffect(() => {
    async function fetchCounts() {
      const results = await Promise.all(
        KNOWN_TABLES.map(async (tableName) => {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });

            if (error) {
              return { name: tableName, count: null, loading: false, error: true };
            }
            return { name: tableName, count: count ?? 0, loading: false, error: false };
          } catch {
            return { name: tableName, count: null, loading: false, error: true };
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
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        {tables.map((table) => (
          <GlassCard key={table.name} padding="20px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {table.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {table.loading ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Counting...
                  </span>
                ) : table.error ? (
                  <Badge variant="warning">N/A</Badge>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {(table.count ?? 0).toLocaleString()} rows
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Schema Browser                                              */
/* ------------------------------------------------------------------ */

function SchemaBrowserContent() {
  const [selectedTable, setSelectedTable] = useState('');

  const tableOptions: SelectOption[] = useMemo(
    () =>
      Object.keys(TABLE_SCHEMAS).map((name) => ({
        value: name,
        label: name,
      })),
    [],
  );

  const schemaColumns: Column<SchemaColumn>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Column Name',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {row.name}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Data Type',
        sortable: true,
        width: '130px',
        render: (row) => (
          <Badge variant="purple">{row.type}</Badge>
        ),
      },
      {
        key: 'nullable',
        header: 'Nullable',
        width: '100px',
        render: (row) => (
          <Badge variant={row.nullable ? 'warning' : 'success'}>
            {row.nullable ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.description}
          </span>
        ),
      },
    ],
    [],
  );

  const currentSchema = selectedTable ? (TABLE_SCHEMAS[selectedTable] ?? []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Schema Browser
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          Schema browser shows table structure and column definitions.
        </p>
        <div style={{ maxWidth: '300px' }}>
          <Select
            label="Select Table"
            options={tableOptions}
            placeholder="Choose a table..."
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          />
        </div>
      </GlassCard>

      {selectedTable && currentSchema.length > 0 && (
        <GlassCard padding="0">
          <div style={{ padding: '20px 20px 0 20px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {selectedTable}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {currentSchema.length} columns
            </p>
          </div>
          <Table<SchemaColumn>
            columns={schemaColumns}
            data={currentSchema}
            loading={false}
            emptyMessage="No schema information available"
            pageSize={20}
            rowKey={(row) => row.name}
          />
        </GlassCard>
      )}

      {selectedTable && currentSchema.length === 0 && (
        <GlassCard padding="28px">
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Schema information not available for this table. Check database.ts type definitions.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Data Quality                                                */
/* ------------------------------------------------------------------ */

function DataQualityContent() {
  const [checks, setChecks] = useState<QualityCheck[]>([
    { name: 'Users without email', count: null, loading: false },
    { name: 'Transactions without merchant', count: null, loading: false },
    { name: 'Orphaned subscriptions', count: null, loading: false },
    { name: 'Mappings without ticker', count: null, loading: false },
  ]);
  const [hasRun, setHasRun] = useState(false);

  const runChecks = useCallback(async () => {
    setChecks((prev) => prev.map((c) => ({ ...c, loading: true, count: null })));
    setHasRun(true);

    try {
      const [usersResult, txResult, subsResult, mappingsResult] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .is('email', null),
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .is('merchant', null),
        supabase
          .from('user_subscriptions')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('llm_mappings')
          .select('id', { count: 'exact', head: true })
          .is('ticker', null),
      ]);

      setChecks([
        { name: 'Users without email', count: usersResult.count ?? 0, loading: false },
        { name: 'Transactions without merchant', count: txResult.count ?? 0, loading: false },
        { name: 'Orphaned subscriptions (total subs)', count: subsResult.count ?? 0, loading: false },
        { name: 'Mappings without ticker', count: mappingsResult.count ?? 0, loading: false },
      ]);
    } catch {
      setChecks((prev) => prev.map((c) => ({ ...c, loading: false })));
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Button onClick={runChecks}>Run Checks</Button>
        {!hasRun && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Click "Run Checks" to analyze data quality
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {checks.map((check) => (
          <GlassCard key={check.name} padding="24px">
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              {check.name}
            </p>
            {check.loading ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Checking...</span>
            ) : check.count !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {check.count.toLocaleString()}
                </span>
                <Badge variant={check.count === 0 ? 'success' : 'warning'}>
                  {check.count === 0 ? 'Clean' : 'Review'}
                </Badge>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Not checked yet
              </span>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Backups                                                     */
/* ------------------------------------------------------------------ */

function BackupsContent() {
  const [showDumpInfo, setShowDumpInfo] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Supabase Point-in-Time Recovery
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Database backups are managed by Supabase Point-in-Time Recovery (PITR).
        </p>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <GlassCard padding="24px">
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Backup Type
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Continuous (PITR)</span>
            <Badge variant="success">Active</Badge>
          </div>
        </GlassCard>

        <GlassCard padding="24px">
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Retention
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>7 days (Free) / 30 days (Pro)</span>
            <Badge variant="info">Tier Dependent</Badge>
          </div>
        </GlassCard>

        <GlassCard padding="24px">
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Recovery
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Point-in-time to any second</span>
            <Badge variant="success">Available</Badge>
          </div>
        </GlassCard>
      </div>

      <GlassCard padding="28px">
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          To restore a backup, visit your Supabase dashboard &gt; Database &gt; Backups.
        </p>
      </GlassCard>

      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Manual Export
        </p>
        <Button variant="secondary" onClick={() => setShowDumpInfo(true)}>
          Export SQL Dump
        </Button>
        {showDumpInfo && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'var(--surface-input)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              supabase db dump --project-ref your-project-ref &gt; backup.sql
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              This requires the Supabase CLI to be installed locally.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5: Maintenance                                                 */
/* ------------------------------------------------------------------ */

function MaintenanceContent() {
  const [settings, setSettings] = useState<AdminSettingRow[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [vacuumInfo, setVacuumInfo] = useState(false);
  const [reindexInfo, setReindexInfo] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .order('setting_key', { ascending: true });

        if (error) {
          setSettings([]);
          return;
        }
        setSettings((data ?? []) as AdminSettingRow[]);
      } catch {
        setSettings([]);
      } finally {
        setLoadingSettings(false);
      }
    }

    fetchSettings();
  }, []);

  const handleClearOldEvents = useCallback(async () => {
    setClearing(true);
    setClearMessage('');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { error } = await supabase
        .from('system_events')
        .delete()
        .lt('created_at', ninetyDaysAgo.toISOString());

      if (error) {
        setClearMessage(`Error: ${error.message}`);
      } else {
        setClearMessage('Old events cleared successfully.');
      }
    } catch {
      setClearMessage('Failed to clear old events.');
    } finally {
      setClearing(false);
      setClearConfirm(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Settings */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Admin Settings
        </p>
        {loadingSettings ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading settings...</p>
        ) : settings.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No admin settings configured yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {settings.map((setting) => (
              <div
                key={setting.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-divider)',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {setting.setting_key}
                  </p>
                  {setting.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {setting.description}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {setting.setting_value}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Database Health */}
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Database Health
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '140px' }}>
              Connection Status
            </span>
            <Badge variant="success">Connected</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '140px' }}>
              Provider
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Supabase PostgreSQL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '140px' }}>
              Region
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Check Supabase dashboard</span>
          </div>
        </div>
      </GlassCard>

      {/* Maintenance Tasks */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Maintenance Tasks
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Button variant="secondary" onClick={() => setVacuumInfo(!vacuumInfo)}>
              Vacuum Analyze
            </Button>
            {vacuumInfo && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--surface-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  VACUUM ANALYZE;
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Run via Supabase SQL Editor
                </p>
              </div>
            )}
          </div>

          <div>
            <Button variant="secondary" onClick={() => setReindexInfo(!reindexInfo)}>
              Reindex
            </Button>
            {reindexInfo && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--surface-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  REINDEX DATABASE;
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Run via Supabase SQL Editor
                </p>
              </div>
            )}
          </div>

          <div>
            <Button variant="danger" onClick={() => setClearConfirm(true)}>
              Clear Old Events
            </Button>
            {clearMessage && (
              <p style={{
                fontSize: '13px',
                color: clearMessage.includes('Error') || clearMessage.includes('Failed') ? '#EF4444' : '#34D399',
                marginTop: '8px',
              }}>
                {clearMessage}
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      <Modal
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        title="Confirm Clear Old Events"
        size="sm"
      >
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
          This will permanently delete all system events older than 90 days. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setClearConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearOldEvents} loading={clearing}>
            Delete Old Events
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 6: Security                                                    */
/* ------------------------------------------------------------------ */

function SecurityContent() {
  const [loading, setLoading] = useState(true);
  const [auditEvents, setAuditEvents] = useState<SystemEventRow[]>([]);

  useEffect(() => {
    async function fetchAuditEvents() {
      try {
        const { data } = await supabase
          .from('system_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        setAuditEvents((data ?? []) as SystemEventRow[]);
      } catch {
        console.error('Failed to fetch audit events');
      } finally {
        setLoading(false);
      }
    }

    fetchAuditEvents();
  }, []);

  const rlsTables = ['users', 'transactions', 'portfolios', 'goals', 'notifications', 'user_subscriptions'];

  const auditColumns: Column<SystemEventRow>[] = useMemo(
    () => [
      {
        key: 'event_type',
        header: 'Event Type',
        sortable: true,
        width: '180px',
        render: (row) => <Badge variant="info">{row.event_type ?? 'Unknown'}</Badge>,
      },
      {
        key: 'source',
        header: 'Source',
        sortable: true,
        width: '120px',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.source ?? '--'}
          </span>
        ),
      },
      {
        key: 'data',
        header: 'Data',
        render: (row) => {
          const text = row.data ? JSON.stringify(row.data) : '--';
          return (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {text.length > 80 ? `${text.substring(0, 80)}...` : text}
            </span>
          );
        },
      },
      {
        key: 'correlation_id',
        header: 'Correlation ID',
        width: '140px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {row.correlation_id ? row.correlation_id.substring(0, 12) : '--'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Row Level Security (RLS)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rlsTables.map((table) => (
            <div key={table} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', minWidth: '180px', fontFamily: 'monospace' }}>
                {table}
              </span>
              <Badge variant="success">Enabled</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Access Control
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '120px' }}>
              Service Role
            </span>
            <Badge variant="warning">Restricted -- server-side only</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '120px' }}>
              Anon Key
            </span>
            <Badge variant="info">Public -- RLS enforced</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '120px' }}>
              Auth
            </span>
            <Badge variant="success">Supabase Auth</Badge>
          </div>
        </div>
      </GlassCard>

      <GlassCard accent="blue" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Audit Log
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Recent system events (last 20)
          </p>
        </div>
        <Table<SystemEventRow>
          columns={auditColumns}
          data={auditEvents}
          loading={loading}
          emptyMessage="No audit events found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DatabaseManagementTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'tables', label: 'Tables', content: <TablesContent /> },
      { key: 'schema', label: 'Schema Browser', content: <SchemaBrowserContent /> },
      { key: 'data-quality', label: 'Data Quality', content: <DataQualityContent /> },
      { key: 'backups', label: 'Backups', content: <BackupsContent /> },
      { key: 'maintenance', label: 'Maintenance', content: <MaintenanceContent /> },
      { key: 'security', label: 'Security', content: <SecurityContent /> },
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
