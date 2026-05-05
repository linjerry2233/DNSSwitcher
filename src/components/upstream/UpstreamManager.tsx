import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { UpstreamTable } from "./UpstreamTable";
import { UpstreamForm } from "./UpstreamForm";
import { PresetList } from "./PresetList";
import type { UpstreamDns } from "../../types";
import { Plus } from "lucide-react";

type Tab = 'configured' | 'presets';

export function UpstreamManager() {
  const { config, setWorkMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('configured');
  const [showForm, setShowForm] = useState(false);
  const [editingUpstream, setEditingUpstream] = useState<UpstreamDns | null>(null);

  const handleEdit = (upstream: UpstreamDns) => {
    setEditingUpstream(upstream);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUpstream(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>上游 DNS 管理</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>配置和管理上游 DNS 服务器</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white interactive btn-press"
          style={{ background: 'var(--accent-gradient)' }}
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          添加上游
        </button>
      </div>

      {/* Work mode segmented control */}
      <div className="glass-card card-enter p-5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>工作模式：</span>
          <div className="segmented-control">
            <button
              className={`segment-btn ${config?.work_mode === 'Weighted' ? 'active' : ''}`}
              onClick={() => setWorkMode('Weighted')}
            >
              权重分配模式
            </button>
            <button
              className={`segment-btn ${config?.work_mode === 'Racing' ? 'active' : ''}`}
              onClick={() => setWorkMode('Racing')}
            >
              并发竞速模式
            </button>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          {config?.work_mode === 'Weighted'
            ? '当前模式说明：每次 DNS 请求仅发送给权重最高的一个上游'
            : '当前模式说明：同时查询所有上游，取最快响应'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <button
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium interactive"
          style={{
            background: activeTab === 'configured' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'configured' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === 'configured' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
          onClick={() => setActiveTab('configured')}
        >
          已配置
        </button>
        <button
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium interactive"
          style={{
            background: activeTab === 'presets' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'presets' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === 'presets' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
          onClick={() => setActiveTab('presets')}
        >
          预设库
        </button>
      </div>

      {/* Content */}
      {activeTab === 'configured' ? (
        <UpstreamTable onEdit={handleEdit} />
      ) : (
        <PresetList />
      )}

      {/* Drawer */}
      {showForm && (
        <UpstreamForm upstream={editingUpstream} onClose={handleCloseForm} />
      )}
    </div>
  );
}
