use tauri::State;
use crate::AppState;
use crate::config::models::{UpstreamDns, WorkMode};

#[tauri::command]
pub async fn get_upstreams(state: State<'_, AppState>) -> Result<Vec<UpstreamDns>, String> {
    let config = state.config.read().await;
    Ok(config.upstreams.clone())
}

#[tauri::command]
pub async fn add_upstream(
    state: State<'_, AppState>,
    upstream: UpstreamDns,
) -> Result<(), String> {
    let mut config = state.config.write().await;
    config.upstreams.push(upstream);
    config.save().map_err(|e| e.to_string())?;

    // 更新解析器
    state.resolver.update_upstreams(config.upstreams.clone()).await;

    Ok(())
}

#[tauri::command]
pub async fn update_upstream(
    state: State<'_, AppState>,
    upstream: UpstreamDns,
) -> Result<(), String> {
    let mut config = state.config.write().await;
    if let Some(existing) = config.upstreams.iter_mut().find(|u| u.id == upstream.id) {
        *existing = upstream;
        config.save().map_err(|e| e.to_string())?;

        // 更新解析器
        state.resolver.update_upstreams(config.upstreams.clone()).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_upstream(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut config = state.config.write().await;
    config.upstreams.retain(|u| u.id != id);
    config.save().map_err(|e| e.to_string())?;

    // 更新解析器
    state.resolver.update_upstreams(config.upstreams.clone()).await;

    Ok(())
}

#[tauri::command]
pub async fn test_upstream(
    state: State<'_, AppState>,
    id: String,
) -> Result<u64, String> {
    let config = state.config.read().await;
    let upstream = config.upstreams.iter()
        .find(|u| u.id == id)
        .ok_or_else(|| "Upstream not found".to_string())?;

    state.resolver.test_upstream(upstream).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_work_mode(
    state: State<'_, AppState>,
    mode: WorkMode,
) -> Result<(), String> {
    let mut config = state.config.write().await;
    config.work_mode = mode.clone();
    config.save().map_err(|e| e.to_string())?;

    state.resolver.set_mode(mode).await;

    Ok(())
}
