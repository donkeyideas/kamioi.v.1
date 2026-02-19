import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Input } from '@/components/ui';
import type { Column } from '@/components/ui';
import type { Database } from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

type FilterKey = 'all' | 'unread' | 'info' | 'success' | 'warning';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'info', label: 'Info' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
];

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

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function typeBadgeVariant(
  type: string,
): 'info' | 'success' | 'warning' | 'error' | 'default' {
  switch (type.toLowerCase()) {
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

/* ------------------------------------------------------------------ */
/*  Filter pill styles                                                 */
/* ------------------------------------------------------------------ */

const pillBase: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  padding: '6px 16px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(248,250,252,0.5)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
};

const pillActive: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))',
  borderColor: 'rgba(124,58,237,0.4)',
  color: '#F8FAFC',
  fontWeight: 600,
};

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

const columns: Column<NotificationRow>[] = [
  {
    key: 'title',
    header: 'Title',
    sortable: true,
    width: '180px',
  },
  {
    key: 'message',
    header: 'Message',
    render: (row) => (
      <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)' }}>
        {truncate(row.message, 60)}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    sortable: true,
    width: '110px',
    render: (row) => (
      <Badge variant={typeBadgeVariant(row.type)}>{row.type}</Badge>
    ),
  },
  {
    key: 'user_id',
    header: 'User ID',
    sortable: true,
    width: '90px',
    render: (row) => String(row.user_id),
  },
  {
    key: 'read',
    header: 'Read',
    sortable: true,
    width: '90px',
    render: (row) => (
      <Badge variant={row.read ? 'success' : 'warning'}>
        {row.read ? 'Yes' : 'No'}
      </Badge>
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NotificationsAdminTab() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch notifications:', error.message);
          setNotifications([]);
          return;
        }

        setNotifications(data ?? []);
      } catch (err) {
        console.error('Unexpected error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  /* Derived: KPIs */
  const totalCount = useMemo(() => notifications.length, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const readRate = useMemo(() => {
    if (totalCount === 0) return '0%';
    const rate = ((totalCount - unreadCount) / totalCount) * 100;
    return `${rate.toFixed(1)}%`;
  }, [totalCount, unreadCount]);

  /* Derived: filtered list (client-side) */
  const filtered = useMemo(() => {
    let list = notifications;

    // Filter by pill
    if (activeFilter === 'unread') {
      list = list.filter((n) => !n.read);
    } else if (activeFilter !== 'all') {
      list = list.filter((n) => n.type.toLowerCase() === activeFilter);
    }

    // Filter by search on title
    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q));
    }

    return list;
  }, [notifications, activeFilter, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Notifications" value={totalCount.toLocaleString()} accent="purple" />
        <KpiCard label="Unread" value={unreadCount.toLocaleString()} accent="pink" />
        <KpiCard label="Read Rate" value={readRate} accent="teal" />
      </div>

      {/* Filters */}
      <GlassCard padding="20px">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ flex: '1 1 260px', maxWidth: '360px' }}>
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.key}
                style={{
                  ...pillBase,
                  ...(activeFilter === pill.key ? pillActive : {}),
                }}
                onClick={() => setActiveFilter(pill.key)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard padding="0">
        <Table<NotificationRow>
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No notifications found"
          pageSize={20}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

export default NotificationsAdminTab;
