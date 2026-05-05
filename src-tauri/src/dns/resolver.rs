use std::sync::Arc;
use tokio::sync::RwLock;
use hickory_proto::op::Message;
use anyhow::Result;
use tracing::warn;

use crate::config::models::{WorkMode, UpstreamDns};
use crate::dns::upstream::UpstreamClient;
use crate::dns::wrr::SmoothWRR;

pub struct ResolveResult {
    pub response: Message,
    pub upstream_id: String,
    pub upstream_name: String,
}

pub struct DnsResolver {
    mode: Arc<std::sync::atomic::AtomicU8>,
    upstreams: Arc<RwLock<Vec<UpstreamClient>>>,
    wrr: Arc<tokio::sync::Mutex<SmoothWRR>>,
}

impl DnsResolver {
    pub fn new() -> Self {
        Self {
            mode: Arc::new(std::sync::atomic::AtomicU8::new(0)),
            upstreams: Arc::new(RwLock::new(Vec::new())),
            wrr: Arc::new(tokio::sync::Mutex::new(SmoothWRR::new())),
        }
    }

    pub async fn resolve(&self, query: &Message) -> Result<ResolveResult> {
        match self.mode.load(std::sync::atomic::Ordering::Relaxed) {
            0 => self.resolve_weighted(query).await,
            1 => self.resolve_racing(query).await,
            _ => unreachable!(),
        }
    }

    async fn resolve_weighted(&self, query: &Message) -> Result<ResolveResult> {
        let upstreams = self.upstreams.read().await;
        if upstreams.is_empty() {
            return Err(anyhow::anyhow!("No upstream available"));
        }

        let idx = (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as usize) % upstreams.len();

        let upstream = &upstreams[idx];

        match upstream.send_query(query).await {
            Ok(response) => Ok(ResolveResult {
                response,
                upstream_id: upstream.id().to_string(),
                upstream_name: upstream.name().to_string(),
            }),
            Err(e) => {
                warn!("Upstream {} failed: {}", upstream.name(), e);
                for (i, u) in upstreams.iter().enumerate() {
                    if i != idx {
                        match u.send_query(query).await {
                            Ok(response) => return Ok(ResolveResult {
                                response,
                                upstream_id: u.id().to_string(),
                                upstream_name: u.name().to_string(),
                            }),
                            Err(e) => {
                                warn!("Upstream {} also failed: {}", u.name(), e);
                            }
                        }
                    }
                }
                Err(anyhow::anyhow!("All upstreams failed"))
            }
        }
    }

    async fn resolve_racing(&self, query: &Message) -> Result<ResolveResult> {
        let upstreams = self.upstreams.read().await;
        if upstreams.is_empty() {
            return Err(anyhow::anyhow!("No upstream available"));
        }

        let mut futures = Vec::new();
        for u in upstreams.iter() {
            let query = query.clone();
            let u = u.clone();
            futures.push(Box::pin(async move {
                let response = u.send_query(&query).await?;
                Ok::<ResolveResult, anyhow::Error>(ResolveResult {
                    response,
                    upstream_id: u.id().to_string(),
                    upstream_name: u.name().to_string(),
                })
            }));
        }

        let (result, _, _) = futures::future::select_all(futures).await;
        result
    }

    pub async fn set_mode(&self, mode: WorkMode) {
        self.mode.store(
            match mode {
                WorkMode::Weighted => 0,
                WorkMode::Racing => 1,
            },
            std::sync::atomic::Ordering::SeqCst,
        );
    }

    pub async fn update_upstreams(&self, upstreams: Vec<UpstreamDns>) {
        let clients: Vec<UpstreamClient> = upstreams.iter()
            .filter(|u| u.enabled)
            .map(|u| UpstreamClient::new(u.clone()))
            .collect();

        let mut wrr = self.wrr.lock().await;
        wrr.update(upstreams.iter().filter(|u| u.enabled).cloned().collect());

        let mut upstream_list = self.upstreams.write().await;
        *upstream_list = clients;
    }

    pub async fn test_upstream(&self, upstream: &UpstreamDns) -> Result<u64> {
        let client = UpstreamClient::new(upstream.clone());
        let start = std::time::Instant::now();
        let test_query = Message::new();

        // 添加超时处理
        let timeout = std::time::Duration::from_millis(upstream.timeout_ms.max(3000));
        match tokio::time::timeout(timeout, client.send_query(&test_query)).await {
            Ok(Ok(_)) => Ok(start.elapsed().as_millis() as u64),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(anyhow::anyhow!("Connection timeout after {}ms", timeout.as_millis())),
        }
    }
}
