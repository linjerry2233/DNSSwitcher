use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub version: u32,
    pub work_mode: WorkMode,
    pub upstreams: Vec<UpstreamDns>,
    pub cache: CacheConfig,
    pub server: ServerConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WorkMode {
    Weighted,
    Racing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpstreamDns {
    pub id: String,
    pub name: String,
    pub address: String,
    pub protocol: DnsProtocol,
    pub port: u16,
    pub weight: u32,
    pub enabled: bool,
    pub tls_hostname: Option<String>,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DnsProtocol {
    UDP,
    TCP,
    DoH,
    DoT,
    DoQ,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub enabled: bool,
    pub max_entries: usize,
    pub min_ttl: u32,
    pub max_ttl: u32,
    pub negative_cache: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub local_port: u16,
    pub external_service_enabled: bool,
    pub external_port: u16,
    pub allowed_cidrs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub theme: String,
    pub language: String,
    pub start_minimized: bool,
    pub autostart: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: 1,
            work_mode: WorkMode::Weighted,
            upstreams: Vec::new(),
            cache: CacheConfig {
                enabled: true,
                max_entries: 10000,
                min_ttl: 60,
                max_ttl: 3600,
                negative_cache: true,
            },
            server: ServerConfig {
                local_port: 53,
                external_service_enabled: false,
                external_port: 53,
                allowed_cidrs: vec![
                    "192.168.0.0/16".to_string(),
                    "10.0.0.0/8".to_string(),
                    "172.16.0.0/12".to_string(),
                ],
            },
            ui: UiConfig {
                theme: "system".to_string(),
                language: "zh-CN".to_string(),
                start_minimized: false,
                autostart: false,
            },
        }
    }
}

impl AppConfig {
    pub fn load() -> Self {
        crate::config::storage::load_config().unwrap_or_default()
    }

    pub fn save(&self) -> Result<(), anyhow::Error> {
        crate::config::storage::save_config(self)
    }
}

pub fn get_preset_upstreams() -> Vec<UpstreamDns> {
    vec![
        UpstreamDns {
            id: Uuid::new_v4().to_string(),
            name: "阿里 DoH".to_string(),
            address: "https://dns.alidns.com/dns-query".to_string(),
            protocol: DnsProtocol::DoH,
            port: 443,
            weight: 50,
            enabled: true,
            tls_hostname: None,
            timeout_ms: 3000,
        },
        UpstreamDns {
            id: Uuid::new_v4().to_string(),
            name: "阿里 DoT".to_string(),
            address: "dns.alidns.com".to_string(),
            protocol: DnsProtocol::DoT,
            port: 853,
            weight: 50,
            enabled: true,
            tls_hostname: Some("dns.alidns.com".to_string()),
            timeout_ms: 3000,
        },
        UpstreamDns {
            id: Uuid::new_v4().to_string(),
            name: "阿里 UDP".to_string(),
            address: "223.6.6.6".to_string(),
            protocol: DnsProtocol::UDP,
            port: 53,
            weight: 50,
            enabled: true,
            tls_hostname: None,
            timeout_ms: 3000,
        },
        UpstreamDns {
            id: Uuid::new_v4().to_string(),
            name: "腾讯 DoT".to_string(),
            address: "dot.pub".to_string(),
            protocol: DnsProtocol::DoT,
            port: 853,
            weight: 50,
            enabled: true,
            tls_hostname: Some("dot.pub".to_string()),
            timeout_ms: 3000,
        },
        UpstreamDns {
            id: Uuid::new_v4().to_string(),
            name: "腾讯 UDP".to_string(),
            address: "119.29.29.29".to_string(),
            protocol: DnsProtocol::UDP,
            port: 53,
            weight: 50,
            enabled: true,
            tls_hostname: None,
            timeout_ms: 3000,
        },
        UpstreamDns {
            id: Uuid::new_v4().to_string(),
            name: "114 UDP".to_string(),
            address: "114.114.114.114".to_string(),
            protocol: DnsProtocol::UDP,
            port: 53,
            weight: 50,
            enabled: true,
            tls_hostname: None,
            timeout_ms: 3000,
        },
    ]
}
