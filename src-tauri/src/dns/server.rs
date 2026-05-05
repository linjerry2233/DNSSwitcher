use std::sync::Arc;
use tokio::net::{UdpSocket, TcpListener};
use tokio::sync::RwLock;
use anyhow::Result;
use tracing::{info, warn, error};

use crate::config::models::AppConfig;
use crate::stats::collector::GlobalStats;
use crate::dns::cache::DnsCache;
use crate::dns::resolver::DnsResolver;

pub struct DnsServer {
    config: Arc<RwLock<AppConfig>>,
    stats: Arc<GlobalStats>,
    cache: Arc<DnsCache>,
    resolver: Arc<DnsResolver>,
    running: Arc<std::sync::atomic::AtomicBool>,
}

impl DnsServer {
    pub fn new(
        config: Arc<RwLock<AppConfig>>,
        stats: Arc<GlobalStats>,
        cache: Arc<DnsCache>,
        resolver: Arc<DnsResolver>,
    ) -> Self {
        Self {
            config,
            stats,
            cache,
            resolver,
            running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    pub async fn start(&self) -> Result<()> {
        let config = self.config.read().await;
        let local_addr = format!("127.0.0.1:{}", config.server.local_port);
        let external_addr = if config.server.external_service_enabled {
            format!("0.0.0.0:{}", config.server.external_port)
        } else {
            String::new()
        };

        self.running.store(true, std::sync::atomic::Ordering::SeqCst);

        let local_udp = Arc::new(UdpSocket::bind(&local_addr).await?);
        let local_tcp = TcpListener::bind(&local_addr).await?;
        info!("DNS server local listen on {}", local_addr);

        let running = self.running.clone();
        let resolver = self.resolver.clone();
        let cache = self.cache.clone();
        let stats = self.stats.clone();

        tokio::spawn(async move {
            Self::handle_udp(local_udp, resolver, cache, stats, running).await;
        });

        let running = self.running.clone();
        let resolver = self.resolver.clone();
        let cache = self.cache.clone();
        let stats = self.stats.clone();

        tokio::spawn(async move {
            Self::handle_tcp(local_tcp, resolver, cache, stats, running).await;
        });

        if !external_addr.is_empty() {
            let ext_udp = Arc::new(UdpSocket::bind(&external_addr).await?);
            let ext_tcp = TcpListener::bind(&external_addr).await?;
            info!("DNS server external listen on {}", external_addr);

            let running = self.running.clone();
            let resolver = self.resolver.clone();
            let cache = self.cache.clone();
            let stats = self.stats.clone();

            tokio::spawn(async move {
                Self::handle_udp(ext_udp, resolver, cache, stats, running).await;
            });

            let running = self.running.clone();
            let resolver = self.resolver.clone();
            let cache = self.cache.clone();
            let stats = self.stats.clone();

            tokio::spawn(async move {
                Self::handle_tcp(ext_tcp, resolver, cache, stats, running).await;
            });
        }

        Ok(())
    }

    pub fn stop(&self) {
        self.running.store(false, std::sync::atomic::Ordering::SeqCst);
        info!("DNS server stopped");
    }

    pub fn is_running(&self) -> bool {
        self.running.load(std::sync::atomic::Ordering::SeqCst)
    }

    async fn handle_udp(
        sock: Arc<UdpSocket>,
        resolver: Arc<DnsResolver>,
        cache: Arc<DnsCache>,
        stats: Arc<GlobalStats>,
        running: Arc<std::sync::atomic::AtomicBool>,
    ) {
        let mut buf = vec![0u8; 512];
        while running.load(std::sync::atomic::Ordering::SeqCst) {
            match sock.recv_from(&mut buf).await {
                Ok((len, addr)) => {
                    let data = buf[..len].to_vec();
                    let resolver = resolver.clone();
                    let cache = cache.clone();
                    let stats = stats.clone();
                    let sock = sock.clone();

                    tokio::spawn(async move {
                        match Self::process_query(&data, &resolver, &cache, &stats).await {
                            Ok(response) => {
                                if let Err(e) = sock.send_to(&response, addr).await {
                                    warn!("Failed to send UDP response: {}", e);
                                }
                            }
                            Err(e) => {
                                warn!("Failed to process query: {}", e);
                            }
                        }
                    });
                }
                Err(e) => {
                    error!("UDP recv error: {}", e);
                }
            }
        }
    }

    async fn handle_tcp(
        listener: TcpListener,
        resolver: Arc<DnsResolver>,
        cache: Arc<DnsCache>,
        stats: Arc<GlobalStats>,
        running: Arc<std::sync::atomic::AtomicBool>,
    ) {
        while running.load(std::sync::atomic::Ordering::SeqCst) {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let resolver = resolver.clone();
                    let cache = cache.clone();
                    let stats = stats.clone();

                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_tcp_stream(stream, &resolver, &cache, &stats).await {
                            warn!("TCP connection error from {}: {}", addr, e);
                        }
                    });
                }
                Err(e) => {
                    error!("TCP accept error: {}", e);
                }
            }
        }
    }

    async fn handle_tcp_stream(
        mut stream: tokio::net::TcpStream,
        resolver: &DnsResolver,
        cache: &DnsCache,
        stats: &GlobalStats,
    ) -> Result<()> {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let mut len_buf = [0u8; 2];
        stream.read_exact(&mut len_buf).await?;
        let len = u16::from_be_bytes(len_buf) as usize;

        let mut data = vec![0u8; len];
        stream.read_exact(&mut data).await?;

        let response = Self::process_query(&data, resolver, cache, stats).await?;

        let resp_len = (response.len() as u16).to_be_bytes();
        stream.write_all(&resp_len).await?;
        stream.write_all(&response).await?;

        Ok(())
    }

    async fn process_query(
        data: &[u8],
        resolver: &DnsResolver,
        cache: &DnsCache,
        stats: &GlobalStats,
    ) -> Result<Vec<u8>> {
        use hickory_proto::op::Message;
        use hickory_proto::rr::RData;

        let query = Message::from_vec(data)?;
        let query_name = query.queries().first()
            .map(|q| q.name().to_string())
            .unwrap_or_default();
        let query_type = query.queries().first()
            .map(|q| q.query_type())
            .unwrap_or(hickory_proto::rr::RecordType::A);

        stats.increment_total_queries();

        // 检查缓存
        let cache_key = crate::dns::cache::CacheKey {
            name: query_name.clone(),
            qtype: query_type,
        };

        if let Some(cached) = cache.get(&cache_key).await {
            stats.increment_cache_hits();
            stats.record_query(
                &query_name,
                &format!("{:?}", query_type),
                0,
                true,
                "NOERROR",
                Some("cache".to_string()),
                60,
                Vec::new(),
            );
            return Ok(cached);
        }

        stats.increment_cache_misses();

        // 转发到上游
        let start = std::time::Instant::now();
        let resolve_result = resolver.resolve(&query).await;
        let latency = start.elapsed().as_millis() as u64;

        match resolve_result {
            Ok(result) => {
                let response = result.response;
                let response_bytes = response.to_vec()?;

                // 从应答中提取 TTL 和解析的 IP
                let mut ttl: u32 = 60;
                let mut resolved_ips = Vec::new();

                for answer in response.answers() {
                    // 取最小 TTL
                    if answer.ttl() < ttl {
                        ttl = answer.ttl();
                    }
                    // 提取解析的 IP 地址
                    match answer.data() {
                        Some(RData::A(addr)) => {
                            resolved_ips.push(addr.to_string());
                        }
                        Some(RData::AAAA(addr)) => {
                            resolved_ips.push(addr.to_string());
                        }
                        _ => {}
                    }
                }

                // 缓存响应
                cache.put(cache_key, response_bytes.clone(), ttl).await;

                // 记录统计
                stats.record_query(
                    &query_name,
                    &format!("{:?}", query_type),
                    latency,
                    false,
                    "NOERROR",
                    Some(result.upstream_name),
                    ttl,
                    resolved_ips,
                );

                // 记录上游统计
                stats.record_upstream_stats(&result.upstream_id, latency, true);

                Ok(response_bytes)
            }
            Err(e) => {
                stats.record_query(
                    &query_name,
                    &format!("{:?}", query_type),
                    latency,
                    false,
                    "SERVFAIL",
                    None,
                    0,
                    Vec::new(),
                );
                Err(e)
            }
        }
    }
}
