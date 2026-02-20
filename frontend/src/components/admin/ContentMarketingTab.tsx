import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { generateBlogPost } from '@/services/api';
import { renderMarkdown } from '@/utils/markdown';
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
  featured_image: string | null;
  author: string | null;
  status: 'draft' | 'published';
  category: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  meta_robots: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  ai_seo_score: number;
  read_time: number;
  word_count: number;
  views: number;
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

interface GeneratedBlog {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  tags: string[];
  category: string;
}

interface AiGenerateForm {
  topic: string;
  keywords: string;
  tone: string;
}

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  author: string;
  status: string;
  category: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  meta_robots: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
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
  featured_image: '',
  author: '',
  status: 'draft',
  category: '',
  tags: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  meta_robots: 'index,follow',
  canonical_url: '',
  og_title: '',
  og_description: '',
  og_image: '',
};

const META_ROBOTS_OPTIONS: SelectOption[] = [
  { value: 'index,follow', label: 'Index, Follow' },
  { value: 'noindex,follow', label: 'No Index, Follow' },
  { value: 'index,nofollow', label: 'Index, No Follow' },
  { value: 'noindex,nofollow', label: 'No Index, No Follow' },
];

const EMPTY_AI_FORM: AiGenerateForm = {
  topic: '',
  keywords: '',
  tone: 'professional',
};

const TONE_OPTIONS: SelectOption[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'educational', label: 'Educational' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'friendly', label: 'Friendly' },
];

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function calcReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

function calcSeoScore(form: BlogFormData): number {
  let score = 0;
  if (form.title.length >= 10) score += 10;
  if (form.title.length >= 30 && form.title.length <= 70) score += 5;
  if (form.slug) score += 5;
  if (form.excerpt && form.excerpt.length >= 50) score += 10;
  if (form.content && countWords(form.content) >= 300) score += 15;
  if (form.seo_title && form.seo_title.length >= 30 && form.seo_title.length <= 60) score += 15;
  if (form.seo_description && form.seo_description.length >= 120 && form.seo_description.length <= 160) score += 15;
  if (form.seo_keywords) score += 5;
  if (form.canonical_url) score += 5;
  if (form.category) score += 5;
  if (form.tags) score += 5;
  if (form.featured_image || form.og_image) score += 5;
  return Math.min(100, score);
}

function seoScoreColor(score: number): string {
  if (score >= 80) return '#34D399';
  if (score >= 50) return '#FBBF24';
  return '#EF4444';
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
  const [modalEditorTab, setModalEditorTab] = useState<'content' | 'seo'>('content');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiForm, setAiForm] = useState<AiGenerateForm>(EMPTY_AI_FORM);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabaseAdmin
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
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
    setModalEditorTab('content');
    setModalOpen(true);
  }

  function openEditModal(post: BlogPost) {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      featured_image: post.featured_image ?? '',
      author: post.author ?? '',
      status: post.status,
      category: post.category ?? '',
      tags: (post.tags ?? []).join(', '),
      seo_title: post.seo_title ?? '',
      seo_description: post.seo_description ?? '',
      seo_keywords: post.seo_keywords ?? '',
      meta_robots: post.meta_robots ?? 'index,follow',
      canonical_url: post.canonical_url ?? '',
      og_title: post.og_title ?? '',
      og_description: post.og_description ?? '',
      og_image: post.og_image ?? '',
    });
    setModalEditorTab('content');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const wc = countWords(form.content);
      const tagsArray = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt || null,
        content: form.content || null,
        featured_image: form.featured_image || null,
        author: form.author || null,
        status: form.status,
        category: form.category || null,
        tags: tagsArray,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords || null,
        meta_robots: form.meta_robots || 'index,follow',
        canonical_url: form.canonical_url || null,
        og_title: form.og_title || null,
        og_description: form.og_description || null,
        og_image: form.og_image || null,
        ai_seo_score: calcSeoScore(form),
        word_count: wc,
        read_time: calcReadTime(wc),
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabaseAdmin
          .from('blog_posts')
          .update(payload)
          .eq('id', editingPost.id);
        if (error) console.error('Failed to update blog post:', error.message);
      } else {
        const { error } = await supabaseAdmin.from('blog_posts').insert(payload);
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
      const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', id);
      if (error) console.error('Failed to delete blog post:', error.message);
      await fetchPosts();
    } catch (err) {
      console.error('Delete blog post error:', err);
    }
  }

  function openAiModal() {
    setAiForm(EMPTY_AI_FORM);
    setAiError(null);
    setAiModalOpen(true);
  }

  async function handleAiGenerate() {
    if (!aiForm.topic.trim()) {
      setAiError('Please enter a topic for the blog post.');
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    try {
      const keywords = aiForm.keywords.trim()
        ? aiForm.keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : undefined;
      const tone = aiForm.tone || undefined;

      const { data, error } = await generateBlogPost(aiForm.topic.trim(), keywords, tone);

      if (error) {
        setAiError(error);
        return;
      }

      if (!data) {
        setAiError('No content was returned. Please try again.');
        return;
      }

      // Populate the blog editor form with the generated data
      setEditingPost(null);
      setForm({
        title: data.title ?? '',
        slug: data.slug ?? '',
        excerpt: data.excerpt ?? '',
        content: data.content ?? '',
        featured_image: '',
        author: '',
        status: 'draft',
        category: data.category ?? '',
        tags: (data.tags ?? []).join(', '),
        seo_title: data.seo_title ?? '',
        seo_description: data.seo_description ?? '',
        seo_keywords: data.seo_keywords ?? '',
        meta_robots: 'index,follow',
        canonical_url: '',
        og_title: data.title ?? '',
        og_description: data.seo_description ?? '',
        og_image: '',
      });

      // Close AI modal and open the blog editor modal
      setAiModalOpen(false);
      setModalOpen(true);
    } catch (err) {
      console.error('AI blog generation error:', err);
      setAiError('An unexpected error occurred. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  }

  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function openPreview(post: BlogPost) {
    setPreviewPost(post);
    setPreviewOpen(true);
  }

  const columns: Column<BlogPost>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (row) => (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {row.title}
            </div>
            {row.excerpt && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '4px' }}>
                {truncate(row.excerpt, 100)}
              </div>
            )}
            {row.tags && row.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {row.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      padding: '1px 8px',
                      borderRadius: '10px',
                      background: 'rgba(59,130,246,0.15)',
                      color: '#3B82F6',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        sortable: true,
        width: '120px',
        render: (row) => row.category ?? '--',
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '110px',
        render: (row) => (
          <Badge variant={row.status === 'published' ? 'success' : 'warning'}>
            {row.status}
          </Badge>
        ),
      },
      {
        key: 'ai_seo_score',
        header: 'SEO Score',
        sortable: true,
        width: '100px',
        render: (row) => (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              fontSize: '13px',
              fontWeight: 700,
              color: seoScoreColor(row.ai_seo_score),
              border: `2px solid ${seoScoreColor(row.ai_seo_score)}`,
            }}
          >
            {row.ai_seo_score}
          </span>
        ),
      },
      {
        key: 'views',
        header: 'Views',
        sortable: true,
        width: '80px',
        render: (row) => row.views.toLocaleString(),
      },
      {
        key: 'published_at',
        header: 'Published',
        sortable: true,
        width: '120px',
        render: (row) => formatDate(row.published_at),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '120px',
        render: (row) => (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => openPreview(row)}
              title="Preview"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button
              onClick={() => openEditModal(row)}
              title="Edit"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              title="Delete"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#EF4444',
                padding: '4px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <Button variant="secondary" onClick={openAiModal}>
          AI Generate
        </Button>
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

      {/* ---- Rich Blog Editor Modal ---- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}
        size="xl"
      >
        {(() => {
          const wc = countWords(form.content);
          const rt = calcReadTime(wc);
          const seoScore = calcSeoScore(form);
          const [editorTab, setEditorTab] = [modalEditorTab, setModalEditorTab];

          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', maxHeight: '700px' }}>
              {/* Top action bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
                {editingPost && (
                  <button
                    onClick={() => openPreview(editingPost)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Preview
                  </button>
                )}
              </div>

              {/* Main layout: sidebar + content */}
              <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
                {/* Left Sidebar */}
                <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  {/* SEO Score */}
                  <GlassCard padding="16px">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>SEO Score</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        padding: '16px 0',
                        borderRadius: '8px',
                        background: `${seoScoreColor(seoScore)}15`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '32px', fontWeight: 700, color: seoScoreColor(seoScore) }}>
                        {seoScore}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SEO Score</div>
                    </div>
                  </GlassCard>

                  {/* Post Settings */}
                  <GlassCard padding="16px">
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                      Post Settings
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <Input
                        label="Category"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        placeholder="e.g., Investing, Finance, Educ..."
                        style={{ fontSize: '12px' }}
                      />
                      <Input
                        label="Tags"
                        value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="Add tag and press Enter"
                        style={{ fontSize: '12px' }}
                      />
                      <Select
                        label="Status"
                        options={BLOG_STATUS_OPTIONS}
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      />
                      <Input
                        label="Author"
                        value={form.author}
                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                        placeholder="Author name"
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  </GlassCard>

                  {/* Featured Image */}
                  <GlassCard padding="16px">
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                      Featured Image
                    </div>
                    {form.featured_image && (
                      <div style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img
                          src={form.featured_image}
                          alt="Featured"
                          style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px dashed var(--border-subtle)',
                        background: 'transparent',
                        color: '#3B82F6',
                        cursor: 'pointer',
                        fontSize: '13px',
                        marginBottom: '8px',
                      }}
                      onClick={() => {
                        const url = prompt('Enter image URL:');
                        if (url) setForm({ ...form, featured_image: url });
                      }}
                    >
                      Upload Image
                    </button>
                    <Input
                      value={form.featured_image}
                      onChange={(e) => setForm({ ...form, featured_image: e.target.value })}
                      placeholder="https://example.com/image..."
                      style={{ fontSize: '11px' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Or enter image URL
                    </div>
                  </GlassCard>
                </div>

                {/* Right Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Content / SEO tab switcher */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setEditorTab('content')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: editorTab === 'content' ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: editorTab === 'content' ? '#3B82F6' : 'var(--text-muted)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Content
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('seo')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: editorTab === 'seo' ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: editorTab === 'seo' ? '#3B82F6' : 'var(--text-muted)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      SEO
                    </button>
                  </div>

                  {/* Tab content */}
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {editorTab === 'content' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Title + Generate with AI */}
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Title *
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <Input
                                value={form.title}
                                onChange={(e) => {
                                  const title = e.target.value;
                                  setForm({
                                    ...form,
                                    title,
                                    slug: form.slug || slugify(title),
                                  });
                                }}
                                placeholder="Enter blog post title"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={openAiModal}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                              Generate with AI
                            </button>
                          </div>
                        </div>

                        <Input
                          label="Slug"
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          placeholder="url-friendly-slug"
                        />

                        <Textarea
                          label="Excerpt"
                          value={form.excerpt}
                          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                          placeholder="Brief description of the post"
                          style={{ minHeight: '80px' }}
                        />

                        {/* Content with toolbar */}
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Content *
                          </label>

                          {/* Toolbar */}
                          <div
                            style={{
                              display: 'flex',
                              gap: '4px',
                              padding: '6px 8px',
                              borderRadius: '6px 6px 0 0',
                              border: '1px solid var(--border-subtle)',
                              borderBottom: 'none',
                              background: 'var(--surface-row-hover)',
                              flexWrap: 'wrap',
                            }}
                          >
                            {[
                              {
                                label: 'Add Link',
                                icon: (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/>
                                    <line x1="10" y1="14" x2="21" y2="3"/>
                                  </svg>
                                ),
                                color: '#34D399',
                                action: () => {
                                  const url = prompt('Enter URL:');
                                  const text = prompt('Link text:') || url;
                                  if (url) {
                                    setForm({ ...form, content: form.content + `[${text}](${url})` });
                                  }
                                },
                              },
                              {
                                label: 'B',
                                action: () => setForm({ ...form, content: form.content + '**bold text**' }),
                              },
                              {
                                label: 'I',
                                italic: true,
                                action: () => setForm({ ...form, content: form.content + '*italic text*' }),
                              },
                              {
                                label: 'List',
                                icon: (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="8" y1="6" x2="21" y2="6"/>
                                    <line x1="8" y1="12" x2="21" y2="12"/>
                                    <line x1="8" y1="18" x2="21" y2="18"/>
                                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                                  </svg>
                                ),
                                color: '#818CF8',
                                action: () => setForm({ ...form, content: form.content + '\n- Item 1\n- Item 2\n- Item 3\n' }),
                              },
                              {
                                label: 'Image',
                                icon: (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                ),
                                color: '#3B82F6',
                                action: () => {
                                  const url = prompt('Image URL:');
                                  if (url) setForm({ ...form, content: form.content + `\n![Image](${url})\n` });
                                },
                              },
                              {
                                label: 'Chart',
                                icon: (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="20" x2="18" y2="10"/>
                                    <line x1="12" y1="20" x2="12" y2="4"/>
                                    <line x1="6" y1="20" x2="6" y2="14"/>
                                  </svg>
                                ),
                                color: '#34D399',
                                action: () => setForm({ ...form, content: form.content + '\n```chart\n{"type":"bar","data":[10,20,30]}\n```\n' }),
                              },
                            ].map((btn) => (
                              <button
                                key={btn.label}
                                type="button"
                                onClick={btn.action}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'transparent',
                                  color: btn.color ?? 'var(--text-primary)',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: btn.label === 'B' ? 700 : 500,
                                  fontStyle: btn.italic ? 'italic' : 'normal',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {btn.icon ?? null}
                                {btn.label}
                              </button>
                            ))}
                          </div>

                          <div
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              color: '#FBBF24',
                              background: 'rgba(251,191,36,0.05)',
                              border: '1px solid var(--border-subtle)',
                              borderBottom: 'none',
                              borderTop: 'none',
                            }}
                          >
                            Tip: To add a hyperlink, click &quot;Add Link&quot; and enter the URL. You can also select text first to use it as the link text.
                          </div>

                          <textarea
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                            placeholder="Write your blog post content here... Use the toolbar above to add links and formatting."
                            style={{
                              width: '100%',
                              minHeight: '200px',
                              padding: '12px',
                              borderRadius: '0 0 6px 6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--surface-card)',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              lineHeight: 1.6,
                              resize: 'vertical',
                              fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      /* SEO Tab */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <Input
                            label="SEO Title"
                            value={form.seo_title}
                            onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                            placeholder="SEO optimized title (30-60 characters)"
                          />
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {form.seo_title.length}/60 characters
                          </div>
                        </div>

                        <div>
                          <Textarea
                            label="Meta Description"
                            value={form.seo_description}
                            onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                            placeholder="Meta description (120-160 characters)"
                            style={{ minHeight: '80px' }}
                          />
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {form.seo_description.length}/160 characters
                          </div>
                        </div>

                        <Input
                          label="Focus Keywords"
                          value={form.seo_keywords}
                          onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
                          placeholder="keyword1, keyword2, keyword3"
                        />

                        <Input
                          label="Canonical URL"
                          value={form.canonical_url}
                          onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
                          placeholder="https://kamioi.com/blog/post-url"
                        />

                        <Select
                          label="Meta Robots"
                          options={META_ROBOTS_OPTIONS}
                          value={form.meta_robots}
                          onChange={(e) => setForm({ ...form, meta_robots: e.target.value })}
                        />

                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '6px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                            Open Graph
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Input
                              label="OG Title"
                              value={form.og_title}
                              onChange={(e) => setForm({ ...form, og_title: e.target.value })}
                              placeholder="Title for social media sharing"
                            />
                            <Textarea
                              label="OG Description"
                              value={form.og_description}
                              onChange={(e) => setForm({ ...form, og_description: e.target.value })}
                              placeholder="Description for social media"
                              style={{ minHeight: '60px' }}
                            />
                            <Input
                              label="OG Image URL"
                              value={form.og_image}
                              onChange={(e) => setForm({ ...form, og_image: e.target.value })}
                              placeholder="https://example.com/og-image.jpg"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--border-subtle)',
                      marginTop: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {wc} words ~ {rt} min read
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="secondary" onClick={() => setModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} loading={saving}>
                        {editingPost ? 'Update Post' : 'Create Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ---- Post Preview Modal ---- */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Post Preview"
        size="xl"
      >
        {previewPost && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px' }}>
            {previewPost.featured_image && (
              <img
                src={previewPost.featured_image}
                alt={previewPost.title}
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }}
              />
            )}
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {previewPost.title}
            </h1>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {previewPost.author && <span>By {previewPost.author}</span>}
              {previewPost.published_at && <span>{formatDate(previewPost.published_at)}</span>}
              <span>{previewPost.read_time} min read</span>
              <span>{previewPost.views} views</span>
            </div>
            {previewPost.tags && previewPost.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {previewPost.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      background: 'rgba(59,130,246,0.15)',
                      color: '#3B82F6',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {previewPost.excerpt && (
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontStyle: 'italic' }}>
                {previewPost.excerpt}
              </p>
            )}
            <div
              style={{ fontSize: '15px', color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(previewPost.content ?? '') }}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={aiModalOpen}
        onClose={() => { if (!aiGenerating) setAiModalOpen(false); }}
        title="AI Blog Generator"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GlassCard padding="16px">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Describe a topic and optionally provide keywords. The AI will generate a full blog
              post including title, content, excerpt, and SEO metadata. You can review and edit
              everything before saving.
            </p>
          </GlassCard>

          <Input
            label="Topic"
            value={aiForm.topic}
            onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
            placeholder="e.g. How micro-investing helps college students build wealth"
          />
          <Input
            label="Keywords (optional, comma-separated)"
            value={aiForm.keywords}
            onChange={(e) => setAiForm({ ...aiForm, keywords: e.target.value })}
            placeholder="e.g. micro-investing, round-ups, savings"
          />
          <Select
            label="Tone"
            options={TONE_OPTIONS}
            value={aiForm.tone}
            onChange={(e) => setAiForm({ ...aiForm, tone: e.target.value })}
          />

          {aiError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{aiError}</p>
            </div>
          )}

          <Button onClick={handleAiGenerate} loading={aiGenerating} fullWidth>
            {aiGenerating ? 'Generating...' : 'Generate Blog Post'}
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
      const result = await supabaseAdmin
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
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
        const { error } = await supabaseAdmin
          .from('advertisements')
          .update(payload)
          .eq('id', editingAd.id);
        if (error) console.error('Failed to update ad:', error.message);
      } else {
        const { error } = await supabaseAdmin.from('advertisements').insert(payload);
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
      const { error } = await supabaseAdmin.from('advertisements').delete().eq('id', id);
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
        const { data, error } = await supabaseAdmin
          .from('admin_settings')
          .select('*')
          .eq('setting_type', 'content')
          .limit(200);
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
        const { error } = await supabaseAdmin
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
        const { data, error } = await supabaseAdmin
          .from('admin_settings')
          .select('*')
          .eq('setting_type', 'seo')
          .limit(200);
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
        const { error } = await supabaseAdmin
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
      const result = await supabaseAdmin
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
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
      const { error } = await supabaseAdmin
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
