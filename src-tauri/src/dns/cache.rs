use std::sync::Arc;
use tokio::sync::Mutex;
use lru::LruCache;
use std::num::NonZeroUsize;
use hickory_proto::rr::RecordType;
use std::time::Instant;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct CacheKey {
    pub name: String,
    pub qtype: RecordType,
}

#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub response: Vec<u8>,
    pub inserted_at: Instant,
    pub ttl: u32,
    pub hit_count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CacheEntryInfo {
    pub domain: String,
    pub qtype: String,
    pub resolved_ips: Vec<String>,
    pub ttl_remaining: u64,
    pub hit_count: u64,
}

pub struct DnsCache {
    inner: Arc<Mutex<LruCache<CacheKey, CacheEntry>>>,
    min_ttl: AtomicU32,
    max_ttl: AtomicU32,
    enabled: AtomicBool,
}

impl DnsCache {
    pub fn new(max_entries: usize, min_ttl: u32, max_ttl: u32) -> Self {
        Self {
            inner: Arc::new(Mutex::new(LruCache::new(
                NonZeroUsize::new(max_entries).unwrap_or(NonZeroUsize::new(10000).unwrap()),
            ))),
            min_ttl: AtomicU32::new(min_ttl),
            max_ttl: AtomicU32::new(max_ttl),
            enabled: AtomicBool::new(true),
        }
    }

    pub async fn get(&self, key: &CacheKey) -> Option<Vec<u8>> {
        if !self.enabled.load(Ordering::Relaxed) {
            return None;
        }

        let mut cache = self.inner.lock().await;
        if let Some(entry) = cache.get(key) {
            let elapsed = entry.inserted_at.elapsed().as_secs() as u32;
            if elapsed < entry.ttl {
                return Some(entry.response.clone());
            }
        }
        None
    }

    pub async fn put(&self, key: CacheKey, response: Vec<u8>, ttl: u32) {
        if !self.enabled.load(Ordering::Relaxed) {
            return;
        }

        let min_ttl = self.min_ttl.load(Ordering::Relaxed);
        let max_ttl = self.max_ttl.load(Ordering::Relaxed);
        let adjusted_ttl = ttl.clamp(min_ttl, max_ttl);

        let entry = CacheEntry {
            response,
            inserted_at: Instant::now(),
            ttl: adjusted_ttl,
            hit_count: 0,
        };

        let mut cache = self.inner.lock().await;
        cache.put(key, entry);
    }

    pub async fn remove(&self, key: &CacheKey) {
        let mut cache = self.inner.lock().await;
        cache.pop(key);
    }

    pub async fn clear(&self) {
        let mut cache = self.inner.lock().await;
        cache.clear();
    }

    pub async fn get_entries(&self, search: &str) -> Vec<CacheEntryInfo> {
        let cache = self.inner.lock().await;
        cache.iter()
            .filter(|(key, _)| {
                if search.is_empty() {
                    true
                } else {
                    key.name.contains(search)
                }
            })
            .map(|(key, entry)| {
                let elapsed = entry.inserted_at.elapsed().as_secs() as u32;
                let remaining = if elapsed < entry.ttl {
                    entry.ttl - elapsed
                } else {
                    0
                };

                CacheEntryInfo {
                    domain: key.name.clone(),
                    qtype: format!("{:?}", key.qtype),
                    resolved_ips: Vec::new(),
                    ttl_remaining: remaining as u64,
                    hit_count: entry.hit_count,
                }
            })
            .collect()
    }

    pub fn set_enabled(&self, enabled: bool) {
        self.enabled.store(enabled, Ordering::Relaxed);
    }

    pub fn set_ttl_range(&self, min_ttl: u32, max_ttl: u32) {
        self.min_ttl.store(min_ttl, Ordering::Relaxed);
        self.max_ttl.store(max_ttl, Ordering::Relaxed);
    }
}
