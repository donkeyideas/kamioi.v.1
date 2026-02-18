import {
  AreaChart as RechartsAreaChart,
  Area,
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

interface AreaChartProps<T extends Record<string, unknown>> {
  data: T[];
  dataKey: string;
  xKey?: string;
  title?: string;
  color?: string;
  height?: number;
  legend?: LegendItem[];
}

const AXIS_STROKE = 'rgba(255,255,255,0.3)';
const TICK_FILL = 'rgba(255,255,255,0.5)';
const GRID_STROKE = 'rgba(255,255,255,0.06)';

const tooltipStyle: React.CSSProperties = {
  background: 'rgba(15,11,26,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  fontSize: '13px',
  color: '#fff',
};

function EmptyState({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center"
    >
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
        No data available
      </span>
    </div>
  );
}

export default function AreaChart<T extends Record<string, unknown>>({
  data,
  dataKey,
  xKey = 'name',
  title,
  color = '#7C3AED',
  height = 220,
  legend,
}: AreaChartProps<T>) {
  const gradientId = `areaGradient-${dataKey}`;

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
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
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
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
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
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
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
          <RechartsAreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 1.5 }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
