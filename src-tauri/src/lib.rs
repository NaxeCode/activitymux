mod config;
mod discord;
mod models;
mod process_monitor;
mod resolver;
mod service;

use crate::config::ConfigStore;
use crate::models::{AppConfig, RunningProcess, ServiceSnapshot};
use crate::service::AppState;
use std::path::PathBuf;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

#[tauri::command]
fn get_config(state: tauri::State<'_, AppState>) -> AppConfig {
    state
        .config
        .read()
        .expect("configuration lock poisoned")
        .clone()
}

#[tauri::command]
fn save_config(config: AppConfig, state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    state
        .store
        .save(&config)
        .map_err(|error| error.to_string())?;
    *state.config.write().expect("configuration lock poisoned") = config.clone();
    Ok(config)
}

#[tauri::command]
fn get_snapshot(state: tauri::State<'_, AppState>) -> ServiceSnapshot {
    state
        .snapshot
        .read()
        .expect("snapshot lock poisoned")
        .clone()
}

#[tauri::command]
fn list_processes() -> Vec<RunningProcess> {
    process_monitor::list_running_processes()
}

#[tauri::command]
fn set_manual_override(
    preset_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config = state
        .config
        .read()
        .expect("configuration lock poisoned")
        .clone();
    config.manual_override_preset_id = preset_id;
    state
        .store
        .save(&config)
        .map_err(|error| error.to_string())?;
    *state.config.write().expect("configuration lock poisoned") = config.clone();
    Ok(config)
}

#[tauri::command]
fn reset_persistent_timer(
    preset_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config = state
        .config
        .read()
        .expect("configuration lock poisoned")
        .clone();
    service::reset_persistent_timer(&mut config, &preset_id)?;
    state
        .store
        .save(&config)
        .map_err(|error| error.to_string())?;
    *state.config.write().expect("configuration lock poisoned") = config.clone();
    Ok(config)
}

#[tauri::command]
fn import_config(path: String, state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state
        .store
        .import(&PathBuf::from(path))
        .map_err(|error| error.to_string())?;
    *state.config.write().expect("configuration lock poisoned") = config.clone();
    Ok(config)
}

#[tauri::command]
fn export_config(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let config = state
        .config
        .read()
        .expect("configuration lock poisoned")
        .clone();
    state
        .store
        .export(&config, &PathBuf::from(path))
        .map_err(|error| error.to_string())
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Open ActivityMux", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(event, tauri::tray::TrayIconEvent::DoubleClick { .. }) {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let store = ConfigStore::for_app(app.handle())?;
            let config = store.load_or_create()?;
            let should_autostart = config.settings.launch_at_login;
            let state = AppState::new(config, store);
            app.manage(state.clone());

            let autostart = app.autolaunch();
            if should_autostart {
                let _ = autostart.enable();
            } else {
                let _ = autostart.disable();
            }

            build_tray(app)?;
            service::start(app.handle().clone(), state);

            if std::env::args().any(|argument| argument == "--minimized") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let close_to_tray = window
                    .state::<AppState>()
                    .config
                    .read()
                    .map(|config| config.settings.close_to_tray)
                    .unwrap_or(true);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            get_snapshot,
            list_processes,
            set_manual_override,
            reset_persistent_timer,
            import_config,
            export_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ActivityMux");
}
