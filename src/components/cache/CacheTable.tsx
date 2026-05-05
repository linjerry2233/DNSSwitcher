import type { CacheEntryInfo } from "../../types";
import { Trash2 } from "lucide-react";

interface CacheTableProps {
  entries: CacheEntryInfo[];
  onDelete: (domain: string) => void;
  loading: boolean;
}

const qtypeColors: Record<string, string> = {
  A: 'var(--color-success)',
  AAAA: 'var(--color-info)',
  MX: 'var(--color-warning)',
  CNAME: 'var(--accent-primary)',
};

export function CacheTable({ entries, onDelete, loading }: CacheTableProps) {
  const getTtlColor = (ttl: number, maxTtl = 3600) => {
    const ratio = ttl / maxTtl;
    if (ratio > 0.5) return 'var(--color-success)';
    if (ratio > 0.2) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const headerStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    fontWeight: 500,
  };

  return (
    <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
      {/* Header */}
      <div className="grid gap-2 px-4 py-3" style={{ gridTemplateColumns: '1fr 60px 1fr 140px 80px 60px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={headerStyle}>域名</div>
        <div style={headerStyle}>类型</div>
        <div style={headerStyle}>解析结果</div>
        <div style={headerStyle}>剩余 TTL</div>
        <div style={headerStyle}>命中</div>
        <div style={{ ...headerStyle, textAlign: 'right' }}>操作</div>
      </div>

      {/* Rows */}
      {entries.map((entry, index) => (
        <div
          key={index}
          className="grid gap-2 px-4 py-3 items-center interactive"
          style={{
            gridTemplateColumns: '1fr 60px 1fr 140px 80px 60px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Domain */}
          <div className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
            {entry.domain}
          </div>
          {/* Type */}
          <div>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: qtypeColors[entry.qtype] || 'var(--text-muted)', color: '#fff' }}
            >
              {entry.qtype}
            </span>
          </div>
          {/* Resolved IPs */}
          <div className="flex flex-wrap gap-1">
            {entry.resolved_ips.length > 0 ? (
              <>
                {entry.resolved_ips.slice(0, 3).map((ip, i) => (
                  <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {ip}
                  </span>
                ))}
                {entry.resolved_ips.length > 3 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{entry.resolved_ips.length - 3}</span>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>-</span>
            )}
          </div>
          {/* TTL with progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (entry.ttl_remaining / 3600) * 100)}%`,
                  background: getTtlColor(entry.ttl_remaining),
                }}
              />
            </div>
            <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
              {entry.ttl_remaining}s
            </span>
          </div>
          {/* Hit count */}
          <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            {entry.hit_count}
          </div>
          {/* Delete */}
          <div className="text-right">
            <button
              className="w-7 h-7 rounded flex items-center justify-center interactive btn-press"
              style={{ color: 'var(--color-danger)' }}
              onClick={() => onDelete(entry.domain)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}

      {loading && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>加载中...</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>缓存为空</div>
      )}
    </div>
  );
}
