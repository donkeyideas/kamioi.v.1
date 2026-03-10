import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import type { DemoReport } from './demoData'
import { businessReports } from './demoData'

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

export function DemoReportsTab() {
  const [reports] = useState<DemoReport[]>(businessReports)
  const [toast, setToast] = useState('')

  const handleGenerate = () => {
    setToast('Report generation unavailable in demo')
    setTimeout(() => setToast(''), 3000)
  }

  const handleDownload = (title: string) => {
    setToast(`Downloading "${title}"... (Demo)`)
    setTimeout(() => setToast(''), 3000)
  }

  const columns: Column<DemoReport>[] = [
    { key: 'title', header: 'Report', render: r => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span> },
    { key: 'period', header: 'Period', render: r => <Badge variant="info">{r.period}</Badge> },
    { key: 'total_invested', header: 'Invested', align: 'right' as const, render: r => <span style={{ color: '#7C3AED', fontWeight: 600 }}>{fmt(r.total_invested)}</span> },
    { key: 'total_fees', header: 'Fees', align: 'right' as const, render: r => <span style={{ color: 'var(--text-secondary)' }}>{fmt(r.total_fees)}</span> },
    { key: 'portfolio_value', header: 'Portfolio Value', align: 'right' as const, render: r => <span style={{ fontWeight: 600 }}>{fmt(r.portfolio_value)}</span> },
    {
      key: 'action',
      header: '',
      width: '120px',
      render: r => <Button variant="secondary" size="sm" onClick={() => handleDownload(r.title)}>Download</Button>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: '#fff',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Reports</h2>
        <Button variant="primary" size="sm" onClick={handleGenerate}>+ Generate Report</Button>
      </div>

      <GlassCard accent="purple" padding="24px">
        <Table<DemoReport> columns={columns} data={reports} loading={false} emptyMessage="No reports yet" pageSize={10} />
      </GlassCard>
    </div>
  )
}
