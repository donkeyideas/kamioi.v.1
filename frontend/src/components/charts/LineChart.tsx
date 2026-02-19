import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LegendItem {
  label: string;
  color: string;
}

interface LineChartProps<T extends Record<string, unknown>> {
  data: T[];
  dataKey: string;
  xKey?: string;
  title?: string;
  color?: string;
  height?: number;
  legend?: LegendItem[];
}

const AXIS_STROKE = 'var(--text-muted)';
const TICK_FILL = 'var(--text-muted)';
const GRID_STROKE = 'var(--border-divider)';

const tooltipStyle: React.CSSProperties = {
  background: 'var(--dark-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
  fontSize: '13px',
  color: 'var(--text-primary)',
};

function EmptyState({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center"
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
        No data available
      </span>
    </div>
  );
}

export default function LineChart<T extends Record<string, unknown>>({
  data,
  dataKey,
  xKey = 'name',
  title,
  color = '#7C3AED',
  height = 220,
  legend,
}: LineChartProps<T>) {
  return (
    <div
      className="glass-card"
      style={{ padding: '24px' }}
    >
      {/* Header */}
      {(title || legend) && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            {title && (
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </span>
            )}
            {legend && legend.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {legend.map((item) => (
                  <div
                    key={item.label}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Gradient divider */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--border-subtle), transparent)',
              marginBottom: '16px',
            }}
          />
        </>
      )}

      {/* Chart or empty state */}
      {data.length === 0 ? (
        <EmptyState height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_STROKE}
              vertical={false}
            />
            <XAxis
              dataKey={xKey}
              stroke={AXIS_STROKE}
              tick={{ fill: TICK_FILL, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke={AXIS_STROKE}
              tick={{ fill: TICK_FILL, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: 'var(--border-subtle)' }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 1.5 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
