import {
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

interface LineChartProps {
  data: Record<string, unknown>[]
  dataKey: string
  xKey?: string
  title?: string
  color?: string
  height?: number
  showGrid?: boolean
}

export function LineChart({
  data,
  dataKey,
  xKey = 'name',
  title,
  color = '#7C3AED',
  height = 300,
  showGrid = true,
}: LineChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine data={data}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          )}
          <XAxis
            dataKey={xKey}
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,11,26,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              fontSize: '13px',
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: color }}
          />
        </RechartsLine>
      </ResponsiveContainer>
    </Card>
  )
}
