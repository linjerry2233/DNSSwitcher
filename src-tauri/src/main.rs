// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{Manager, Emitter};

mod dns;
mod stats;
mod config;
mod system;
mod commands;

use config::models::AppConfig;
use stats::collector::GlobalStats;
use dns::cache::DnsCache;
use dns::resolver::DnsResolver;
use dns::server::DnsServer;

pub struct AppState {
    pub config: Arc<RwLock<AppConfig>>,
    pub stats: Arc<GlobalStats>,
    pub cache: Arc<DnsCache>,
    pub resolver: Arc<DnsResolver>,
    pub dns_setter: Arc<RwLock<system::dns_setter::DnsSetter>>,
    pub dns_server: Arc<RwLock<Option<DnsServer>>>,
}

/// 检测当前进程是否以管理员身份运行
#[cfg(target_os = "windows")]
fn is_elevated() -> bool {
    use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token = Default::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }
        let mut elevation: TOKEN_ELEVATION = std::mem::zeroed();
        let mut size = 0u32;
        let _ = GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut size,
        );
        elevation.TokenIsElevated != 0
    }
}

/// 以管理员身份重新启动自身
#[cfg(target_os = "windows")]
fn relaunch_as_admin() {
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOW;
    use windows::core::w;

    let exe = std::env::current_exe().unwrap();
    let exe_path = exe.to_string_lossy().to_string();
    let exe_w: Vec<u16> = exe_path.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        ShellExecuteW(
            None,
            w!("runas"),
            windows::core::PCWSTR(exe_w.as_ptr()),
            None,
            None,
            SW_SHOW,
        );
    }
}

#[tokio::main]
async fn main() {
    // Windows: 检测管理员权限，如果没有则提权重启
    #[cfg(target_os = "windows")]
    {
        if !is_elevated() {
            relaunch_as_admin();
            return;
        }
    }
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .setup(|app| {
            let config = Arc::new(RwLock::new(AppConfig::load()));
            let stats = Arc::new(GlobalStats::new());
            let cache = Arc::new(DnsCache::new(10000, 60, 3600));
            let resolver = Arc::new(DnsResolver::new());
            let dns_setter = Arc::new(RwLock::new(system::dns_setter::DnsSetter::new()));
            let dns_server = Arc::new(RwLock::new(None::<DnsServer>));

            app.manage(AppState {
                config: config.clone(),
                stats: stats.clone(),
                cache: cache.clone(),
                resolver: resolver.clone(),
                dns_setter: dns_setter.clone(),
                dns_server: dns_server.clone(),
            });

            let app_handle = app.handle().clone();
            let stats_clone = stats.clone();

            // 启动统计推送任务
            tokio::spawn(async move {
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    let snapshot = stats_clone.get_snapshot();
                    let _ = app_handle.emit("dns://stats-update", &snapshot);
                }
            });

            // 自动启动 DNS 服务（不自动劫持系统 DNS）
            let auto_dns_server = DnsServer::new(
                config.clone(),
                stats.clone(),
                cache.clone(),
                resolver.clone(),
            );
            let auto_dns_server_arc = dns_server.clone();
            tokio::spawn(async move {
                match auto_dns_server.start().await {
                    Ok(()) => {
                        {
                            let mut server_guard = auto_dns_server_arc.write().await;
                            *server_guard = Some(auto_dns_server);
                        }
                        tracing::info!("DNS service auto-started successfully");
                    }
                    Err(e) => {
                        tracing::error!("Failed to auto-start DNS service: {}", e);
                    }
                }
            });

            // 应用关闭时还原 DNS 设置（通过 DnsSetter 的 Drop trait 自动处理）

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::dns::start_dns_service,
            commands::dns::stop_dns_service,
            commands::dns::get_service_status,
            commands::dns::apply_system_dns,
            commands::dns::restore_system_dns,
            commands::upstream::get_upstreams,
            commands::upstream::add_upstream,
            commands::upstream::update_upstream,
            commands::upstream::delete_upstream,
            commands::upstream::test_upstream,
            commands::upstream::set_work_mode,
            commands::stats::get_stats_snapshot,
            commands::stats::get_query_log,
            commands::stats::clear_query_log,
            commands::cache::get_cache_entries,
            commands::cache::clear_cache,
            commands::cache::delete_cache_entry,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::get_local_network_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
