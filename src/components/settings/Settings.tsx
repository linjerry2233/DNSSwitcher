import { useState, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import { saveSettings, getLocalNetworkInfo, applySystemDns, restoreSystemDns } from "../../hooks/useTauri";
import { Settings as SettingsIcon, Globe, Server, Shield, Copy, Check, Sun, Moon, Monitor, Wifi, WifiOff } from "lucide-react";

export function Settings() {
  const { config, loadConfig, serviceStatus, startService, stopService, theme, setTheme, loadServiceStatus } = useAppStore();
  const [settings, setSettings] = useState(config);
  const [copied, setCopied] = useState(false);
  const [localIp, setLocalIp] = useState("127.0.0.1");
  const [localCidrs, setLocalCidrs] = useState<string[]>([]);
  const [dnsLoading, setDnsLoading] = useState(false);

  useEffect(() => {
    if (config) setSettings(config);
  }, [config]);

  useEffect(() => {
    getLocalNetworkInfo().then((info) => {
      setLocalIp(info.local_ip);
      setLocalCidrs(info.cidrs);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (settings) {
      await saveSettings(settings);
      await loadConfig();
    }
  };

  // 自动保存单个设置项（避免页面切换时丢失）
  const autoSave = async (newSettings: typeof settings) => {
    if (!newSettings) return;
    setSettings(newSettings);
    await saveSettings(newSettings);
    // 更新 store 中的 config，这样 useEffect 不会覆盖回来
    await loadConfig();
  };

  const handleExport = () => {
    if (settings) {
      const json = JSON.stringify(settings, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rustdns-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const imported = JSON.parse(text);
          setSettings(imported);
          await saveSettings(imported);
          await loadConfig();
        } catch {
          alert('配置文件格式错误');
        }
      }
    };
    input.click();
  };

  const handleCopyIP = () => {
    navigator.clipboard.writeText(localIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyDns = async () => {
    setDnsLoading(true);
    try {
      await applySystemDns();
      await loadServiceStatus();
    } catch (e) {
      alert(`应用 DNS 设置失败: ${e}`);
    } finally {
      setDnsLoading(false);
    }
  };

  const handleRestoreDns = async () => {
    setDnsLoading(true);
    try {
      await restoreSystemDns();
      await loadServiceStatus();
    } catch (e) {
      alert(`还原 DNS 设置失败: ${e}`);
    } finally {
      setDnsLoading(false);
    }
  };

  const handleEnableExternal = () => {
    if (!settings) return;
    const newEnabled = !settings.server.external_service_enabled;
    const newAllowedCidrs = (newEnabled && settings.server.allowed_cidrs.length === 0 && localCidrs.length > 0)
      ? localCidrs
      : settings.server.allowed_cidrs;
    setSettings({
      ...settings,
      server: {
        ...settings.server,
        external_service_enabled: newEnabled,
        allowed_cidrs: newAllowedCidrs,
      },
    });
  };

  if (!settings) return null;

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
  };

  const themeOptions = [
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'system', label: '跟随系统', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>设置</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>应用配置与偏好</p>
      </div>

      {/* General */}
      <div className="glass-card card-enter p-5">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>常规</h2>
        </div>
        <div className="space-y-0">
          {/* Autostart */}
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={labelStyle}>开机自启动</span>
            <button
              className="toggle-track"
              style={{ background: settings.ui.autostart ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              onClick={() => autoSave({ ...settings, ui: { ...settings.ui, autostart: !settings.ui.autostart } })}
            >
              <div className="toggle-thumb" style={{ transform: settings.ui.autostart ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {/* Minimize to tray */}
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={labelStyle}>最小化到系统托盘</span>
            <button
              className="toggle-track"
              style={{ background: settings.ui.start_minimized ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              onClick={() => autoSave({ ...settings, ui: { ...settings.ui, start_minimized: !settings.ui.start_minimized } })}
            >
              <div className="toggle-thumb" style={{ transform: settings.ui.start_minimized ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {/* Theme selector */}
          <div className="py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="block mb-2" style={labelStyle}>界面主题</span>
            <div className="flex gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = (opt.value === 'system' && settings.ui.theme === 'system') ||
                  (opt.value === theme);
                return (
                  <button
                    key={opt.value}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium interactive btn-press"
                    style={{
                      background: isActive ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      border: isActive ? 'none' : '1px solid var(--border-subtle)',
                    }}
                    onClick={() => {
                      const newSettings = { ...settings, ui: { ...settings.ui, theme: opt.value } };
                      setSettings(newSettings);
                      if (opt.value === 'dark' || opt.value === 'light') {
                        setTheme(opt.value);
                      } else {
                        const sysTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                        setTheme(sysTheme);
                      }
                      saveSettings(newSettings).then(() => loadConfig());
                    }}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div className="py-3">
            <span className="block mb-2" style={labelStyle}>界面语言</span>
            <select
              style={{ ...inputStyle, width: 200 }}
              value={settings.ui.language}
              onChange={(e) => autoSave({ ...settings, ui: { ...settings.ui, language: e.target.value } })}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* DNS Service */}
      <div className="glass-card card-enter p-5">
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>DNS 服务</h2>
        </div>
        <div className="space-y-0">
          {/* Local port */}
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={labelStyle}>本地监听端口</span>
              {settings.server.local_port !== 53 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
                  端口不是 53 时，需手动将系统 DNS 指向 127.0.0.1#{settings.server.local_port}
                </p>
              )}
            </div>
            <input
              type="number"
              style={{ ...inputStyle, width: 100, textAlign: 'right' }}
              value={settings.server.local_port}
              onChange={(e) => setSettings({ ...settings, server: { ...settings.server, local_port: parseInt(e.target.value) } })}
              min={1}
              max={65535}
            />
          </div>

          {/* Service status */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="status-dot relative">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: serviceStatus?.running ? 'var(--color-success)' : 'var(--text-muted)' }}
                />
                {serviceStatus?.running && (
                  <div
                    className="absolute inset-[-4px] rounded-full animate-pulse-ring"
                    style={{ background: 'var(--color-success)', opacity: 0.4 }}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>服务状态</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {serviceStatus?.running ? '运行中' : '已停止'}
                </p>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white interactive btn-press"
              style={{ background: serviceStatus?.running ? 'var(--color-danger)' : 'var(--accent-gradient)' }}
              onClick={() => serviceStatus?.running ? stopService() : startService()}
            >
              {serviceStatus?.running ? '停止' : '启动'}
            </button>
          </div>
        </div>
      </div>

      {/* DNS Hijack */}
      <div
        className="glass-card card-enter p-5"
        style={{
          borderColor: serviceStatus?.dns_applied ? 'var(--accent-primary)' : undefined,
          border: serviceStatus?.dns_applied ? '1px solid var(--accent-primary)' : undefined,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Wifi size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>DNS 劫持</h2>
        </div>

        <div className="space-y-0">
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <p style={labelStyle}>系统 DNS 状态</p>
              <p className="text-xs mt-0.5" style={{ color: serviceStatus?.dns_applied ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {serviceStatus?.dns_applied ? '已劫持 - 所有 DNS 请求指向本机' : '未劫持 - 使用系统默认 DNS'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: serviceStatus?.dns_applied ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              />
              <span className="text-xs" style={{ color: serviceStatus?.dns_applied ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {serviceStatus?.dns_applied ? '已劫持' : '未劫持'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p style={labelStyle}>操作</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {serviceStatus?.dns_applied
                  ? '点击"还原"将恢复系统原始 DNS 设置'
                  : '点击"应用"将把系统 DNS 指向本软件（IPv4 + IPv6）'}
              </p>
            </div>
            <div className="flex gap-2">
              {serviceStatus?.dns_applied ? (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium interactive btn-press"
                  style={{ background: 'var(--color-danger)', color: '#fff' }}
                  onClick={handleRestoreDns}
                  disabled={dnsLoading}
                >
                  <WifiOff size={14} />
                  {dnsLoading ? '处理中...' : '还原 DNS'}
                </button>
              ) : (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white interactive btn-press"
                  style={{ background: 'var(--accent-gradient)' }}
                  onClick={handleApplyDns}
                  disabled={dnsLoading}
                >
                  <Wifi size={14} />
                  {dnsLoading ? '处理中...' : '应用 DNS'}
                </button>
              )}
            </div>
          </div>

          {serviceStatus?.dns_applied && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg mt-2 text-sm"
              style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
            >
              <Shield size={14} />
              软件关闭时将自动还原 DNS 设置，确保网络正常
            </div>
          )}
        </div>
      </div>

      {/* External Service */}
      <div
        className="glass-card card-enter p-5"
        style={{
          borderColor: settings.server.external_service_enabled ? 'var(--color-warning)' : undefined,
          border: settings.server.external_service_enabled ? '1px solid var(--color-warning)' : undefined,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>对外服务</h2>
        </div>

        {settings.server.external_service_enabled && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg mb-4 text-sm"
            style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--color-warning)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
          >
            <Shield size={14} />
            此功能会向局域网开放 DNS 服务，请确保网络安全
          </div>
        )}

        <div className="space-y-0">
          {/* Toggle */}
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={labelStyle}>启用对外 DNS 服务</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>允许局域网其他设备使用本机作为 DNS 服务器</p>
            </div>
            <button
              className="toggle-track"
              style={{ background: settings.server.external_service_enabled ? 'var(--color-warning)' : 'var(--text-muted)' }}
              onClick={handleEnableExternal}
            >
              <div className="toggle-thumb" style={{ transform: settings.server.external_service_enabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {settings.server.external_service_enabled && (
            <>
              {/* External port */}
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={labelStyle}>对外监听端口</span>
                <input
                  type="number"
                  style={{ ...inputStyle, width: 100, textAlign: 'right' }}
                  value={settings.server.external_port}
                  onChange={(e) => setSettings({ ...settings, server: { ...settings.server, external_port: parseInt(e.target.value) } })}
                  min={1}
                  max={65535}
                />
              </div>

              {/* IP display */}
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={labelStyle}>本机 IP 地址</span>
                <div className="flex items-center gap-2">
                  <code
                    className="px-3 py-1 rounded-md text-sm font-mono"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
                  >
                    {localIp}
                  </code>
                  <button
                    className="w-7 h-7 rounded flex items-center justify-center interactive btn-press"
                    style={{ color: copied ? 'var(--color-success)' : 'var(--text-muted)' }}
                    onClick={handleCopyIP}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {copied && <span className="text-xs" style={{ color: 'var(--color-success)' }}>已复制</span>}
                </div>
              </div>

              {/* Allowed CIDRs */}
              <div className="py-3">
                <span className="block mb-2" style={labelStyle}>允许的客户端 IP 段</span>
                <textarea
                  style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, resize: 'vertical' }}
                  rows={4}
                  value={settings.server.allowed_cidrs.join('\n')}
                  onChange={(e) => setSettings({ ...settings, server: { ...settings.server, allowed_cidrs: e.target.value.split('\n').filter(Boolean) } })}
                  placeholder="每行一个 CIDR，例如：192.168.0.0/16"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Advanced */}
      <div className="glass-card card-enter p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>高级</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={labelStyle}>查询日志最大保留条数</span>
            <input
              type="number"
              style={{ ...inputStyle, width: 100, textAlign: 'right' }}
              defaultValue={5000}
              min={100}
              max={100000}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium interactive btn-press"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              onClick={handleExport}
            >
              导出配置
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium interactive btn-press"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              onClick={handleImport}
            >
              导入配置
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white interactive btn-press"
              style={{ background: 'var(--color-danger)' }}
              onClick={() => {
                if (confirm('确定要重置所有设置吗？')) {
                  setSettings({
                    version: 1,
                    work_mode: 'Weighted',
                    upstreams: [],
                    cache: { enabled: true, max_entries: 10000, min_ttl: 60, max_ttl: 3600, negative_cache: true },
                    server: { local_port: 53, external_service_enabled: false, external_port: 53, allowed_cidrs: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12'] },
                    ui: { theme: 'system', language: 'zh-CN', start_minimized: false, autostart: false },
                  });
                }
              }}
            >
              重置所有设置
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white interactive btn-press"
          style={{ background: 'var(--accent-gradient)' }}
          onClick={handleSave}
        >
          保存设置
        </button>
      </div>
    </div>
  );
}
