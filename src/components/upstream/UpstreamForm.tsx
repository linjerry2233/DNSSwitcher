import { useState, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import { testUpstream } from "../../hooks/useTauri";
import type { UpstreamDns, DnsProtocol } from "../../types";
import { X } from "lucide-react";

interface UpstreamFormProps {
  upstream: UpstreamDns | null;
  onClose: () => void;
}

const protocols: DnsProtocol[] = ['UDP', 'TCP', 'DoH', 'DoT', 'DoQ'];

export function UpstreamForm({ upstream, onClose }: UpstreamFormProps) {
  const { addUpstream, updateUpstream } = useAppStore();
  const [form, setForm] = useState<UpstreamDns>({
    id: '',
    name: '',
    address: '',
    protocol: 'UDP',
    port: 53,
    weight: 50,
    enabled: true,
    timeout_ms: 3000,
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<number | null>(null);

  useEffect(() => {
    if (upstream) setForm(upstream);
  }, [upstream]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upstream) {
      await updateUpstream(form);
    } else {
      await addUpstream({ ...form, id: crypto.randomUUID() });
    }
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const latency = await testUpstream(form.id || 'test');
      setTestResult(latency);
    } catch {
      setTestResult(-1);
    }
    setTesting(false);
  };

  const getDefaultPort = (protocol: DnsProtocol) => {
    switch (protocol) {
      case 'DoH': return 443;
      case 'DoT': return 853;
      case 'DoQ': return 853;
      default: return 53;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 480,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          animation: 'drawer-slide 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {upstream ? '编辑上游' : '添加上游 DNS'}
          </h2>
          <button
            className="w-8 h-8 rounded-md flex items-center justify-center interactive btn-press"
            style={{ color: 'var(--text-muted)' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5 scrollbar-thin">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>名称</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none interactive"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：Cloudflare DoH"
              required
            />
          </div>

          {/* Protocol */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>协议</label>
            <div className="flex gap-2">
              {protocols.map((protocol) => (
                <button
                  key={protocol}
                  type="button"
                  className="flex-1 py-2 rounded-lg text-sm font-medium interactive btn-press"
                  style={{
                    background: form.protocol === protocol ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                    color: form.protocol === protocol ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${form.protocol === protocol ? 'transparent' : 'var(--border-subtle)'}`,
                  }}
                  onClick={() => setForm({ ...form, protocol, port: getDefaultPort(protocol) })}
                >
                  {protocol}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>服务器地址</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none interactive"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={form.protocol === 'DoH' ? 'https://dns.example.com/dns-query' : '1.1.1.1 或 dns.example.com'}
              required
            />
          </div>

          {/* Port & Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>端口</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none interactive"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
                min={1}
                max={65535}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>超时 (ms)</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none interactive"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={form.timeout_ms}
                onChange={(e) => setForm({ ...form, timeout_ms: parseInt(e.target.value) })}
                min={100}
                max={30000}
              />
            </div>
          </div>

          {/* TLS hostname */}
          {(form.protocol === 'DoT' || form.protocol === 'DoQ') && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>TLS 主机名</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none interactive"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={form.tls_hostname || ''}
                onChange={(e) => setForm({ ...form, tls_hostname: e.target.value })}
                placeholder="用于 SNI 验证"
              />
            </div>
          )}

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              权重 <span className="font-mono" style={{ color: 'var(--accent-primary)' }}>{form.weight}%</span>
            </label>
            <input
              type="range"
              className="w-full accent-[var(--accent-primary)]"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: parseInt(e.target.value) })}
              min={1}
              max={100}
            />
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-medium interactive btn-press"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--accent-primary)',
              }}
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            {testResult !== null && (
              <span className="text-sm font-mono" style={{ color: testResult >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {testResult >= 0 ? `${testResult}ms` : '连接失败'}
              </span>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium interactive btn-press"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white interactive btn-press"
            style={{ background: 'var(--accent-gradient)' }}
            onClick={handleSubmit}
          >
            保存
          </button>
        </div>
      </div>
    </>
  );
}
