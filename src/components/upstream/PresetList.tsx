import { useAppStore } from "../../store/appStore";
import type { UpstreamDns } from "../../types";
import { Plus, Check } from "lucide-react";

const presets: UpstreamDns[] = [
  { id: 'preset-ali-doh', name: '阿里 DoH', address: 'https://dns.alidns.com/dns-query', protocol: 'DoH', port: 443, weight: 50, enabled: true, timeout_ms: 3000 },
  { id: 'preset-ali-dot', name: '阿里 DoT', address: 'dns.alidns.com', protocol: 'DoT', port: 853, weight: 50, enabled: true, tls_hostname: 'dns.alidns.com', timeout_ms: 3000 },
  { id: 'preset-ali-udp1', name: '阿里 UDP', address: '223.6.6.6', protocol: 'UDP', port: 53, weight: 50, enabled: true, timeout_ms: 3000 },
  { id: 'preset-ali-udp2', name: '阿里 UDP', address: '223.5.5.5', protocol: 'UDP', port: 53, weight: 50, enabled: true, timeout_ms: 3000 },
  { id: 'preset-tencent-dot', name: '腾讯 DoT', address: 'dot.pub', protocol: 'DoT', port: 853, weight: 50, enabled: true, tls_hostname: 'dot.pub', timeout_ms: 3000 },
  { id: 'preset-tencent-udp', name: '腾讯 UDP', address: '119.29.29.29', protocol: 'UDP', port: 53, weight: 50, enabled: true, timeout_ms: 3000 },
  { id: 'preset-114-1', name: '114 DNS', address: '114.114.114.114', protocol: 'UDP', port: 53, weight: 50, enabled: true, timeout_ms: 3000 },
  { id: 'preset-114-2', name: '114 DNS', address: '114.114.115.115', protocol: 'UDP', port: 53, weight: 50, enabled: true, timeout_ms: 3000 },
  { id: 'preset-baidu', name: '百度 DNS', address: '180.76.76.76', protocol: 'UDP', port: 53, weight: 50, enabled: true, timeout_ms: 3000 },
];

const protocolTagClass: Record<string, string> = {
  UDP: 'tag-udp',
  TCP: 'tag-tcp',
  DoH: 'tag-doh',
  DoT: 'tag-dot',
  DoQ: 'tag-doq',
};

export function PresetList() {
  const { addUpstream, config } = useAppStore();

  const isAdded = (preset: UpstreamDns) => {
    return config?.upstreams.some(u => u.address === preset.address && u.protocol === preset.protocol) ?? false;
  };

  const handleAdd = async (preset: UpstreamDns) => {
    await addUpstream({ ...preset, id: crypto.randomUUID() });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {presets.map((preset, index) => {
        const added = isAdded(preset);
        return (
          <div
            key={index}
            className="glass-card card-enter p-4 flex flex-col gap-3 interactive"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{preset.name}</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${protocolTagClass[preset.protocol]}`}>
                {preset.protocol}
              </span>
            </div>

            <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
              {preset.address}
            </p>

            <button
              className="w-full py-2 rounded-lg text-sm font-medium interactive btn-press flex items-center justify-center gap-1.5"
              style={{
                background: added ? 'var(--bg-elevated)' : 'var(--accent-glow)',
                color: added ? 'var(--text-muted)' : 'var(--accent-primary)',
                cursor: added ? 'not-allowed' : 'pointer',
              }}
              onClick={() => !added && handleAdd(preset)}
              disabled={added}
            >
              {added ? <><Check size={14} /> 已添加</> : <><Plus size={14} /> 添加</>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
