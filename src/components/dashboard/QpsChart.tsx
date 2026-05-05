import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface QpsChartProps {
  data: number[];
  peakQps?: number;
  currentQps?: number;
}

export function QpsChart({ data, peakQps, currentQps }: QpsChartProps) {
  const chartData = data.map((value, index) => ({
    time: index,
    qps: value,
  }));

  return (
    <div className="glass-card glow-card card-enter p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          实时 QPS
        </h2>
        <div className="flex gap-3">
          {peakQps !== undefined && (
            <span className="text-xs px-2 py-1 rounded-md font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              峰值 {peakQps}
            </span>
          )}
          {currentQps !== undefined && (
            <span className="text-xs px-2 py-1 rounded-md font-mono" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              当前 {currentQps}
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="qpsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="var(--text-muted)"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Area
              type="monotone"
              dataKey="qps"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#qpsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
