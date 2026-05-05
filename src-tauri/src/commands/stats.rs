use tauri::State;
use crate::AppState;
use crate::stats::models::{StatsSnapshot, QueryRecord, LogFilter};

#[tauri::command]
pub async fn get_stats_snapshot(state: State<'_, AppState>) -> Result<StatsSnapshot, String> {
    Ok(state.stats.get_snapshot())
}

#[tauri::command]
pub async fn get_query_log(
    state: State<'_, AppState>,
    filter: LogFilter,
) -> Result<Vec<QueryRecord>, String> {
    let queries = state.stats.get_recent_queries(5000).await;

    let filtered: Vec<QueryRecord> = queries.into_iter()
        .filter(|q| {
            if let Some(ref domain_search) = filter.domain_search {
                if !q.domain.contains(domain_search.as_str()) {
                    return false;
                }
            }
            if let Some(ref qtype) = filter.qtype_filter {
                if q.qtype != *qtype {
                    return false;
                }
            }
            if let Some(ref code) = filter.response_code_filter {
                if q.response_code != *code {
                    return false;
                }
            }
            if let Some(ref cache) = filter.cache_filter {
                match cache.as_str() {
                    "hit" => if !q.cache_hit { return false; },
                    "miss" => if q.cache_hit { return false; },
                    _ => {}
                }
            }
            true
        })
        .collect();

    Ok(filtered)
}

#[tauri::command]
pub async fn clear_query_log(state: State<'_, AppState>) -> Result<(), String> {
    state.stats.clear_recent_queries().await;
    Ok(())
}
