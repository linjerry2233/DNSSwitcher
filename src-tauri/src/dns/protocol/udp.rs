use hickory_proto::op::Message;
use anyhow::Result;
use tokio::net::UdpSocket;

pub async fn send_query(address: &str, port: u16, query: &Message, timeout_ms: u64) -> Result<Message> {
    let socket = UdpSocket::bind("0.0.0.0:0").await?;
    let addr = format!("{}:{}", address, port);
    let query_bytes = query.to_vec()?;

    socket.send_to(&query_bytes, &addr).await?;

    let mut buf = vec![0u8; 512];
    let recv_future = socket.recv_from(&mut buf);
    let timeout = tokio::time::sleep(tokio::time::Duration::from_millis(timeout_ms));

    tokio::select! {
        result = recv_future => {
            let (len, _) = result?;
            Ok(Message::from_vec(&buf[..len])?)
        }
        _ = timeout => {
            Err(anyhow::anyhow!("UDP query timeout"))
        }
    }
}
