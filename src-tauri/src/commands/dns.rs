use tauri::State;
use crate::AppState;
use crate::dns::server::DnsServer;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub running: bool,
    pub listen_address: String,
    pub external_enabled: bool,
    pub dns_applied: bool,
}

#[tauri::command]
pub async fn start_dns_service(state: State<'_, AppState>) -> Result<(), String> {
    {
        let server_guard = state.dns_server.read().await;
        if let Some(ref server) = *server_guard {
            if server.is_running() {
                return Ok(());
            }
        }
    }

    let server = DnsServer::new(
        state.config.clone(),
        state.stats.clone(),
        state.cache.clone(),
        state.resolver.clone(),
    );

    server.start().await.map_err(|e| e.to_string())?;

    {
        let mut server_guard = state.dns_server.write().await;
        *server_guard = Some(server);
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_dns_service(state: State<'_, AppState>) -> Result<(), String> {
    {
        let mut server_guard = state.dns_server.write().await;
        if let Some(ref server) = *server_guard {
            server.stop();
        }
        *server_guard = None;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_service_status(state: State<'_, AppState>) -> Result<ServiceStatus, String> {
    let config = state.config.read().await;

    let running = {
        let server_guard = state.dns_server.read().await;
        server_guard.as_ref().map_or(false, |s| s.is_running())
    };

    let dns_applied = {
        let setter = state.dns_setter.read().await;
        setter.is_applied()
    };

    Ok(ServiceStatus {
        running,
        listen_address: format!("127.0.0.1:{}", config.server.local_port),
        external_enabled: config.server.external_service_enabled,
        dns_applied,
    })
}

#[tauri::command]
pub async fn apply_system_dns(state: State<'_, AppState>) -> Result<(), String> {
    let mut setter = state.dns_setter.write().await;
    setter.apply().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn restore_system_dns(state: State<'_, AppState>) -> Result<(), String> {
    let mut setter = state.dns_setter.write().await;
    setter.restore().map_err(|e| e.to_string())?;
    Ok(())
}
