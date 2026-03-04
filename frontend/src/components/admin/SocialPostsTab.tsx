import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import {
  generateSocialPosts,
  publishSocialPost,
  testSocialConnection,
  type SocialPost,
  type SocialPlatform,
  type SocialPostStatus,
  type GeneratedSocialPost,
} from '@/services/api'
import { GlassCard } from '@/components/ui/GlassCard'
import { KpiCard } from '@/components/ui/KpiCard'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { Input, Textarea } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PLATFORM_OPTIONS: SelectOption[] = [
  { value: 'TWITTER', label: 'Twitter / X' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
]

const TONE_OPTIONS: SelectOption[] = [
  { value: 'Informative', label: 'Informative' },
  { value: 'Engaging', label: 'Engaging' },
  { value: 'Promotional', label: 'Promotional' },
  { value: 'Controversial', label: 'Controversial' },
]

const CHAR_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  FACEBOOK: 2000,
  INSTAGRAM: 2200,
  TIKTOK: 2200,
}

const PLATFORM_LABELS: Record<string, string> = {
  TWITTER: 'Twitter / X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
}

const UNSUPPORTED_PUBLISH: Set<string> = new Set(['INSTAGRAM', 'TIKTOK'])

function statusBadgeVariant(status: SocialPostStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'PUBLISHED': return 'success'
    case 'SCHEDULED': return 'info'
    case 'DRAFT': return 'default'
    case 'FAILED': return 'error'
    case 'CANCELLED': return 'warning'
  }
}

function charCountColor(len: number, max: number): string {
  const ratio = len / max
  if (ratio > 1) return '#EF4444'
  if (ratio > 0.9) return '#FBBF24'
  return '#34D399'
}

/* ------------------------------------------------------------------ */
/*  Platform toggle button style                                       */
/* ------------------------------------------------------------------ */

function platformPillStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid',
    borderColor: selected ? 'rgba(124,58,237,0.5)' : 'var(--border-subtle)',
    background: selected ? 'rgba(124,58,237,0.12)' : 'transparent',
    color: selected ? '#7C3AED' : 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 200ms ease',
  }
}

/* ------------------------------------------------------------------ */
/*  Toggle switch helper                                               */
/* ------------------------------------------------------------------ */

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          background: checked ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : 'var(--surface-input)',
          border: `1px solid ${checked ? 'rgba(124,58,237,0.5)' : 'var(--border-subtle)'}`,
          position: 'relative',
          transition: 'all 200ms ease',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'left 200ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
    </label>
  )
}

/* ================================================================== */
/*  TAB 1: Generator                                                   */
/* ================================================================== */

function GeneratorTab() {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('Informative')
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])
  const [generating, setGenerating] = useState(false)
  const [drafts, setDrafts] = useState<GeneratedSocialPost[]>([])
  const [editedContent, setEditedContent] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [genError, setGenError] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({})

  function togglePlatform(p: SocialPlatform) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleGenerate() {
    if (!topic.trim() || selectedPlatforms.length === 0) return
    setGenerating(true)
    setGenError(null)
    setDrafts([])

    const { data, error } = await generateSocialPosts(topic, tone, selectedPlatforms)

    if (error) {
      setGenError(error)
    } else if (data?.generated) {
      setDrafts(data.generated)
      const edited: Record<string, string> = {}
      for (const d of data.generated) edited[d.platform] = d.content
      setEditedContent(edited)
    }

    setGenerating(false)
  }

  async function handleApprove(draft: GeneratedSocialPost) {
    setSaving(prev => ({ ...prev, [draft.platform]: true }))

    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(9, 0, 0, 0)

    await supabaseAdmin.from('social_media_posts').insert({
      platform: draft.platform,
      content: editedContent[draft.platform] ?? draft.content,
      status: 'SCHEDULED',
      hashtags: draft.hashtags,
      image_prompt: draft.image_prompt,
      scheduled_at: tomorrow.toISOString(),
    })

    setDrafts(prev => prev.filter(d => d.platform !== draft.platform))
    setSaving(prev => ({ ...prev, [draft.platform]: false }))
  }

  async function handleSaveDraft(draft: GeneratedSocialPost) {
    setSaving(prev => ({ ...prev, [draft.platform]: true }))

    await supabaseAdmin.from('social_media_posts').insert({
      platform: draft.platform,
      content: editedContent[draft.platform] ?? draft.content,
      status: 'DRAFT',
      hashtags: draft.hashtags,
      image_prompt: draft.image_prompt,
    })

    setDrafts(prev => prev.filter(d => d.platform !== draft.platform))
    setSaving(prev => ({ ...prev, [draft.platform]: false }))
  }

  function handleDiscard(platform: string) {
    setDrafts(prev => prev.filter(d => d.platform !== platform))
  }

  function handleCopy(platform: string) {
    navigator.clipboard.writeText(editedContent[platform] ?? '')
    setCopyFeedback(prev => ({ ...prev, [platform]: true }))
    setTimeout(() => setCopyFeedback(prev => ({ ...prev, [platform]: false })), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          AI Post Generator
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Topic / Theme"
            placeholder="e.g., Benefits of micro-investing for Gen Z"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select label="Tone" options={TONE_OPTIONS} value={tone} onChange={e => setTone(e.target.value)} />
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Platforms
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PLATFORM_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value as SocialPlatform)}
                    style={platformPillStyle(selectedPlatforms.includes(p.value as SocialPlatform))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!topic.trim() || selectedPlatforms.length === 0}
          >
            Generate All
          </Button>

          {genError && (
            <p style={{ fontSize: '13px', color: '#EF4444' }}>{genError}</p>
          )}
        </div>
      </GlassCard>

      {/* Generated drafts */}
      {drafts.map(draft => {
        const platform = draft.platform as SocialPlatform
        const limit = CHAR_LIMITS[platform] ?? 2200
        const currentContent = editedContent[draft.platform] ?? draft.content
        const charLen = currentContent.length
        const isSaving = saving[draft.platform] ?? false

        return (
          <GlassCard key={draft.platform} padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Badge variant="purple">{PLATFORM_LABELS[draft.platform] ?? draft.platform}</Badge>
                <span style={{ fontSize: '13px', fontWeight: 600, color: charCountColor(charLen, limit) }}>
                  {charLen}/{limit}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(draft.platform)}>
                  {copyFeedback[draft.platform] ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleSaveDraft(draft)} loading={isSaving}>
                  Save Draft
                </Button>
                <Button size="sm" variant="primary" onClick={() => handleApprove(draft)} loading={isSaving}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDiscard(draft.platform)}>
                  Discard
                </Button>
              </div>
            </div>

            <Textarea
              value={currentContent}
              onChange={e => setEditedContent(prev => ({ ...prev, [draft.platform]: e.target.value }))}
              style={{ minHeight: '120px' }}
            />

            {draft.hashtags.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Hashtags: </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {draft.hashtags.map(t => (t.startsWith('#') ? t : `#${t}`)).join('  ')}
                </span>
              </div>
            )}

            {draft.image_prompt && (
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Image prompt: </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {draft.image_prompt}
                </span>
              </div>
            )}
          </GlassCard>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/*  TAB 2: Queue                                                       */
/* ================================================================== */

function QueueTab() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [publishing, setPublishing] = useState<string | null>(null)
  const [bulkApproving, setBulkApproving] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabaseAdmin
      .from('social_media_posts')
      .select('*')
      .in('status', ['DRAFT', 'SCHEDULED', 'FAILED'])
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = supabaseAdmin
        .from('social_media_posts')
        .select('*')
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })
    }
    if (platformFilter !== 'all') query = query.eq('platform', platformFilter)

    const { data } = await query
    setPosts((data ?? []) as SocialPost[])
    setLoading(false)
  }, [statusFilter, platformFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handlePublishNow(postId: string) {
    setPublishing(postId)
    await publishSocialPost(postId)
    setPublishing(null)
    fetchPosts()
  }

  async function handleDelete(postId: string) {
    await supabaseAdmin.from('social_media_posts').delete().eq('id', postId)
    fetchPosts()
  }

  async function handleBulkApprove() {
    setBulkApproving(true)
    const drafts = posts.filter(p => p.status === 'DRAFT')
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(9, 0, 0, 0)
    const scheduledAt = tomorrow.toISOString()

    const ids = drafts.map(d => d.id)
    if (ids.length > 0) {
      await supabaseAdmin
        .from('social_media_posts')
        .update({ status: 'SCHEDULED', scheduled_at: scheduledAt })
        .in('id', ids)
    }

    setBulkApproving(false)
    fetchPosts()
  }

  const draftCount = posts.filter(p => p.status === 'DRAFT').length

  const columns: Column<SocialPost>[] = useMemo(() => [
    {
      key: 'platform',
      header: 'Platform',
      width: '130px',
      render: (row) => <Badge variant="purple">{PLATFORM_LABELS[row.platform] ?? row.platform}</Badge>,
    },
    {
      key: 'content',
      header: 'Content',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          {row.content.length > 80 ? row.content.substring(0, 80) + '...' : row.content}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'scheduled_at',
      header: 'Scheduled',
      width: '170px',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '220px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {!UNSUPPORTED_PUBLISH.has(row.platform) && (
            <Button
              size="sm"
              variant="primary"
              loading={publishing === row.id}
              onClick={() => handlePublishNow(row.id)}
            >
              Publish Now
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ], [publishing])

  const statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'FAILED', label: 'Failed' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Select options={statusFilterOptions} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} />
            <Select options={[{ value: 'all', label: 'All Platforms' }, ...PLATFORM_OPTIONS]} value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} />
          </div>
          {draftCount > 0 && (
            <Button size="sm" variant="secondary" loading={bulkApproving} onClick={handleBulkApprove}>
              Approve All {draftCount} Draft{draftCount !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
        <Table columns={columns} data={posts} loading={loading} pageSize={10} emptyMessage="No posts in queue" rowKey={(row) => row.id} />
      </GlassCard>
    </div>
  )
}

/* ================================================================== */
/*  TAB 3: Published                                                   */
/* ================================================================== */

function PublishedTab() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState('all')

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let query = supabaseAdmin
        .from('social_media_posts')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })

      if (platformFilter !== 'all') query = query.eq('platform', platformFilter)

      const { data } = await query
      setPosts((data ?? []) as SocialPost[])
      setLoading(false)
    }
    fetch()
  }, [platformFilter])

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) counts[p.platform] = (counts[p.platform] || 0) + 1
    return counts
  }, [posts])

  const columns: Column<SocialPost>[] = useMemo(() => [
    {
      key: 'platform',
      header: 'Platform',
      width: '130px',
      render: (row) => <Badge variant="purple">{PLATFORM_LABELS[row.platform] ?? row.platform}</Badge>,
    },
    {
      key: 'content',
      header: 'Content',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          {row.content.length > 100 ? row.content.substring(0, 100) + '...' : row.content}
        </span>
      ),
    },
    {
      key: 'published_at',
      header: 'Published',
      width: '170px',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {row.published_at ? new Date(row.published_at).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'platform_post_id',
      header: 'Post ID',
      width: '140px',
      render: (row) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {row.platform_post_id ? row.platform_post_id.substring(0, 16) + (row.platform_post_id.length > 16 ? '...' : '') : '-'}
        </span>
      ),
    },
  ], [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {PLATFORM_OPTIONS.map(p => (
          <KpiCard
            key={p.value}
            label={p.label}
            value={String(platformCounts[p.value] ?? 0)}
            accent="purple"
          />
        ))}
      </div>

      <GlassCard padding="24px">
        <div style={{ marginBottom: '16px' }}>
          <Select
            options={[{ value: 'all', label: 'All Platforms' }, ...PLATFORM_OPTIONS]}
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            style={{ maxWidth: '220px' }}
          />
        </div>
        <Table columns={columns} data={posts} loading={loading} pageSize={10} emptyMessage="No published posts yet" rowKey={(row) => row.id} />
      </GlassCard>
    </div>
  )
}

/* ================================================================== */
/*  TAB 4: Automation                                                  */
/* ================================================================== */

function AutomationTab() {
  const [enabled, setEnabled] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>([])
  const [cronHour, setCronHour] = useState(9)
  const [topicPool, setTopicPool] = useState('')
  const [useDomainContent, setUseDomainContent] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabaseAdmin
        .from('admin_settings')
        .select('setting_key, setting_value')
        .eq('setting_type', 'social_automation')

      if (data) {
        for (const row of data) {
          const val = row.setting_value ?? ''
          switch (row.setting_key) {
            case 'social_auto_enabled': setEnabled(val === 'true'); break
            case 'social_auto_platforms': try { setPlatforms(JSON.parse(val)) } catch { /* ignore */ } break
            case 'social_auto_cron_hour': setCronHour(parseInt(val) || 9); break
            case 'social_auto_topic_pool': setTopicPool(val); break
            case 'social_auto_use_domain_content': setUseDomainContent(val === 'true'); break
            case 'social_auto_require_approval': setRequireApproval(val === 'true'); break
          }
        }
      }
      setLoading(false)
    }
    fetch()
  }, [])

  async function handleSave() {
    setSaving(true)
    const settings: Record<string, string> = {
      social_auto_enabled: String(enabled),
      social_auto_platforms: JSON.stringify(platforms),
      social_auto_cron_hour: String(cronHour),
      social_auto_topic_pool: topicPool,
      social_auto_use_domain_content: String(useDomainContent),
      social_auto_require_approval: String(requireApproval),
    }

    for (const [key, value] of Object.entries(settings)) {
      await supabaseAdmin.from('admin_settings').upsert(
        { setting_key: key, setting_value: value, setting_type: 'social_automation', description: `Social automation: ${key}` },
        { onConflict: 'setting_key' }
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleAutoPlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Daily Auto-Generation
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ToggleSwitch checked={enabled} onChange={setEnabled} label="Enable daily auto-generation" />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Auto-generate for platforms
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => toggleAutoPlatform(p.value)}
                  style={platformPillStyle(platforms.includes(p.value))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Generation hour (UTC): {cronHour}:00
            </label>
            <input
              type="range"
              min={0}
              max={23}
              value={cronHour}
              onChange={e => setCronHour(parseInt(e.target.value))}
              style={{ width: '100%', maxWidth: '400px', accentColor: '#7C3AED' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '400px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>0:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </div>

          <Textarea
            label="Topic rotation pool (one topic per line)"
            value={topicPool}
            onChange={e => setTopicPool(e.target.value)}
            placeholder="Benefits of micro-investing&#10;How round-ups work&#10;Financial literacy tips"
            style={{ minHeight: '120px' }}
          />

          <ToggleSwitch checked={useDomainContent} onChange={setUseDomainContent} label="Use recent platform content as generation themes" />
          <ToggleSwitch checked={requireApproval} onChange={setRequireApproval} label="Require approval before publishing (posts land as DRAFT)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button onClick={handleSave} loading={saving}>Save Configuration</Button>
            {saved && <span style={{ fontSize: '13px', color: '#34D399', fontWeight: 600 }}>Saved</span>}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

/* ================================================================== */
/*  TAB 5: Connections                                                 */
/* ================================================================== */

interface CredentialField {
  key: string
  label: string
}

interface PlatformCredConfig {
  name: string
  platform: string
  fields: CredentialField[]
  supported: boolean
  setupGuide: string
}

const CREDENTIAL_CONFIGS: PlatformCredConfig[] = [
  {
    name: 'Twitter / X',
    platform: 'TWITTER',
    fields: [
      { key: 'twitter_api_key', label: 'API Key' },
      { key: 'twitter_api_secret', label: 'API Secret' },
      { key: 'twitter_access_token', label: 'Access Token' },
      { key: 'twitter_access_token_secret', label: 'Access Token Secret' },
    ],
    supported: true,
    setupGuide: 'Go to developer.twitter.com -> Create a project -> Generate OAuth 1.0a keys with Read and Write permissions.',
  },
  {
    name: 'LinkedIn',
    platform: 'LINKEDIN',
    fields: [
      { key: 'linkedin_access_token', label: 'Access Token' },
      { key: 'linkedin_org_id', label: 'Person/Organization URN' },
    ],
    supported: true,
    setupGuide: 'Go to linkedin.com/developers -> Create an app -> Request w_member_social permission -> Generate an access token.',
  },
  {
    name: 'Facebook',
    platform: 'FACEBOOK',
    fields: [
      { key: 'facebook_page_id', label: 'Page ID' },
      { key: 'facebook_page_token', label: 'Page Access Token' },
    ],
    supported: true,
    setupGuide: 'Go to developers.facebook.com -> Create an app -> Add Pages API permission -> Generate a long-lived page access token.',
  },
  {
    name: 'Instagram',
    platform: 'INSTAGRAM',
    fields: [
      { key: 'instagram_user_id', label: 'User ID' },
      { key: 'instagram_access_token', label: 'Access Token' },
    ],
    supported: false,
    setupGuide: 'Instagram does not support text-only posts via the API. Image/video posts require the Content Publishing API.',
  },
]

function PlatformCredCard({ config }: { config: PlatformCredConfig }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [maskedValues, setMaskedValues] = useState<Record<string, { masked: string; configured: boolean }>>({})
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    async function fetch() {
      const keys = config.fields.map(f => f.key)
      const { data } = await supabaseAdmin
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', keys)

      const masked: Record<string, { masked: string; configured: boolean }> = {}
      for (const row of data ?? []) {
        const val = row.setting_value ?? ''
        masked[row.setting_key] = {
          masked: val.length > 4 ? '****' + val.slice(-4) : val ? '****' : '',
          configured: val.length > 0,
        }
      }
      setMaskedValues(masked)
      setLoading(false)
    }
    fetch()
  }, [config.fields])

  const allConfigured = config.fields.every(f => maskedValues[f.key]?.configured)

  async function handleSave() {
    setSaving(true)
    for (const [key, value] of Object.entries(values)) {
      if (!value.trim()) continue
      await supabaseAdmin.from('admin_settings').upsert(
        { setting_key: key, setting_value: value, setting_type: 'social_creds', description: `Social credential: ${key}` },
        { onConflict: 'setting_key' }
      )
      setMaskedValues(prev => ({
        ...prev,
        [key]: { masked: '****' + value.slice(-4), configured: true },
      }))
    }
    setValues({})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const { data, error } = await testSocialConnection(config.platform)
    if (error) {
      setTestResult({ connected: false, message: error })
    } else if (data) {
      setTestResult({
        connected: data.connected,
        message: data.connected ? `Connected as: ${data.account_name ?? 'OK'}` : data.error ?? 'Connection failed',
      })
    }
    setTesting(false)
  }

  const hasChanges = Object.values(values).some(v => v.trim().length > 0)

  return (
    <GlassCard padding="24px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{config.name}</span>
          {!loading && (
            <Badge variant={allConfigured ? 'success' : 'warning'}>
              {allConfigured ? 'Configured' : 'Missing'}
            </Badge>
          )}
          {!config.supported && (
            <Badge variant="default">Not Supported</Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {config.fields.map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {field.label}
                {maskedValues[field.key]?.configured && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    (current: {maskedValues[field.key].masked})
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPassword[field.key] ? 'text' : 'password'}
                  placeholder={maskedValues[field.key]?.configured ? 'Enter new value to replace' : 'Enter value'}
                  value={values[field.key] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                  }}
                >
                  {showPassword[field.key] ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
              Save Credentials
            </Button>
            {config.supported && (
              <Button size="sm" variant="secondary" onClick={handleTest} loading={testing} disabled={!allConfigured}>
                Test Connection
              </Button>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              {showGuide ? 'Hide setup guide' : 'Setup guide'}
            </button>
            {saved && <span style={{ fontSize: '13px', color: '#34D399', fontWeight: 600 }}>Saved</span>}
          </div>

          {testResult && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: testResult.connected ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.connected ? '#34D399' : '#EF4444',
              border: `1px solid ${testResult.connected ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              {testResult.message}
            </div>
          )}

          {showGuide && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              lineHeight: 1.6,
            }}>
              {config.setupGuide}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}

function ConnectionsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        Configure API credentials for each platform to enable direct publishing. Credentials are stored securely and masked after saving.
      </p>
      {CREDENTIAL_CONFIGS.map(config => (
        <PlatformCredCard key={config.platform} config={config} />
      ))}
    </div>
  )
}

/* ================================================================== */
/*  Main Export                                                        */
/* ================================================================== */

export function SocialPostsTab() {
  const tabs: TabItem[] = useMemo(() => [
    { key: 'generator', label: 'Generator', content: <GeneratorTab /> },
    { key: 'queue', label: 'Queue', content: <QueueTab /> },
    { key: 'published', label: 'Published', content: <PublishedTab /> },
    { key: 'automation', label: 'Automation', content: <AutomationTab /> },
    { key: 'connections', label: 'Connections', content: <ConnectionsTab /> },
  ], [])

  return <Tabs tabs={tabs} defaultTab="generator" />
}
