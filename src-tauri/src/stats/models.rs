use std::sync::atomic::{AtomicU64, Ordering};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsSnapshot {
    pub total_queries: u64,
    pub cache_hit_rate: f64,
    pub avg_latency_ms: u64,
    pub active_upstreams: u32,
    pub upstreams: Vec<(String, UpstreamStatsData)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpstreamStatsData {
    pub total_forwarded: u64,
    pub success: u64,
    pub failed: u64,
    pub avg_latency_ms: u64,
}

pub struct UpstreamStats {
    pub total_forwarded: AtomicU64,
    pub success: AtomicU64,
    pub failed: AtomicU64,
    pub avg_latency_ms: AtomicU64,
}

impl UpstreamStats {
    pub fn new() -> Self {
        Self {
            total_forwarded: AtomicU64::new(0),
            success: AtomicU64::new(0),
            failed: AtomicU64::new(0),
            avg_latency_ms: AtomicU64::new(0),
        }
    }

    pub fn to_data(&self) -> UpstreamStatsData {
        UpstreamStatsData {
            total_forwarded: self.total_forwarded.load(Ordering::Relaxed),
            success: self.success.load(Ordering::Relaxed),
            failed: self.failed.load(Ordering::Relaxed),
            avg_latency_ms: self.avg_latency_ms.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRecord {
    pub timestamp: DateTime<Local>,
    pub domain: String,
    pub qtype: String,
    pub client_ip: std::net::IpAddr,
    pub upstream_used: Option<String>,
    pub latency_ms: u64,
    pub cache_hit: bool,
    pub response_code: String,
    pub ttl: u32,
    pub resolved_ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFilter {
    pub domain_search: Option<String>,
    pub qtype_filter: Option<String>,
    pub response_code_filter: Option<String>,
    pub cache_filter: Option<String>,
}
