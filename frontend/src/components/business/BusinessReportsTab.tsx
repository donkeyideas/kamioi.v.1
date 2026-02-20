import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useUserId } from '@/hooks/useUserId'
import { GlassCard, Table, Badge, Button, Select } from '@/components/ui'
import type { Column, SelectOption } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Report {
  id: number
  business_id: number
  type: string
  title: string
  data: unknown
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REPORT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Types' },
  { value: 'financial', label: 'Financial' },
  { value: 'team', label: 'Team' },
  { value: 'investment', label: 'Investment' },
  { value: 'quarterly', label: 'Quarterly' },
]

const TYPE_BADGE_VARIANT: Record<string, 'purple' | 'info' | 'success' | 'warning' | 'default'> = {
  financial: 'purple',
  team: 'info',
  investment: 'success',
  quarterly: 'warning',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/* ------------------------------------------------------------------ */
/*  Loading spinner                                                    */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'biz-reports-spin 700ms linear infinite',
        }}
      />
      <style>{`@keyframes biz-reports-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessReportsTab() {
  const { userId, loading: userLoading } = useUserId()

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  /* ---- Fetch ---- */

  const fetchReports = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    try {
      const { data: bizData } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle()

      if (!bizData) { setLoading(false); return }

      const { data: reportsData } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('business_id', bizData.id)
        .order('created_at', { ascending: false })
        .limit(500)

      setReports((reportsData as Report[] | null) ?? [])
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userLoading) void fetchReports()
  }, [fetchReports, userLoading])

  /* ---- Filtered ---- */

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return reports
    return reports.filter((r) => r.type === typeFilter)
  }, [reports, typeFilter])

  /* ---- Table columns ---- */

  const columns: Column<Report>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.title}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '130px',
      render: (row) => (
        <Badge variant={TYPE_BADGE_VARIANT[row.type] ?? 'default'}>
          {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      width: '140px',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'download',
      header: '',
      width: '100px',
      align: 'right',
      render: () => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); /* download placeholder */ }}
          style={{
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-input)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      ),
    },
  ], [])

  /* ---- Render ---- */

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Reports
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '180px' }}>
            <Select
              options={REPORT_TYPE_OPTIONS}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
          <Button variant="primary" size="md" onClick={() => { /* generate report placeholder */ }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Reports table */}
      <GlassCard padding="0">
        <Table<Report>
          columns={columns}
          data={filtered}
          loading={false}
          pageSize={10}
          emptyMessage="No reports generated yet"
          rowKey={(row) => row.id}
        />
      </GlassCard>

      {/* Report cards (card view of latest reports) */}
      {filtered.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Recent Reports
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {filtered.slice(0, 6).map((report) => (
              <GlassCard key={report.id} padding="20px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {report.title}
                  </h4>
                  <Badge variant={TYPE_BADGE_VARIANT[report.type] ?? 'default'}>
                    {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                  </Badge>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                  Generated on {formatDate(report.created_at)}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { /* download placeholder */ }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </Button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
