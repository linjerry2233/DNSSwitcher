import { useState, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import { getCacheEntries, clearCache, deleteCacheEntry } from "../../hooks/useTauri";
import { CacheTable } from "./CacheTable";
import type { CacheEntryInfo } from "../../types";
import { Database, Target, Trash2, Search } from "lucide-react";

export function CacheManager() {
  const { config, loadConfig } = useAppStore();
  const [entries, setEntries] = useState<CacheEntryInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await getCacheEntries(search);
      setEntries(data);
    } catch (error) {
      console.error("Failed to load cache entries:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, [search]);

  const handleClear = async () => {
    if (confirm("确定要清空所有缓存吗？")) {
      await clearCache();
      await loadEntries();
    }
  };

  const handleDelete = async (domain: string) => {
    await deleteCacheEntry(domain);
    await loadEntries();
  };

  const handleSaveSettings = async () => {
    if (config) {
      const { saveSettings } = await import("../../hooks/useTauri");
      await saveSettings(config);
      await loadConfig();
    }
  };

  const maxEntries = config?.cache.max_entries || 10000;
  const usagePercent = Math.min(100, (entries.length / maxEntries) * 100);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>缓存管理</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>DNS 缓存状态与配置</p>
        </div>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white interactive btn-press"
          style={{ background: 'var(--color-danger)' }}
          onClick={handleClear}
        >
          <Trash2 size={14} /> 清空缓存
        </button>
      </div>

      {/* Top stats cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cache capacity gauge */}
        <div className="glass-card glow-card card-enter p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>缓存容量</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{entries.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>最大 {maxEntries.toLocaleString()} 条</p>
            </div>
            {/* Simple gauge visualization */}
            <div className="w-24 h-12 relative">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" strokeLinecap="round" />
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="var(--accent-primary)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${usagePercent * 1.26} 126`} />
              </svg>
              <span className="absolute bottom-0 right-0 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {usagePercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Hit rate */}
        <div className="glass-card glow-card card-enter p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>缓存状态</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold" style={{ color: config?.cache.enabled ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {config?.cache.enabled ? '启用' : '禁用'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                TTL {config?.cache.min_ttl || 60}s - {config?.cache.max_ttl || 3600}s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cache settings */}
      <div className="glass-card card-enter p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>缓存设置</h2>
        <div className="space-y-4">
          {/* Enable cache toggle */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>启用缓存</span>
            <button
              className="toggle-track"
              style={{ background: config?.cache.enabled ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              onClick={() => { if (config) { config.cache.enabled = !config.cache.enabled; handleSaveSettings(); } }}
            >
              <div className="toggle-thumb" style={{ transform: config?.cache.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {/* Negative cache toggle */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>负缓存 (NXDOMAIN)</span>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>缓存不存在的域名查询结果</p>
            </div>
            <button
              className="toggle-track"
              style={{ background: config?.cache.negative_cache ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              onClick={() => { if (config) { config.cache.negative_cache = !config.cache.negative_cache; handleSaveSettings(); } }}
            >
              <div className="toggle-thumb" style={{ transform: config?.cache.negative_cache ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {/* Max entries */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>最大缓存条目</span>
            <input
              type="number"
              className="w-32 px-3 py-1.5 rounded-lg text-sm text-right font-mono outline-none interactive"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              value={config?.cache.max_entries || 10000}
              onChange={(e) => { if (config) { config.cache.max_entries = parseInt(e.target.value); handleSaveSettings(); } }}
              min={100}
              max={100000}
            />
          </div>

          {/* TTL range */}
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>最小 TTL (秒)</span>
              <input
                type="number"
                className="w-24 px-3 py-1.5 rounded-lg text-sm text-right font-mono outline-none interactive"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                value={config?.cache.min_ttl || 60}
                onChange={(e) => { if (config) { config.cache.min_ttl = parseInt(e.target.value); handleSaveSettings(); } }}
                min={0}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>最大 TTL (秒)</span>
              <input
                type="number"
                className="w-24 px-3 py-1.5 rounded-lg text-sm text-right font-mono outline-none interactive"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                value={config?.cache.max_ttl || 3600}
                onChange={(e) => { if (config) { config.cache.max_ttl = parseInt(e.target.value); handleSaveSettings(); } }}
                min={0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cache entries */}
      <div className="glass-card card-enter p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>缓存内容</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none interactive"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="搜索域名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CacheTable entries={entries} onDelete={handleDelete} loading={loading} />
      </div>
    </div>
  );
}
