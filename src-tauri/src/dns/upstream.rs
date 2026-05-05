use hickory_proto::op::Message;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::config::models::{UpstreamDns, DnsProtocol};

#[derive(Clone)]
pub struct UpstreamClient {
    config: UpstreamDns,
    doh_client: Option<reqwest::Client>,
    dot_stream: Arc<Mutex<Option<tokio_rustls::client::TlsStream<tokio::net::TcpStream>>>>,
}

impl UpstreamClient {
    pub fn new(config: UpstreamDns) -> Self {
        let timeout = std::time::Duration::from_millis(config.timeout_ms.max(3000));

        let doh_client = if config.protocol == DnsProtocol::DoH {
            Some(reqwest::Client::builder()
                .timeout(timeout)
                .build()
                .unwrap())
        } else {
            None
        };

        Self {
            config,
            doh_client,
            dot_stream: Arc::new(Mutex::new(None)),
        }
    }

    pub fn id(&self) -> &str {
        &self.config.id
    }

    pub fn name(&self) -> &str {
        &self.config.name
    }

    pub async fn send_query(&self, query: &Message) -> Result<Message> {
        let timeout = std::time::Duration::from_millis(self.config.timeout_ms.max(3000));
        tokio::time::timeout(timeout, self.send_query_inner(query))
            .await
            .map_err(|_| anyhow::anyhow!("Query timeout after {}ms", timeout.as_millis()))?
    }

    async fn send_query_inner(&self, query: &Message) -> Result<Message> {
        match self.config.protocol {
            DnsProtocol::UDP => self.send_udp(query).await,
            DnsProtocol::TCP => self.send_tcp(query).await,
            DnsProtocol::DoH => self.send_doh(query).await,
            DnsProtocol::DoT => self.send_dot(query).await,
            DnsProtocol::DoQ => self.send_doq(query).await,
        }
    }

    async fn send_udp(&self, query: &Message) -> Result<Message> {
        use tokio::net::UdpSocket;

        let socket = UdpSocket::bind("0.0.0.0:0").await?;
        let addr = format!("{}:{}", self.config.address, self.config.port);
        let query_bytes = query.to_vec()?;

        socket.send_to(&query_bytes, &addr).await?;

        let mut buf = vec![0u8; 4096];
        let (len, _) = socket.recv_from(&mut buf).await?;

        Ok(Message::from_vec(&buf[..len])?)
    }

    async fn send_tcp(&self, query: &Message) -> Result<Message> {
        use tokio::net::TcpStream;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let addr = format!("{}:{}", self.config.address, self.config.port);
        let mut stream = TcpStream::connect(&addr).await?;

        let query_bytes = query.to_vec()?;
        let len = (query_bytes.len() as u16).to_be_bytes();
        stream.write_all(&len).await?;
        stream.write_all(&query_bytes).await?;

        let mut len_buf = [0u8; 2];
        stream.read_exact(&mut len_buf).await?;
        let resp_len = u16::from_be_bytes(len_buf) as usize;

        let mut resp_buf = vec![0u8; resp_len];
        stream.read_exact(&mut resp_buf).await?;

        Ok(Message::from_vec(&resp_buf)?)
    }

    async fn send_doh(&self, query: &Message) -> Result<Message> {
        let client = self.doh_client.as_ref()
            .ok_or_else(|| anyhow::anyhow!("DoH client not initialized"))?;

        let query_bytes = query.to_vec()?;
        let url = &self.config.address;

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

    async fn send_dot(&self, query: &Message) -> Result<Message> {
        use tokio::net::TcpStream;
        use tokio_rustls::TlsConnector;
        use rustls::ClientConfig;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let mut stream_guard = self.dot_stream.lock().await;

        if stream_guard.is_none() {
            let addr = format!("{}:{}", self.config.address, self.config.port);
            let tcp_stream = TcpStream::connect(&addr).await?;

            let mut root_store = rustls::RootCertStore::empty();
            for cert in rustls_native_certs::load_native_certs()? {
                root_store.add(cert)?;
            }

            let config = ClientConfig::builder()
                .with_root_certificates(root_store)
                .with_no_client_auth();

            let hostname = self.config.tls_hostname.as_deref()
                .unwrap_or(&self.config.address);
            let domain = rustls::pki_types::ServerName::try_from(hostname.to_string())?;

            let connector = TlsConnector::from(Arc::new(config));
            let tls_stream = connector.connect(domain, tcp_stream).await?;

            *stream_guard = Some(tls_stream);
        }

        let stream = stream_guard.as_mut().unwrap();
        let query_bytes = query.to_vec()?;
        let len = (query_bytes.len() as u16).to_be_bytes();

        stream.write_all(&len).await?;
        stream.write_all(&query_bytes).await?;

        let mut len_buf = [0u8; 2];
        stream.read_exact(&mut len_buf).await?;
        let resp_len = u16::from_be_bytes(len_buf) as usize;

        let mut resp_buf = vec![0u8; resp_len];
        stream.read_exact(&mut resp_buf).await?;

        Ok(Message::from_vec(&resp_buf)?)
    }

    async fn send_doq(&self, _query: &Message) -> Result<Message> {
        Err(anyhow::anyhow!("DoQ not yet implemented"))
    }
}
