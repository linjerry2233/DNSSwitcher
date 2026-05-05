use tauri::State;
use crate::AppState;
use crate::dns::cache::CacheEntryInfo;

#[tauri::command]
pub async fn get_cache_entries(
    state: State<'_, AppState>,
    search: String,
) -> Result<Vec<CacheEntryInfo>, String> {
    Ok(state.cache.get_entries(&search).await)
}

#[tauri::command]
pub async fn clear_cache(state: State<'_, AppState>) -> Result<(), String> {
    state.cache.clear().await;
    Ok(())
}

#[tauri::command]
pub async fn delete_cache_entry(
    state: State<'_, AppState>,
    key: String,
) -> Result<(), String> {
    // TODO: 解析 key 并删除缓存条目
    Ok(())
}
