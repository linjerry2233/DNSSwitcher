import type { UpstreamStats } from "../../types";

interface UpstreamStatusCardProps {
  id: string;
  stats: UpstreamStats;
}

const protocolColors: Record<string, string> = {
  UDP: 'var(--tag-udp)',
  TCP: 'var(--tag-tcp)',
  DoH: 'var(--tag-doh)',
  DoT: 'var(--tag-dot)',
  DoQ: 'var(--tag-doq)',
};

export function UpstreamStatusCard({ id, stats }: UpstreamStatusCardProps) {
  const latencyPercent = Math.min(100, (stats.avg_latency_ms / 300) * 100);
  const isHealthy = stats.failed <= stats.success;

  // Extract protocol from id or name
  const protocol = id.includes('DoH') ? 'DoH' : id.includes('DoT') ? 'DoT' : id.includes('DoQ') ? 'DoQ' : id.includes('TCP') ? 'TCP' : 'UDP';

  return (
    <div
      className="glass-card card-enter p-4 interactive flex-shrink-0"
      style={{ width: 200, height: 140 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: isHealthy ? 'var(--color-success)' : 'var(--color-danger)' }}
        />
        <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {id}
        </h3>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: protocolColors[protocol], color: '#fff' }}
        >
          {protocol}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-muted)' }}>{stats.total_forwarded} 次请求</span>
          <span className="font-mono" style={{ color: stats.avg_latency_ms < 50 ? 'var(--color-success)' : stats.avg_latency_ms < 200 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
            {stats.avg_latency_ms}ms
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${latencyPercent}%`,
              background: stats.avg_latency_ms < 50 ? 'var(--color-success)' : stats.avg_latency_ms < 200 ? 'var(--color-warning)' : 'var(--color-danger)',
            }}
          />
        </div>
        {stats.failed > 0 && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{stats.failed} 失败</p>
        )}
      </div>
    </div>
  );
}
