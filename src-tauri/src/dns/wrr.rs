use crate::config::models::UpstreamDns;

pub struct SmoothWRR {
    servers: Vec<(UpstreamDns, i64)>,
}

impl SmoothWRR {
    pub fn new() -> Self {
        Self {
            servers: Vec::new(),
        }
    }

    pub fn update(&mut self, servers: Vec<UpstreamDns>) {
        self.servers = servers.into_iter()
            .map(|s| (s, 0))
            .collect();
    }

    pub fn next(&mut self) -> Option<&UpstreamDns> {
        if self.servers.is_empty() {
            return None;
        }

        let total: i64 = self.servers.iter().map(|(s, _)| s.weight as i64).sum();
        if total == 0 {
            return self.servers.first().map(|(s, _)| s);
        }

        // 增加当前权重
        for (_, cw) in &mut self.servers {
            *cw += 0; // 这里应该加上各自的 weight，但需要先获取引用
        }

        // 重新实现以避免借用问题
        let mut max_idx = 0;
        let mut max_cw = i64::MIN;

        for (i, (s, cw)) in self.servers.iter_mut().enumerate() {
            *cw += s.weight as i64;
            if *cw > max_cw {
                max_cw = *cw;
                max_idx = i;
            }
        }

        // 减去总权重
        if let Some((_, cw)) = self.servers.get_mut(max_idx) {
            *cw -= total;
        }

        self.servers.get(max_idx).map(|(s, _)| s)
    }

    pub fn len(&self) -> usize {
        self.servers.len()
    }

    pub fn is_empty(&self) -> bool {
        self.servers.is_empty()
    }
}
