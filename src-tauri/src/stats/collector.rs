use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use dashmap::DashMap;
use std::collections::VecDeque;
use tokio::sync::Mutex;
use chrono::Local;

use super::models::{StatsSnapshot, UpstreamStatsData, QueryRecord, UpstreamStats};

pub struct GlobalStats {
    pub total_queries: AtomicU64,
    pub cache_hits: AtomicU64,
    pub cache_misses: AtomicU64,
    pub per_upstream: DashMap<String, UpstreamStats>,
    pub recent_queries: Arc<Mutex<VecDeque<QueryRecord>>>,
    max_recent_queries: usize,
}

impl GlobalStats {
    pub fn new() -> Self {
        Self {
            total_queries: AtomicU64::new(0),
            cache_hits: AtomicU64::new(0),
            cache_misses: AtomicU64::new(0),
            per_upstream: DashMap::new(),
            recent_queries: Arc::new(Mutex::new(VecDeque::new())),
            max_recent_queries: 5000,
        }
    }

    pub fn increment_total_queries(&self) {
        self.total_queries.fetch_add(1, Ordering::Relaxed);
    }

    pub fn increment_cache_hits(&self) {
        self.cache_hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn increment_cache_misses(&self) {
        self.cache_misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_query(
        &self,
        domain: &str,
        qtype: &str,
        latency_ms: u64,
        cache_hit: bool,
        response_code: &str,
        upstream_used: Option<String>,
        ttl: u32,
        resolved_ips: Vec<String>,
    ) {
        let record = QueryRecord {
            timestamp: Local::now(),
            domain: domain.to_string(),
            qtype: qtype.to_string(),
            client_ip: "127.0.0.1".parse().unwrap(),
            upstream_used,
            latency_ms,
            cache_hit,
            response_code: response_code.to_string(),
            ttl,
            resolved_ips,
        };

        let recent_queries = self.recent_queries.clone();
        let max = self.max_recent_queries;
        tokio::spawn(async move {
            let mut queries = recent_queries.lock().await;
            queries.push_front(record);
            while queries.len() > max {
                queries.pop_back();
            }
        });
    }

    pub fn record_upstream_stats(&self, upstream_id: &str, latency_ms: u64, success: bool) {
        let entry = self.per_upstream.entry(upstream_id.to_string())
            .or_insert_with(UpstreamStats::new);

        entry.total_forwarded.fetch_add(1, Ordering::Relaxed);
        if success {
            entry.success.fetch_add(1, Ordering::Relaxed);
        } else {
            entry.failed.fetch_add(1, Ordering::Relaxed);
        }

        let current_avg = entry.avg_latency_ms.load(Ordering::Relaxed);
        let new_avg = if current_avg == 0 {
            latency_ms
        } else {
            (current_avg * 7 + latency_ms * 3) / 10
        };
        entry.avg_latency_ms.store(new_avg, Ordering::Relaxed);
    }

    pub fn get_snapshot(&self) -> StatsSnapshot {
        let total = self.total_queries.load(Ordering::Relaxed);
        let hits = self.cache_hits.load(Ordering::Relaxed);
        let cache_hit_rate = if total > 0 {
            (hits as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        let upstreams: Vec<(String, UpstreamStatsData)> = self.per_upstream.iter()
            .map(|entry| (entry.key().clone(), entry.value().to_data()))
            .collect();

        // 计算全局平均延迟（加权平均）
        let avg_latency_ms = if upstreams.is_empty() {
            0
        } else {
            let total_forwarded: u64 = upstreams.iter()
                .map(|(_, s)| s.total_forwarded)
                .sum();
            if total_forwarded == 0 {
                0
            } else {
                let weighted_sum: u64 = upstreams.iter()
                    .map(|(_, s)| s.avg_latency_ms * s.total_forwarded)
                    .sum();
                weighted_sum / total_forwarded
            }
        };

        StatsSnapshot {
            total_queries: total,
            cache_hit_rate,
            avg_latency_ms,
            active_upstreams: upstreams.iter()
                .filter(|(_, s)| s.total_forwarded > 0)
                .count() as u32,
            upstreams,
        }
    }

    pub async fn get_recent_queries(&self, limit: usize) -> Vec<QueryRecord> {
        let queries = self.recent_queries.lock().await;
        queries.iter().take(limit).cloned().collect()
    }

    pub async fn clear_recent_queries(&self) {
        let mut queries = self.recent_queries.lock().await;
        queries.clear();
    }
}
