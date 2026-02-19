import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Input, Select, Modal, Textarea } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
}

interface AdminSetting {
  id: number;
  setting_type: string;
  setting_key: string;
  setting_value: string | null;
}

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  status: string;
}

interface AdFormData {
  title: string;
  subtitle: string;
  description: string;
  offer: string;
  button_text: string;
  link: string;
  target_dashboards: string;
  is_active: boolean;
}

interface FrontendContentData {
  hero_heading: string;
  hero_subheading: string;
  hero_cta_text: string;
  hero_cta_link: string;
  feature_1: string;
  feature_2: string;
  feature_3: string;
  footer_company: string;
  footer_tagline: string;
  footer_copyright: string;
}

interface SeoSettingsData {
  site_title: string;
  meta_description: string;
  keywords: string;
  og_image_url: string;
  twitter_handle: string;
  google_analytics_id: string;
  facebook_pixel_id: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BLOG_STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

const TARGET_DASHBOARD_OPTIONS: SelectOption[] = [
  { value: 'user', label: 'User' },
  { value: 'family', label: 'Family' },
  { value: 'business', label: 'Business' },
  { value: 'all', label: 'All' },
];

const CONTACT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
];

const EMPTY_BLOG_FORM: BlogFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  author: '',
  status: 'draft',
};

const EMPTY_AD_FORM: AdFormData = {
  title: '',
  subtitle: '',
  description: '',
  offer: '',
  button_text: '',
  link: '',
  target_dashboards: 'all',
  is_active: true,
};

const EMPTY_CONTENT: FrontendContentData = {
  hero_heading: '',
  hero_subheading: '',
  hero_cta_text: '',
  hero_cta_link: '',
  feature_1: '',
  feature_2: '',
  feature_3: '',
  footer_company: '',
  footer_tagline: '',
  footer_copyright: '',
};

const EMPTY_SEO: SeoSettingsData = {
  site_title: '',
  meta_description: '',
  keywords: '',
  og_image_url: '',
  twitter_handle: '',
  google_analytics_id: '',
  facebook_pixel_id: '',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
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

/* ------------------------------------------------------------------ */
/*  Sub-tab: Blog Posts                                                */
/* ------------------------------------------------------------------ */

function BlogPostsContent() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tableError, setTableError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogFormData>(EMPTY_BLOG_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
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
      setTableError(false);
    } catch (err) {
      console.error('BlogPostsContent fetch error:', err);
      setTableError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;

  function openCreateModal() {
    setEditingPost(null);
    setForm(EMPTY_BLOG_FORM);
    setModalOpen(true);
  }

  function openEditModal(post: BlogPost) {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      author: post.author ?? '',
      status: post.status,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || null,
        excerpt: form.excerpt || null,
        content: form.content || null,
        author: form.author || null,
        status: form.status,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(payload)
          .eq('id', editingPost.id);
        if (error) console.error('Failed to update blog post:', error.message);
      } else {
        const { error } = await supabase.from('blog_posts').insert(payload);
        if (error) console.error('Failed to create blog post:', error.message);
      }
      setModalOpen(false);
      await fetchPosts();
    } catch (err) {
      console.error('Save blog post error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) console.error('Failed to delete blog post:', error.message);
      await fetchPosts();
    } catch (err) {
      console.error('Delete blog post error:', err);
    }
  }

  const columns: Column<BlogPost>[] = useMemo(
    () => [
      { key: 'title', header: 'Title', sortable: true },
      { key: 'author', header: 'Author', sortable: true, width: '150px', render: (row) => row.author ?? '--' },
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
        width: '140px',
        render: (row) => formatDate(row.published_at),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '160px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading blog posts...
      </div>
    );
  }

  if (tableError) {
    return (
      <GlassCard accent="pink" padding="40px">
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Blog posts table not configured yet.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            The blog_posts table does not exist or is not accessible. Create the table in your Supabase dashboard to enable blog management.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Posts" value={totalPosts} accent="purple" />
        <KpiCard label="Published" value={publishedCount} accent="teal" />
        <KpiCard label="Drafts" value={draftCount} accent="blue" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={openCreateModal}>Create Post</Button>
      </div>

      <GlassCard padding="0">
        <Table<BlogPost>
          columns={columns}
          data={posts}
          loading={false}
          emptyMessage="No blog posts found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPost ? 'Edit Post' : 'Create Post'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <Input label="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <Textarea
            label="Content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            style={{ minHeight: '200px' }}
          />
          <Input label="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <Select
            label="Status"
            options={BLOG_STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Button onClick={handleSave} loading={saving} fullWidth>
            {editingPost ? 'Update Post' : 'Create Post'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Advertisements                                            */
/* ------------------------------------------------------------------ */

function AdvertisementsContent() {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [form, setForm] = useState<AdFormData>(EMPTY_AD_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAds = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const totalAds = ads.length;
  const activeAds = ads.filter((a) => a.is_active).length;

  function openCreateModal() {
    setEditingAd(null);
    setForm(EMPTY_AD_FORM);
    setModalOpen(true);
  }

  function openEditModal(ad: Advertisement) {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      subtitle: ad.subtitle ?? '',
      description: ad.description ?? '',
      offer: ad.offer ?? '',
      button_text: ad.button_text ?? '',
      link: ad.link ?? '',
      target_dashboards: ad.target_dashboards ?? 'all',
      is_active: ad.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description || null,
        offer: form.offer || null,
        button_text: form.button_text || null,
        link: form.link || null,
        target_dashboards: form.target_dashboards,
        is_active: form.is_active,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(payload)
          .eq('id', editingAd.id);
        if (error) console.error('Failed to update ad:', error.message);
      } else {
        const { error } = await supabase.from('advertisements').insert(payload);
        if (error) console.error('Failed to create ad:', error.message);
      }
      setModalOpen(false);
      await fetchAds();
    } catch (err) {
      console.error('Save ad error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) console.error('Failed to delete ad:', error.message);
      await fetchAds();
    } catch (err) {
      console.error('Delete ad error:', err);
    }
  }

  const columns: Column<Advertisement>[] = useMemo(
    () => [
      { key: 'title', header: 'Title', sortable: true },
      {
        key: 'subtitle',
        header: 'Subtitle',
        width: '160px',
        render: (row) => row.subtitle ?? '--',
      },
      {
        key: 'target_dashboards',
        header: 'Target',
        width: '100px',
        render: (row) => row.target_dashboards ?? '--',
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
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '130px',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '160px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading advertisements...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Ads" value={totalAds} accent="purple" />
        <KpiCard label="Active Ads" value={activeAds} accent="teal" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={openCreateModal}>Create Ad</Button>
      </div>

      <GlassCard padding="0">
        <Table<Advertisement>
          columns={columns}
          data={ads}
          loading={false}
          emptyMessage="No advertisements found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAd ? 'Edit Advertisement' : 'Create Advertisement'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input label="Offer" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} />
          <Input label="Button Text" value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
          <Input label="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <Select
            label="Target Dashboards"
            options={TARGET_DASHBOARD_OPTIONS}
            value={form.target_dashboards}
            onChange={(e) => setForm({ ...form, target_dashboards: e.target.value })}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Active
            </label>
            <button
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                background: form.is_active
                  ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
                  : 'var(--surface-hover)',
                position: 'relative',
                transition: 'background 200ms ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: form.is_active ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  transition: 'left 200ms ease',
                }}
              />
            </button>
          </div>
          <Button onClick={handleSave} loading={saving} fullWidth>
            {editingAd ? 'Update Ad' : 'Create Ad'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Frontend Content                                          */
/* ------------------------------------------------------------------ */

function FrontendContentTab() {
  const [contentData, setContentData] = useState<FrontendContentData>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('setting_type', 'content');
        if (error) {
          console.error('Failed to fetch content settings:', error.message);
          return;
        }
        const settings = (data ?? []) as AdminSetting[];
        const obj: Record<string, string> = {};
        for (const s of settings) {
          obj[s.setting_key] = s.setting_value ?? '';
        }
        setContentData({
          hero_heading: obj['hero_heading'] ?? '',
          hero_subheading: obj['hero_subheading'] ?? '',
          hero_cta_text: obj['hero_cta_text'] ?? '',
          hero_cta_link: obj['hero_cta_link'] ?? '',
          feature_1: obj['feature_1'] ?? '',
          feature_2: obj['feature_2'] ?? '',
          feature_3: obj['feature_3'] ?? '',
          footer_company: obj['footer_company'] ?? '',
          footer_tagline: obj['footer_tagline'] ?? '',
          footer_copyright: obj['footer_copyright'] ?? '',
        });
      } catch (err) {
        console.error('Fetch content error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const entries = Object.entries(contentData);
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(
            { setting_type: 'content', setting_key: key, setting_value: value },
            { onConflict: 'setting_type,setting_key' },
          );
        if (error) console.error(`Failed to save ${key}:`, error.message);
      }
      setToast('Content saved successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Save content error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading frontend content...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Frontend Content Management
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Frontend content management allows editing of public page sections.
        </p>
      </GlassCard>

      {toast && (
        <GlassCard padding="16px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="success">Saved</Badge>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{toast}</span>
          </div>
        </GlassCard>
      )}

      <GlassCard padding="24px">
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Homepage Hero
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Heading"
            value={contentData.hero_heading}
            onChange={(e) => setContentData({ ...contentData, hero_heading: e.target.value })}
          />
          <Input
            label="Subheading"
            value={contentData.hero_subheading}
            onChange={(e) => setContentData({ ...contentData, hero_subheading: e.target.value })}
          />
          <Input
            label="CTA Text"
            value={contentData.hero_cta_text}
            onChange={(e) => setContentData({ ...contentData, hero_cta_text: e.target.value })}
          />
          <Input
            label="CTA Link"
            value={contentData.hero_cta_link}
            onChange={(e) => setContentData({ ...contentData, hero_cta_link: e.target.value })}
          />
        </div>
      </GlassCard>

      <GlassCard padding="24px">
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Features Section
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Feature 1 Title"
            value={contentData.feature_1}
            onChange={(e) => setContentData({ ...contentData, feature_1: e.target.value })}
          />
          <Input
            label="Feature 2 Title"
            value={contentData.feature_2}
            onChange={(e) => setContentData({ ...contentData, feature_2: e.target.value })}
          />
          <Input
            label="Feature 3 Title"
            value={contentData.feature_3}
            onChange={(e) => setContentData({ ...contentData, feature_3: e.target.value })}
          />
        </div>
      </GlassCard>

      <GlassCard padding="24px">
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Footer
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Company Name"
            value={contentData.footer_company}
            onChange={(e) => setContentData({ ...contentData, footer_company: e.target.value })}
          />
          <Input
            label="Tagline"
            value={contentData.footer_tagline}
            onChange={(e) => setContentData({ ...contentData, footer_tagline: e.target.value })}
          />
          <Input
            label="Copyright Text"
            value={contentData.footer_copyright}
            onChange={(e) => setContentData({ ...contentData, footer_copyright: e.target.value })}
          />
        </div>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      <GlassCard padding="16px">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Note: Changes require frontend rebuild to take effect.
        </p>
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: SEO Settings                                              */
/* ------------------------------------------------------------------ */

function SeoSettingsContent() {
  const [seoData, setSeoData] = useState<SeoSettingsData>(EMPTY_SEO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeo() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('setting_type', 'seo');
        if (error) {
          console.error('Failed to fetch SEO settings:', error.message);
          return;
        }
        const settings = (data ?? []) as AdminSetting[];
        const obj: Record<string, string> = {};
        for (const s of settings) {
          obj[s.setting_key] = s.setting_value ?? '';
        }
        setSeoData({
          site_title: obj['site_title'] ?? '',
          meta_description: obj['meta_description'] ?? '',
          keywords: obj['keywords'] ?? '',
          og_image_url: obj['og_image_url'] ?? '',
          twitter_handle: obj['twitter_handle'] ?? '',
          google_analytics_id: obj['google_analytics_id'] ?? '',
          facebook_pixel_id: obj['facebook_pixel_id'] ?? '',
        });
      } catch (err) {
        console.error('Fetch SEO error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSeo();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const entries = Object.entries(seoData);
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(
            { setting_type: 'seo', setting_key: key, setting_value: value },
            { onConflict: 'setting_type,setting_key' },
          );
        if (error) console.error(`Failed to save SEO ${key}:`, error.message);
      }
      setToast('SEO settings saved successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Save SEO error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading SEO settings...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {toast && (
        <GlassCard padding="16px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="success">Saved</Badge>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{toast}</span>
          </div>
        </GlassCard>
      )}

      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          SEO Settings
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Site Title"
            value={seoData.site_title}
            onChange={(e) => setSeoData({ ...seoData, site_title: e.target.value })}
          />
          <Input
            label="Meta Description"
            value={seoData.meta_description}
            onChange={(e) => setSeoData({ ...seoData, meta_description: e.target.value })}
          />
          <Input
            label="Keywords (comma-separated)"
            value={seoData.keywords}
            onChange={(e) => setSeoData({ ...seoData, keywords: e.target.value })}
          />
          <Input
            label="OG Image URL"
            value={seoData.og_image_url}
            onChange={(e) => setSeoData({ ...seoData, og_image_url: e.target.value })}
          />
          <Input
            label="Twitter Handle"
            value={seoData.twitter_handle}
            onChange={(e) => setSeoData({ ...seoData, twitter_handle: e.target.value })}
          />
          <Input
            label="Google Analytics ID"
            value={seoData.google_analytics_id}
            onChange={(e) => setSeoData({ ...seoData, google_analytics_id: e.target.value })}
          />
          <Input
            label="Facebook Pixel ID"
            value={seoData.facebook_pixel_id}
            onChange={(e) => setSeoData({ ...seoData, facebook_pixel_id: e.target.value })}
          />
        </div>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleSave} loading={saving}>
          Save SEO Settings
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-tab: Contact Messages                                          */
/* ------------------------------------------------------------------ */

function ContactMessagesContent() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const totalMessages = messages.length;
  const unreadCount = messages.filter((m) => m.status === 'new').length;

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

  const columns: Column<ContactMessage>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, width: '160px' },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        width: '220px',
        render: (row) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {row.email}
          </span>
        ),
      },
      { key: 'subject', header: 'Subject', sortable: true, render: (row) => row.subject ?? '--' },
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
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading contact messages...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Messages" value={totalMessages} accent="purple" />
        <KpiCard label="Unread" value={unreadCount} accent="pink" />
      </div>

      <GlassCard padding="0">
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

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ContentMarketingTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'blog', label: 'Blog Posts', content: <BlogPostsContent /> },
      { key: 'ads', label: 'Advertisements', content: <AdvertisementsContent /> },
      { key: 'frontend', label: 'Frontend Content', content: <FrontendContentTab /> },
      { key: 'seo', label: 'SEO Settings', content: <SeoSettingsContent /> },
      { key: 'contact', label: 'Contact Messages', content: <ContactMessagesContent /> },
    ],
    [],
  );

  return <Tabs tabs={tabs} defaultTab="blog" />;
}

export default ContentMarketingTab;
