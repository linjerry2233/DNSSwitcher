use anyhow::Result;
use tracing::{info, warn, error};

pub struct FirewallManager {
    rule_name_udp: String,
    rule_name_tcp: String,
}

impl FirewallManager {
    pub fn new() -> Self {
        Self {
            rule_name_udp: "RustDNS UDP".to_string(),
            rule_name_tcp: "RustDNS TCP".to_string(),
        }
    }

    pub fn add_rules(&self, port: u16) -> Result<()> {
        // 添加 UDP 入站规则
        let output = std::process::Command::new("netsh")
            .args([
                "advfirewall", "firewall", "add", "rule",
                &format!("name={}", self.rule_name_udp),
                "dir=in",
                "action=allow",
                "protocol=UDP",
                &format!("localport={}", port),
            ])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("Failed to add UDP firewall rule: {}", stderr);
        } else {
            info!("Added UDP firewall rule for port {}", port);
        }

        // 添加 TCP 入站规则
        let output = std::process::Command::new("netsh")
            .args([
                "advfirewall", "firewall", "add", "rule",
                &format!("name={}", self.rule_name_tcp),
                "dir=in",
                "action=allow",
                "protocol=TCP",
                &format!("localport={}", port),
            ])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("Failed to add TCP firewall rule: {}", stderr);
        } else {
            info!("Added TCP firewall rule for port {}", port);
        }

        Ok(())
    }

    pub fn remove_rules(&self) -> Result<()> {
        // 删除 UDP 入站规则
        let output = std::process::Command::new("netsh")
            .args([
                "advfirewall", "firewall", "delete", "rule",
                &format!("name={}", self.rule_name_udp),
            ])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("Failed to remove UDP firewall rule: {}", stderr);
        } else {
            info!("Removed UDP firewall rule");
        }

        // 删除 TCP 入站规则
        let output = std::process::Command::new("netsh")
            .args([
                "advfirewall", "firewall", "delete", "rule",
                &format!("name={}", self.rule_name_tcp),
            ])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("Failed to remove TCP firewall rule: {}", stderr);
        } else {
            info!("Removed TCP firewall rule");
        }

        Ok(())
    }
}
