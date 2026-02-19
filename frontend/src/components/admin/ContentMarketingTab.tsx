import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Tabs } from '@/components/ui';
import type { Column, TabItem } from '@/components/ui';

/* ---------- Types ---------- */

interface BlogPost {
  id: number;
  title: string;
  slug: string | null;
  content: string | null;
  excerpt: string | null;
  author: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Advertisement {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  offer: string | null;
  button_text: string | null;
  link: string | null;
  gradient: string | null;
  target_dashboards: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
}

/* ---------- Helpers ---------- */

function formatDate(dateString: string | null): string {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/* ---------- Blog Posts Tab ---------- */

function BlogPostsContent() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tableError, setTableError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase
          .from('blog_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (result.error) {
          console.error('Blog posts query error:', result.error);
          setTableError(true);
          return;
        }

        setPosts((result.data ?? []) as BlogPost[]);
      } catch (err) {
        console.error('BlogPostsContent fetch error:', err);
        setTableError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalPosts = useMemo(() => posts.length, [posts]);
  const publishedCount = useMemo(() => posts.filter((p) => p.status === 'published').length, [posts]);
  const draftCount = useMemo(() => posts.filter((p) => p.status === 'draft').length, [posts]);

  const columns: Column<BlogPost>[] = useMemo(
    () => [
      { key: 'title', header: 'Title', sortable: true },
      { key: 'author', header: 'Author', sortable: true, width: '150px' },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '120px',
        render: (row) => (
          <Badge variant={row.status === 'published' ? 'success' : 'warning'}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        ),
      },
      {
        key: 'published_at',
        header: 'Published Date',
        sortable: true,
        width: '150px',
        render: (row) => formatDate(row.published_at),
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading blog posts...
      </div>
    );
  }

  if (tableError) {
    return (
      <GlassCard accent="pink" padding="40px">
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#F8FAFC',
              marginBottom: '8px',
            }}
          >
            Blog posts table not configured yet
          </p>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(248,250,252,0.5)',
            }}
          >
            The blog_posts table does not exist or is not accessible. Create the table in your Supabase dashboard to enable blog management.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Posts" value={formatNumber(totalPosts)} accent="purple" />
        <KpiCard label="Published" value={formatNumber(publishedCount)} accent="teal" />
        <KpiCard label="Drafts" value={formatNumber(draftCount)} accent="blue" />
      </div>

      <GlassCard accent="purple" padding="0">
        <Table<BlogPost>
          columns={columns}
          data={posts}
          loading={false}
          emptyMessage="No blog posts found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ---------- Advertisements Tab ---------- */

function AdvertisementsContent() {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Advertisement[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase
          .from('advertisements')
          .select('*')
          .order('created_at', { ascending: false });

        setAds((result.data ?? []) as Advertisement[]);
      } catch (err) {
        console.error('AdvertisementsContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalAds = useMemo(() => ads.length, [ads]);
  const activeAds = useMemo(() => ads.filter((a) => a.is_active).length, [ads]);

  const columns: Column<Advertisement>[] = useMemo(
    () => [
      { key: 'title', header: 'Title', sortable: true },
      {
        key: 'target_dashboards',
        header: 'Target Dashboards',
        width: '180px',
        render: (row) => (
          <span style={{ color: 'rgba(248,250,252,0.7)', fontSize: '13px' }}>
            {row.target_dashboards ?? '--'}
          </span>
        ),
      },
      {
        key: 'start_date',
        header: 'Start Date',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'end_date',
        header: 'End Date',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.end_date),
      },
      {
        key: 'is_active',
        header: 'Active',
        width: '100px',
        render: (row) => (
          <Badge variant={row.is_active ? 'success' : 'default'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading advertisements...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Ads" value={formatNumber(totalAds)} accent="purple" />
        <KpiCard label="Active Ads" value={formatNumber(activeAds)} accent="teal" />
      </div>

      <GlassCard accent="blue" padding="0">
        <Table<Advertisement>
          columns={columns}
          data={ads}
          loading={false}
          emptyMessage="No advertisements found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ---------- Contact Messages Tab ---------- */

function ContactMessagesContent() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });

        setMessages((result.data ?? []) as ContactMessage[]);
      } catch (err) {
        console.error('ContactMessagesContent fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalMessages = useMemo(() => messages.length, [messages]);
  const unreadCount = useMemo(
    () =>
      messages.filter(
        (m) => m.status === 'new' || m.status === 'unread',
      ).length,
    [messages],
  );

  const statusBadgeVariant = (status: string | null): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status) {
      case 'new':
      case 'unread':
        return 'warning';
      case 'read':
        return 'info';
      case 'replied':
        return 'success';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const columns: Column<ContactMessage>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, width: '160px' },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        width: '220px',
        render: (row) => (
          <span style={{ color: 'rgba(248,250,252,0.7)', fontSize: '13px' }}>
            {row.email}
          </span>
        ),
      },
      { key: 'subject', header: 'Subject', sortable: true },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => (
          <Badge variant={statusBadgeVariant(row.status)}>
            {row.status
              ? row.status.charAt(0).toUpperCase() + row.status.slice(1)
              : 'Unknown'}
          </Badge>
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(248,250,252,0.4)' }}>
        Loading contact messages...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard label="Total Messages" value={formatNumber(totalMessages)} accent="purple" />
        <KpiCard label="Unread" value={formatNumber(unreadCount)} accent="pink" />
      </div>

      <GlassCard accent="teal" padding="0">
        <Table<ContactMessage>
          columns={columns}
          data={messages}
          loading={false}
          emptyMessage="No contact messages found"
          pageSize={15}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function ContentMarketingTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      {
        key: 'blog',
        label: 'Blog Posts',
        content: <BlogPostsContent />,
      },
      {
        key: 'ads',
        label: 'Advertisements',
        content: <AdvertisementsContent />,
      },
      {
        key: 'contact',
        label: 'Contact Messages',
        content: <ContactMessagesContent />,
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#F8FAFC',
        }}
      >
        Content and Marketing
      </p>
      <Tabs tabs={tabs} defaultTab="blog" />
    </div>
  );
}
