import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Select, Modal, Textarea } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string | null;
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
}

type FilterKey = 'all' | 'unread' | 'info' | 'success' | 'warning' | 'error';

interface SendFormData {
  user_id: string;
  title: string;
  message: string;
  type: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'info', label: 'Info' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
];

const NOTIFICATION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

const CONTACT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
];

const EMPTY_SEND_FORM: SendFormData = {
  user_id: '0',
  title: '',
  message: '',
  type: 'info',
};

interface TemplateItem {
  name: string;
  title: string;
  message: string;
  type: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    name: 'Welcome',
    title: 'Welcome to Kamioi',
    message: 'Welcome to Kamioi! Start investing with round-ups today.',
    type: 'success',
  },
  {
    name: 'Goal Achievement',
    title: 'Goal Reached',
    message: "Congratulations! You've reached your savings goal.",
    type: 'success',
  },
  {
    name: 'System Maintenance',
    title: 'Scheduled Maintenance',
    message: 'Scheduled maintenance on [date]. Services may be briefly unavailable.',
    type: 'warning',
  },
  {
    name: 'New Feature',
    title: 'New Feature Available',
    message: "We've launched a new feature! Check out [feature name].",
    type: 'info',
  },
  {
    name: 'Security Alert',
    title: 'Security Alert',
    message: 'We detected unusual activity on your account. Please verify your identity.',
    type: 'error',
  },
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

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function typeBadgeVariant(type: string): 'info' | 'success' | 'warning' | 'error' | 'default' {
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

function contactStatusVariant(status: string): 'success' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'replied':
    case 'closed':
      return 'success';
    case 'new':
      return 'warning';
    case 'read':
      return 'info';
    default:
      return 'default';
  }
}

const pillBase: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  padding: '6px 16px',
  borderRadius: '20px',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-input)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
};

const pillActive: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))',
  borderColor: 'rgba(124,58,237,0.4)',
  color: 'var(--text-primary)',
  fontWeight: 600,
};

/* ------------------------------------------------------------------ */
/*  Sub-tab: Notifications                                             */
/* ------------------------------------------------------------------ */

function NotificationsListTab() {
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
        setNotifications((data ?? []) as NotificationRow[]);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const totalCount = notifications.length;
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const readRate = useMemo(() => {
    if (totalCount === 0) return '0%';
    const rate = ((totalCount - unreadCount) / totalCount) * 100;
    return `${rate.toFixed(1)}%`;
  }, [totalCount, unreadCount]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (activeFilter === 'unread') {
      list = list.filter((n) => !n.read);
    } else if (activeFilter !== 'all') {
      list = list.filter((n) => n.type.toLowerCase() === activeFilter);
    }
    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q));
    }
    return list;
  }, [notifications, activeFilter, search]);

  const columns: Column<NotificationRow>[] = useMemo(
    () => [
      { key: 'title', header: 'Title', sortable: true, width: '180px' },
      {
        key: 'message',
        header: 'Message',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {truncate(row.message, 60)}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        width: '110px',
        render: (row) => <Badge variant={typeBadgeVariant(row.type)}>{row.type}</Badge>,
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
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total" value={totalCount.toLocaleString()} accent="purple" />
        <KpiCard label="Unread" value={unreadCount.toLocaleString()} accent="pink" />
        <KpiCard label="Read Rate" value={readRate} accent="teal" />
      </div>

      <GlassCard padding="20px">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
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
                style={{ ...pillBase, ...(activeFilter === pill.key ? pillActive : {}) }}
                onClick={() => setActiveFilter(pill.key)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

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

/* ------------------------------------------------------------------ */
/*  Sub-tab: Messaging                                                 */
/* ------------------------------------------------------------------ */

function MessagingTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SendFormData>(EMPTY_SEND_FORM);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    try {
      const userId = parseInt(form.user_id, 10) || 0;
      const payload = {
        user_id: userId,
        title: form.title,
        message: form.message,
        type: form.type,
        read: false,
      };
      const { error } = await supabase.from('notifications').insert(payload);
      if (error) {
        console.error('Failed to send notification:', error.message);
        return;
      }
      setModalOpen(false);
      setForm(EMPTY_SEND_FORM);
      setToast('Notification sent successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Send notification error:', err);
    } finally {
      setSending(false);
    }
  }

  function openWithTemplate(template: TemplateItem) {
    setForm({
      user_id: '0',
      title: template.title,
      message: template.message,
      type: template.type,
    });
    setModalOpen(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => { setForm(EMPTY_SEND_FORM); setModalOpen(true); }}>
          Send Notification
        </Button>
      </div>

      {toast && (
        <GlassCard padding="16px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="success">Sent</Badge>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{toast}</span>
          </div>
        </GlassCard>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Send Notification" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="User ID (0 for all users)"
            type="number"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <Select
            label="Type"
            options={NOTIFICATION_TYPE_OPTIONS}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Button onClick={handleSend} loading={sending} fullWidth>
            Send Notification
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Contact Inbox                                             */
/* ------------------------------------------------------------------ */

function ContactInboxTab() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch contact messages:', error.message);
        setMessages([]);
        return;
      }
      setMessages((data ?? []) as ContactMessage[]);
    } catch (err) {
      console.error('Error fetching contact messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const totalMessages = messages.length;
  const newCount = messages.filter((m) => m.status === 'new').length;
  const readCount = messages.filter((m) => m.status === 'read').length;
  const repliedCount = messages.filter((m) => m.status === 'replied').length;

  async function updateStatus(id: number, status: string) {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', id);
      if (error) console.error('Failed to update status:', error.message);
      await fetchMessages();
    } catch (err) {
      console.error('Update status error:', err);
    }
  }

  const contactColumns: Column<ContactMessage>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, width: '150px' },
      { key: 'email', header: 'Email', sortable: true, width: '200px' },
      {
        key: 'subject',
        header: 'Subject',
        sortable: true,
        render: (row) => row.subject ?? '--',
      },
      {
        key: 'message',
        header: 'Message',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.message ? truncate(row.message, 60) : '--'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '140px',
        render: (row) => (
          <Select
            options={CONTACT_STATUS_OPTIONS}
            value={row.status}
            onChange={(e) => updateStatus(row.id, e.target.value)}
            style={{ minWidth: '100px' }}
          />
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '130px',
        render: (row) => formatDateShort(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Messages" value={totalMessages} accent="purple" />
        <KpiCard label="New" value={newCount} accent="pink" />
        <KpiCard label="Read" value={readCount} accent="blue" />
        <KpiCard label="Replied" value={repliedCount} accent="teal" />
      </div>

      <GlassCard padding="0">
        <Table<ContactMessage>
          columns={contactColumns}
          data={messages}
          loading={loading}
          emptyMessage="No contact messages found"
          pageSize={15}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedMessage(row)}
        />
      </GlassCard>

      <Modal
        open={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
        title="Message Detail"
        size="lg"
      >
        {selectedMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>From</span>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0' }}>
                {selectedMessage.name} ({selectedMessage.email})
              </p>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Subject</span>
              <p style={{ color: 'var(--text-primary)', margin: '4px 0 0' }}>{selectedMessage.subject ?? '--'}</p>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Message</span>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.6 }}>
                {selectedMessage.message ?? '--'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status:</span>
              <Badge variant={contactStatusVariant(selectedMessage.status)}>
                {selectedMessage.status}
              </Badge>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Received: {formatDateShort(selectedMessage.created_at)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Templates                                                 */
/* ------------------------------------------------------------------ */

function TemplatesTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SendFormData>(EMPTY_SEND_FORM);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function useTemplate(template: TemplateItem) {
    setForm({
      user_id: '0',
      title: template.title,
      message: template.message,
      type: template.type,
    });
    setModalOpen(true);
  }

  async function handleSend() {
    setSending(true);
    try {
      const userId = parseInt(form.user_id, 10) || 0;
      const payload = {
        user_id: userId,
        title: form.title,
        message: form.message,
        type: form.type,
        read: false,
      };
      const { error } = await supabase.from('notifications').insert(payload);
      if (error) {
        console.error('Failed to send notification:', error.message);
        return;
      }
      setModalOpen(false);
      setForm(EMPTY_SEND_FORM);
      setToast('Notification sent successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Send notification error:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Message Templates
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Message templates for common notifications. Create reusable templates for quick sending.
        </p>
      </GlassCard>

      {toast && (
        <GlassCard padding="16px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="success">Sent</Badge>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{toast}</span>
          </div>
        </GlassCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {TEMPLATES.map((template) => (
          <GlassCard key={template.name} padding="20px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{template.name}</p>
                <Badge variant={typeBadgeVariant(template.type)}>{template.type}</Badge>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {template.message}
              </p>
              <Button size="sm" variant="secondary" onClick={() => useTemplate(template)}>
                Use Template
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Send Notification" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="User ID (0 for all users)"
            type="number"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <Select
            label="Type"
            options={NOTIFICATION_TYPE_OPTIONS}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Button onClick={handleSend} loading={sending} fullWidth>
            Send Notification
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function NotificationsAdminTab() {
  const tabs: TabItem[] = [
    { key: 'notifications', label: 'Notifications', content: <NotificationsListTab /> },
    { key: 'messaging', label: 'Messaging', content: <MessagingTab /> },
    { key: 'contact-inbox', label: 'Contact Inbox', content: <ContactInboxTab /> },
    { key: 'templates', label: 'Templates', content: <TemplatesTab /> },
  ];

  return <Tabs tabs={tabs} defaultTab="notifications" />;
}

export default NotificationsAdminTab;
