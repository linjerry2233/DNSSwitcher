import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { testUpstream } from "../../hooks/useTauri";
import type { UpstreamDns } from "../../types";
import { GripVertical, Pencil, Trash2, Zap } from "lucide-react";

interface UpstreamTableProps {
  onEdit: (upstream: UpstreamDns) => void;
}

const protocolTagClass: Record<string, string> = {
  UDP: 'tag-udp',
  TCP: 'tag-tcp',
  DoH: 'tag-doh',
  DoT: 'tag-dot',
  DoQ: 'tag-doq',
};

export function UpstreamTable({ onEdit }: UpstreamTableProps) {
  const { config, deleteUpstream, updateUpstream } = useAppStore();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, number>>({});

  const handleToggle = async (upstream: UpstreamDns) => {
    await updateUpstream({ ...upstream, enabled: !upstream.enabled });
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个上游服务器吗？')) {
      await deleteUpstream(id);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const latency = await testUpstream(id);
      setTestResults(prev => ({ ...prev, [id]: latency }));
    } catch {
      setTestResults(prev => ({ ...prev, [id]: -1 }));
    }
    setTestingId(null);
  };

  if (!config?.upstreams || config.upstreams.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p style={{ color: 'var(--text-muted)' }}>暂无配置的上游服务器，请添加或从预设库选择</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {config.upstreams.map((upstream) => (
        <div
          key={upstream.id}
          className="glass-card card-enter p-4 flex items-center gap-4 interactive"
          style={{ height: 72 }}
        >
          {/* Drag handle */}
          <div className="cursor-grab" style={{ color: 'var(--text-muted)' }}>
            <GripVertical size={16} />
          </div>

          {/* Toggle */}
          <button
            className="toggle-track flex-shrink-0"
            style={{ background: upstream.enabled ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            onClick={() => handleToggle(upstream)}
          >
            <div
              className="toggle-thumb"
              style={{ transform: upstream.enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>

          {/* Protocol tag */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${protocolTagClass[upstream.protocol]}`}>
            {upstream.protocol}
          </span>

          {/* Name & address */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {upstream.name}
            </p>
            <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
              {upstream.address}
            </p>
          </div>

          {/* Weight */}
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${upstream.weight}%`, background: 'var(--accent-primary)' }}
              />
            </div>
            <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
              {upstream.weight}%
            </span>
          </div>

          {/* Test result */}
          {testResults[upstream.id] !== undefined && (
            <span className="text-xs font-mono" style={{ color: testResults[upstream.id] >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {testResults[upstream.id] >= 0 ? `${testResults[upstream.id]}ms` : '失败'}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-md flex items-center justify-center interactive btn-press"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => handleTest(upstream.id)}
              disabled={testingId === upstream.id}
              title="测速"
            >
              <Zap size={14} className={testingId === upstream.id ? 'animate-pulse' : ''} />
            </button>
            <button
              className="w-8 h-8 rounded-md flex items-center justify-center interactive btn-press"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => onEdit(upstream)}
              title="编辑"
            >
              <Pencil size={14} />
            </button>
            <button
              className="w-8 h-8 rounded-md flex items-center justify-center interactive btn-press"
              style={{ color: 'var(--color-danger)' }}
              onClick={() => handleDelete(upstream.id)}
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
