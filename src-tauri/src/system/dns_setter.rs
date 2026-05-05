use std::collections::HashMap;
use std::os::windows::process::CommandExt;
use anyhow::Result;
use tracing::{info, warn};

const CREATE_NO_WINDOW: u32 = 0x08000000;

/// 单个适配器的 DNS 快照（IPv4 + IPv6）
#[derive(Debug, Clone)]
struct DnsSnapshot {
    ipv4: Vec<String>,
    ipv6: Vec<String>,
    ipv4_was_dhcp: bool,
    ipv6_was_dhcp: bool,
}

pub struct DnsSetter {
    original_dns: HashMap<String, DnsSnapshot>,
    applied: bool,
}

impl DnsSetter {
    pub fn new() -> Self {
        Self {
            original_dns: HashMap::new(),
            applied: false,
        }
    }

    /// 应用 DNS 劫持：将所有活跃适配器的 DNS 指向本机（IPv4: 127.0.0.1, IPv6: ::1）
    pub fn apply(&mut self) -> Result<()> {
        if self.applied {
            return Ok(());
        }

        let adapters = self.get_active_adapters()?;
        info!("Found {} active adapters: {:?}", adapters.len(), adapters);

        let mut success_count = 0;

        for adapter in &adapters {
            // 保存原始 DNS 配置（IPv4 + IPv6）
            let snapshot = self.snapshot_adapter_dns(adapter);
            info!(
                "Adapter '{}': IPv4={:?} (DHCP={}), IPv6={:?} (DHCP={})",
                adapter, snapshot.ipv4, snapshot.ipv4_was_dhcp, snapshot.ipv6, snapshot.ipv6_was_dhcp
            );
            self.original_dns.insert(adapter.clone(), snapshot);

            // 设置 IPv4 DNS 为 127.0.0.1
            match self.set_adapter_dns_v4(adapter, "127.0.0.1") {
                Ok(()) => {
                    info!("Set IPv4 DNS for '{}' to 127.0.0.1", adapter);
                }
                Err(e) => {
                    warn!("Failed to set IPv4 DNS for '{}': {}", adapter, e);
                    continue;
                }
            }

            // 设置 IPv6 DNS 为 ::1
            match self.set_adapter_dns_v6(adapter, "::1") {
                Ok(()) => {
                    info!("Set IPv6 DNS for '{}' to ::1", adapter);
                }
                Err(e) => {
                    warn!("Failed to set IPv6 DNS for '{}' (non-critical): {}", adapter, e);
                }
            }

            success_count += 1;
        }

        if success_count == 0 && !adapters.is_empty() {
            return Err(anyhow::anyhow!("Failed to set DNS on any adapter"));
        }

        self.applied = true;
        info!("DNS hijack applied on {}/{} adapters", success_count, adapters.len());
        Ok(())
    }

    /// 还原所有适配器的 DNS 设置到劫持前的状态
    pub fn restore(&self) -> Result<()> {
        if !self.applied {
            return Ok(());
        }

        for (adapter, snapshot) in &self.original_dns {
            // 还原 IPv4 DNS
            if snapshot.ipv4_was_dhcp || snapshot.ipv4.is_empty() {
                if let Err(e) = self.set_adapter_dhcp_v4(adapter) {
                    warn!("Failed to restore IPv4 DNS to DHCP for '{}': {}", adapter, e);
                } else {
                    info!("Restored IPv4 DNS for '{}' to DHCP", adapter);
                }
            } else {
                // 还原所有原始 IPv4 DNS 服务器
                for (i, dns) in snapshot.ipv4.iter().enumerate() {
                    if i == 0 {
                        if let Err(e) = self.set_adapter_dns_v4(adapter, dns) {
                            warn!("Failed to restore primary IPv4 DNS for '{}': {}", adapter, e);
                        } else {
                            info!("Restored primary IPv4 DNS for '{}' to {}", adapter, dns);
                        }
                    } else {
                        if let Err(e) = self.add_adapter_dns_v4(adapter, dns) {
                            warn!("Failed to restore secondary IPv4 DNS for '{}': {}", adapter, e);
                        } else {
                            info!("Restored secondary IPv4 DNS for '{}' to {}", adapter, dns);
                        }
                    }
                }
            }

            // 还原 IPv6 DNS
            if snapshot.ipv6_was_dhcp || snapshot.ipv6.is_empty() {
                if let Err(e) = self.set_adapter_dhcp_v6(adapter) {
                    warn!("Failed to restore IPv6 DNS to DHCP for '{}': {}", adapter, e);
                } else {
                    info!("Restored IPv6 DNS for '{}' to DHCP", adapter);
                }
            } else {
                for (i, dns) in snapshot.ipv6.iter().enumerate() {
                    if i == 0 {
                        if let Err(e) = self.set_adapter_dns_v6(adapter, dns) {
                            warn!("Failed to restore primary IPv6 DNS for '{}': {}", adapter, e);
                        } else {
                            info!("Restored primary IPv6 DNS for '{}' to {}", adapter, dns);
                        }
                    } else {
                        if let Err(e) = self.add_adapter_dns_v6(adapter, dns) {
                            warn!("Failed to restore secondary IPv6 DNS for '{}': {}", adapter, e);
                        } else {
                            info!("Restored secondary IPv6 DNS for '{}' to {}", adapter, dns);
                        }
                    }
                }
            }
        }

        info!("DNS settings restored for all adapters");
        Ok(())
    }

    /// 获取所有活跃的网络适配器名称
    fn get_active_adapters(&self) -> Result<Vec<String>> {
        let output = std::process::Command::new("netsh")
            .args(["interface", "show", "interface"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut adapters = Vec::new();

        for line in stdout.lines() {
            // 匹配已启用/已连接状态（中英文系统）
            if line.contains("已启用") || line.contains("Enabled") || line.contains("Connected") {
                // 跳过表头行
                if line.contains("管理员状态") || line.contains("Admin State") || line.contains("State") && line.contains("Type") {
                    continue;
                }
                // netsh output format: "  Enabled  Connected  Dedicated  Wi-Fi"
                let parts: Vec<&str> = line.splitn(4, char::is_whitespace).collect();
                if parts.len() >= 4 {
                    let name = parts[3].trim();
                    if !name.is_empty() {
                        adapters.push(name.to_string());
                    }
                }
            }
        }

        Ok(adapters)
    }

    /// 快照适配器的 IPv4 和 IPv6 DNS 配置
    fn snapshot_adapter_dns(&self, adapter: &str) -> DnsSnapshot {
        let (ipv4, ipv4_was_dhcp) = self.get_adapter_dns_v4(adapter).unwrap_or((Vec::new(), true));
        let (ipv6, ipv6_was_dhcp) = self.get_adapter_dns_v6(adapter).unwrap_or((Vec::new(), true));
        DnsSnapshot {
            ipv4,
            ipv6,
            ipv4_was_dhcp,
            ipv6_was_dhcp,
        }
    }

    /// 获取适配器的 IPv4 DNS 设置，返回 (DNS 列表, 是否为 DHCP)
    fn get_adapter_dns_v4(&self, adapter: &str) -> Result<(Vec<String>, bool)> {
        let output = std::process::Command::new("netsh")
            .args(["interface", "ip", "show", "dns", &format!("name={}", adapter)])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        self.parse_dns_output(&stdout)
    }

    /// 获取适配器的 IPv6 DNS 设置，返回 (DNS 列表, 是否为 DHCP)
    fn get_adapter_dns_v6(&self, adapter: &str) -> Result<(Vec<String>, bool)> {
        let output = std::process::Command::new("netsh")
            .args(["interface", "ipv6", "show", "dns", &format!("name={}", adapter)])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        self.parse_dns_output(&stdout)
    }

    /// 解析 netsh 输出中的 DNS 地址（兼容中英文系统）
    fn parse_dns_output(&self, output: &str) -> Result<(Vec<String>, bool)> {
        let mut dns_list = Vec::new();
        let mut is_dhcp = false;

        for line in output.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            // 检测 DHCP 模式
            if trimmed.contains("DHCP") || trimmed.contains("dhcp") {
                // 额外检查：如果行中也包含 IP 地址，说明 DHCP 下有手动设置的 DNS
                let has_ip = trimmed.split(':').last().map_or(false, |s| {
                    let addr = s.trim();
                    addr.parse::<std::net::IpAddr>().is_ok()
                });
                if !has_ip {
                    is_dhcp = true;
                    continue;
                }
            }

            // 提取 IP 地址：匹配 "DNS" 或 "dns" 开头的行
            // 格式示例:
            //   "  配置的 DNS 服务器:     192.168.1.1"
            //   "  Statically Configured DNS Servers:    8.8.8.8"
            //   "  DNS servers configured through DHCP:  192.168.1.1"
            if (trimmed.contains("DNS") || trimmed.contains("dns"))
                && trimmed.contains(':')
            {
                if let Some(ip_part) = trimmed.split(':').last() {
                    let addr = ip_part.trim();
                    if !addr.is_empty() && addr.parse::<std::net::IpAddr>().is_ok() {
                        dns_list.push(addr.to_string());
                    }
                }
            }
        }

        Ok((dns_list, is_dhcp))
    }

    /// 设置 IPv4 DNS（替换主 DNS）
    fn set_adapter_dns_v4(&self, adapter: &str, dns: &str) -> Result<()> {
        let output = std::process::Command::new("netsh")
            .args([
                "interface", "ip", "set", "dns",
                &format!("name={}", adapter),
                "static", dns,
                "primary",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(anyhow::anyhow!("Failed to set IPv4 DNS: {} {}", stderr, stdout));
        }

        Ok(())
    }

    /// 添加额外的 IPv4 DNS 服务器
    fn add_adapter_dns_v4(&self, adapter: &str, dns: &str) -> Result<()> {
        let output = std::process::Command::new("netsh")
            .args([
                "interface", "ip", "add", "dns",
                &format!("name={}", adapter),
                dns,
                "index=2",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to add IPv4 DNS: {}", stderr));
        }

        Ok(())
    }

    /// 设置 IPv6 DNS（替换主 DNS）
    fn set_adapter_dns_v6(&self, adapter: &str, dns: &str) -> Result<()> {
        let output = std::process::Command::new("netsh")
            .args([
                "interface", "ipv6", "set", "dns",
                &format!("name={}", adapter),
                "static", dns,
                "primary",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(anyhow::anyhow!("Failed to set IPv6 DNS: {} {}", stderr, stdout));
        }

        Ok(())
    }

    /// 添加额外的 IPv6 DNS 服务器
    fn add_adapter_dns_v6(&self, adapter: &str, dns: &str) -> Result<()> {
        let output = std::process::Command::new("netsh")
            .args([
                "interface", "ipv6", "add", "dns",
                &format!("name={}", adapter),
                dns,
                "index=2",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to add IPv6 DNS: {}", stderr));
        }

        Ok(())
    }

    /// 将 IPv4 DNS 恢复为 DHCP
    fn set_adapter_dhcp_v4(&self, adapter: &str) -> Result<()> {
        let output = std::process::Command::new("netsh")
            .args([
                "interface", "ip", "set", "dns",
                &format!("name={}", adapter),
                "dhcp",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to set IPv4 DNS to DHCP: {}", stderr));
        }

        Ok(())
    }

    /// 将 IPv6 DNS 恢复为 DHCP
    fn set_adapter_dhcp_v6(&self, adapter: &str) -> Result<()> {
        let output = std::process::Command::new("netsh")
            .args([
                "interface", "ipv6", "set", "dns",
                &format!("name={}", adapter),
                "dhcp",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to set IPv6 DNS to DHCP: {}", stderr));
        }

        Ok(())
    }

    pub fn is_applied(&self) -> bool {
        self.applied
    }

    /// 获取本机活跃网络适配器的 IP 地址和 CIDR
    pub fn get_local_network_info() -> Result<(String, Vec<String>)> {
        let local_ip = Self::detect_local_ip().unwrap_or_else(|_| "127.0.0.1".to_string());
        let cidrs = Self::detect_cidrs().unwrap_or_default();
        Ok((local_ip, cidrs))
    }

    /// 通过 UDP socket 探测本机出口 IP（不实际发送数据）
    fn detect_local_ip() -> Result<String> {
        use std::net::UdpSocket;
        let socket = UdpSocket::bind("0.0.0.0:0")?;
        socket.connect("8.8.8.8:53")?;
        let local_addr = socket.local_addr()?;
        Ok(local_addr.ip().to_string())
    }

    /// 解析 ipconfig 获取所有活跃适配器的 CIDR
    fn detect_cidrs() -> Result<Vec<String>> {
        let output = std::process::Command::new("ipconfig")
            .creation_flags(CREATE_NO_WINDOW)
            .output()?;
        let stdout = String::from_utf8_lossy(&output.stdout);

        let mut cidrs = Vec::new();
        let mut current_ip = String::new();
        let mut current_subnet = String::new();
        let mut in_active = false;
        let mut has_ip = false;

        for line in stdout.lines() {
            let trimmed = line.trim();

            if (trimmed.contains("适配器") || trimmed.contains("adapter") || trimmed.contains("Adapter"))
                && trimmed.ends_with(':')
            {
                if in_active && has_ip && !current_ip.is_empty() && !current_subnet.is_empty() {
                    if let Some(cidr) = Self::ip_and_mask_to_cidr(&current_ip, &current_subnet) {
                        cidrs.push(cidr);
                    }
                }

                in_active = !trimmed.contains("Tunnel") && !trimmed.contains("Teredo")
                    && !trimmed.contains("Loopback") && !trimmed.contains("环回")
                    && !trimmed.contains("Automatic") && !trimmed.contains("自动");
                has_ip = false;
                current_ip.clear();
                current_subnet.clear();
                continue;
            }

            if !in_active {
                continue;
            }

            if (trimmed.contains("IPv4") || trimmed.contains("IP Address")) && trimmed.contains(':') {
                if let Some(ip_part) = trimmed.split(':').last() {
                    let ip = ip_part.trim().to_string();
                    if !ip.is_empty() && !ip.starts_with("169.254.") {
                        current_ip = ip;
                        has_ip = true;
                    }
                }
            }

            if (trimmed.contains("子网掩码") || trimmed.contains("Subnet Mask")) && trimmed.contains(':') {
                if let Some(mask_part) = trimmed.split(':').last() {
                    let mask = mask_part.trim().to_string();
                    if !mask.is_empty() {
                        current_subnet = mask;
                    }
                }
            }
        }

        if in_active && has_ip && !current_ip.is_empty() && !current_subnet.is_empty() {
            if let Some(cidr) = Self::ip_and_mask_to_cidr(&current_ip, &current_subnet) {
                cidrs.push(cidr);
            }
        }

        Ok(cidrs)
    }

    fn ip_and_mask_to_cidr(ip: &str, mask: &str) -> Option<String> {
        let ip_parts: Vec<u8> = ip.split('.').map(|s| s.parse().ok()).collect::<Option<Vec<u8>>>()?;
        let mask_parts: Vec<u8> = mask.split('.').map(|s| s.parse().ok()).collect::<Option<Vec<u8>>>()?;

        if ip_parts.len() != 4 || mask_parts.len() != 4 {
            return None;
        }

        let mask_u32 = ((mask_parts[0] as u32) << 24)
            | ((mask_parts[1] as u32) << 16)
            | ((mask_parts[2] as u32) << 8)
            | (mask_parts[3] as u32);

        let prefix_len = mask_u32.count_ones();

        let network_u32 = (((ip_parts[0] as u32) << 24)
            | ((ip_parts[1] as u32) << 16)
            | ((ip_parts[2] as u32) << 8)
            | (ip_parts[3] as u32)) & mask_u32;

        let network_ip = format!(
            "{}.{}.{}.{}",
            (network_u32 >> 24) & 0xFF,
            (network_u32 >> 16) & 0xFF,
            (network_u32 >> 8) & 0xFF,
            network_u32 & 0xFF
        );

        Some(format!("{}/{}", network_ip, prefix_len))
    }
}

impl Drop for DnsSetter {
    fn drop(&mut self) {
        if self.applied {
            let _ = self.restore();
        }
    }
}
