use hickory_proto::op::Message;
use anyhow::Result;

pub async fn send_query(url: &str, query: &Message, timeout_ms: u64) -> Result<Message> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()?;

    let query_bytes = query.to_vec()?;

    let response = client
        .post(url)
        .header("Content-Type", "application/dns-message")
        .header("Accept", "application/dns-message")
        .body(query_bytes)
        .send()
        .await?;

    let resp_bytes = response.bytes().await?;
    Ok(Message::from_vec(&resp_bytes)?)
}

pub async fn send_json_query(url: &str, domain: &str, qtype: &str, timeout_ms: u64) -> Result<Message> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()?;

    let response = client
        .get(url)
        .query(&[("name", domain), ("type", qtype)])
        .header("Accept", "application/dns-json")
        .send()
        .await?;

    let json: serde_json::Value = response.json().await?;

    // 将 JSON 响应转换为 DNS Message
    // 这里简化处理，实际应该完整解析
    let mut msg = Message::new();
    // TODO: 解析 JSON 并构建 Message

    Ok(msg)
}
