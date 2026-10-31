import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface SparklineBin {
  ts: string;      // ISO datetime string (bin start)
  total: number;   // sum of No_Bikes across all stations
}

interface SparklineChartProps {
  data: SparklineBin[];
  isDark: boolean;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtTooltipTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        lineHeight: '1.6',
      }}
    >
      <div style={{ color: 'var(--color-muted-foreground)' }}>{fmtTooltipTime(label ?? '')}</div>
      <div style={{ color: 'var(--color-foreground)', fontWeight: 700 }}>
        {(payload[0].value ?? 0).toLocaleString()} bikes available
      </div>
    </div>
  );
}

export function SparklineChart({ data, isDark }: SparklineChartProps) {
  // Single series — no legend needed. Title names it.
  const strokeColor = isDark ? '#60a5fa' : '#2563eb';   // blue-400 / blue-600
  const fillId = 'sparklineFill';

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-muted-foreground)',
          fontSize: '13px',
        }}
      >
        No sparkline data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={96}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="ts"
          tickFormatter={fmtTime}
          tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{ r: 4, fill: strokeColor, stroke: 'var(--color-background)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
