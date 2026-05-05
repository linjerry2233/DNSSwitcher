export interface UpstreamDns {
  id: string;
  name: string;
  address: string;
  protocol: DnsProtocol;
  port: number;
  weight: number;
  enabled: boolean;
  tls_hostname?: string;
  timeout_ms: number;
}

export type DnsProtocol = 'UDP' | 'TCP' | 'DoH' | 'DoT' | 'DoQ';

export type WorkMode = 'Weighted' | 'Racing';

export interface CacheConfig {
  enabled: boolean;
  max_entries: number;
  min_ttl: number;
  max_ttl: number;
  negative_cache: boolean;
}

export interface ServerConfig {
  local_port: number;
  external_service_enabled: boolean;
  external_port: number;
  allowed_cidrs: string[];
}

export interface UiConfig {
  theme: string;
  language: string;
  start_minimized: boolean;
  autostart: boolean;
}

export interface AppConfig {
  version: number;
  work_mode: WorkMode;
  upstreams: UpstreamDns[];
  cache: CacheConfig;
  server: ServerConfig;
  ui: UiConfig;
}

export interface ServiceStatus {
  running: boolean;
  listen_address: string;
  external_enabled: boolean;
  dns_applied: boolean;
}

export interface StatsSnapshot {
  total_queries: number;
  cache_hit_rate: number;
  avg_latency_ms: number;
  active_upstreams: number;
  upstreams: [string, UpstreamStats][];
}

export interface UpstreamStats {
  total_forwarded: number;
  success: number;
  failed: number;
  avg_latency_ms: number;
}

export interface QueryRecord {
  timestamp: string;
  domain: string;
  qtype: string;
  client_ip: string;
  upstream_used?: string;
  latency_ms: number;
  cache_hit: boolean;
  response_code: string;
  ttl: number;
  resolved_ips: string[];
}

export interface LogFilter {
  domain_search?: string;
  qtype_filter?: string;
  response_code_filter?: string;
  cache_filter?: string;
}

export interface CacheEntryInfo {
  domain: string;
  qtype: string;
  resolved_ips: string[];
  ttl_remaining: number;
  hit_count: number;
}
