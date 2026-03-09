import { useState, useCallback } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { seoResolveRecommendation, seoDismissRecommendation } from '@/services/api'
import { useSeoData } from './useSeoData'

interface Recommendation {
  id: string
  priority: string
  category: string
  title: string
  description: string
  impact: string
  effort: string
  affected_pages: string[]
  status: string
}

interface RecsData {
  recommendations: Recommendation[]
  summary: { total: number; critical: number; important: number; open: number; resolved: number }
}

const priorityVariant: Record<string, 'error' | 'warning' | 'info'> = {
  critical: 'error', important: 'warning', nice_to_have: 'info',
}

const priorityLabel: Record<string, string> = {
  critical: 'Critical', important: 'Important', nice_to_have: 'Nice to Have',
}

export function RecommendationsPanel({ category }: { category?: string }) {
  const { data, loading, refetch } = useSeoData<RecsData>('recommendations')
  const [filter, setFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleResolve = useCallback(async (id: string) => {
    setActionLoading(id)
    await seoResolveRecommendation(id)
    await refetch()
    setActionLoading(null)
  }, [refetch])

  const handleDismiss = useCallback(async (id: string) => {
    setActionLoading(id)
    await seoDismissRecommendation(id)
    await refetch()
    setActionLoading(null)
  }, [refetch])

  if (loading) return <GlassCard><p style={{ color: 'var(--text-muted)' }}>Loading recommendations...</p></GlassCard>
  if (!data || data.recommendations.length === 0) return null

  // Filter by category if provided (comma-separated)
  let recs = data.recommendations
  if (category) {
    const cats = category.split(',').map(c => c.trim())
    recs = recs.filter(r => cats.includes(r.category))
  }

  // Apply priority filter
  if (filter !== 'all') recs = recs.filter(r => r.priority === filter)

  // Only show open
  const openRecs = recs.filter(r => r.status === 'open')

  return (
    <GlassCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Recommendations
          {openRecs.length > 0 && <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>({openRecs.length} open)</span>}
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'critical', 'important', 'nice_to_have'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                background: filter === f ? 'var(--highlight-line)' : 'transparent',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {f === 'all' ? 'All' : priorityLabel[f] || f}
            </button>
          ))}
        </div>
      </div>

      {openRecs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          No open recommendations{filter !== 'all' ? ` with ${priorityLabel[filter]} priority` : ''}.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {openRecs.map(rec => (
            <div key={rec.id} style={{ padding: '14px 16px', borderRadius: '10px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <Badge variant={priorityVariant[rec.priority] || 'default'}>{priorityLabel[rec.priority] || rec.priority}</Badge>
                    <Badge variant="purple">{rec.category}</Badge>
                    {rec.impact === 'high' && <Badge variant="info">High Impact</Badge>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{rec.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{rec.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Button size="sm" variant="ghost" onClick={() => handleResolve(rec.id)} loading={actionLoading === rec.id}>Resolve</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDismiss(rec.id)} loading={actionLoading === rec.id}>Dismiss</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
