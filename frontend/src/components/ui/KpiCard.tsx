import { Card } from './Card'

interface KpiCardProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
}

export function KpiCard({ label, value, change, changeType = 'neutral', icon }: KpiCardProps) {
  const changeColor = {
    positive: 'text-status-success',
    negative: 'text-status-error',
    neutral: 'text-text-muted',
  }

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-text-secondary mb-2">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={`text-xs mt-1.5 font-medium ${changeColor[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 rounded-[10px] bg-aurora-purple/10 text-aurora-purple">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
