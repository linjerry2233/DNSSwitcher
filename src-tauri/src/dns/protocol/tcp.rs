use hickory_proto::op::Message;
use anyhow::Result;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub async fn send_query(address: &str, port: u16, query: &Message, timeout_ms: u64) -> Result<Message> {
    let addr = format!("{}:{}", address, port);
    let connect_future = TcpStream::connect(&addr);
    let timeout = tokio::time::sleep(tokio::time::Duration::from_millis(timeout_ms));

    let mut stream = tokio::select! {
        result = connect_future => result?,
        _ = timeout => {
            return Err(anyhow::anyhow!("TCP connection timeout"));
        }
    };

    let query_bytes = query.to_vec()?;
    let len = (query_bytes.len() as u16).to_be_bytes();

    stream.write_all(&len).await?;
    stream.write_all(&query_bytes).await?;

    let mut len_buf = [0u8; 2];
    let read_len_future = stream.read_exact(&mut len_buf);
    let timeout = tokio::time::sleep(tokio::time::Duration::from_millis(timeout_ms));

    tokio::select! {
        result = read_len_future => {
            result?;
        }
        _ = timeout => {
            return Err(anyhow::anyhow!("TCP read timeout"));
        }
    }

    let resp_len = u16::from_be_bytes(len_buf) as usize;
    let mut resp_buf = vec![0u8; resp_len];

    let read_future = stream.read_exact(&mut resp_buf);
    let timeout = tokio::time::sleep(tokio::time::Duration::from_millis(timeout_ms));

    tokio::select! {
        result = read_future => {
            result?;
            Ok(Message::from_vec(&resp_buf)?)
        }
        _ = timeout => {
            Err(anyhow::anyhow!("TCP read timeout"))
        }
    }
}
