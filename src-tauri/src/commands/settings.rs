use tauri::State;
use serde::Serialize;
use crate::AppState;
use crate::config::models::AppConfig;

#[derive(Serialize)]
pub struct NetworkInfo {
    pub local_ip: String,
    pub cidrs: Vec<String>,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state.config.read().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    settings: AppConfig,
) -> Result<(), String> {
    let mut config = state.config.write().await;
    *config = settings;
    config.save().map_err(|e| e.to_string())?;

    // 更新缓存配置
    state.cache.set_ttl_range(config.cache.min_ttl, config.cache.max_ttl);
    state.cache.set_enabled(config.cache.enabled);

    Ok(())
}

#[tauri::command]
pub async fn get_local_network_info() -> Result<NetworkInfo, String> {
    let (local_ip, cidrs) = crate::system::dns_setter::DnsSetter::get_local_network_info()
        .map_err(|e| e.to_string())?;
    Ok(NetworkInfo { local_ip, cidrs })
}
