import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  ServiceStatus,
  UpstreamDns,
  WorkMode,
  StatsSnapshot,
  QueryRecord,
  LogFilter,
  CacheEntryInfo,
} from "../types";

export async function getSettings(): Promise<AppConfig> {
  return invoke("get_settings");
}

export async function saveSettings(settings: AppConfig): Promise<void> {
  return invoke("save_settings", { settings });
}

export async function startDnsService(): Promise<void> {
  return invoke("start_dns_service");
}

export async function stopDnsService(): Promise<void> {
  return invoke("stop_dns_service");
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  return invoke("get_service_status");
}

export async function getUpstreams(): Promise<UpstreamDns[]> {
  return invoke("get_upstreams");
}

export async function addUpstream(upstream: UpstreamDns): Promise<void> {
  return invoke("add_upstream", { upstream });
}

export async function updateUpstream(upstream: UpstreamDns): Promise<void> {
  return invoke("update_upstream", { upstream });
}

export async function deleteUpstream(id: string): Promise<void> {
  return invoke("delete_upstream", { id });
}

export async function testUpstream(id: string): Promise<number> {
  return invoke("test_upstream", { id });
}

export async function setWorkMode(mode: WorkMode): Promise<void> {
  return invoke("set_work_mode", { mode });
}

export async function getStatsSnapshot(): Promise<StatsSnapshot> {
  return invoke("get_stats_snapshot");
}

export async function getQueryLog(filter: LogFilter): Promise<QueryRecord[]> {
  return invoke("get_query_log", { filter });
}

export async function clearQueryLog(): Promise<void> {
  return invoke("clear_query_log");
}

export async function getCacheEntries(search: string): Promise<CacheEntryInfo[]> {
  return invoke("get_cache_entries", { search });
}

export async function clearCache(): Promise<void> {
  return invoke("clear_cache");
}

export async function deleteCacheEntry(key: string): Promise<void> {
  return invoke("delete_cache_entry", { key });
}

export interface NetworkInfo {
  local_ip: string;
  cidrs: string[];
}

export async function getLocalNetworkInfo(): Promise<NetworkInfo> {
  return invoke("get_local_network_info");
}

export async function applySystemDns(): Promise<void> {
  return invoke("apply_system_dns");
}

export async function restoreSystemDns(): Promise<void> {
  return invoke("restore_system_dns");
}
