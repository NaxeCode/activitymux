use crate::config::ConfigStore;
use crate::discord::DiscordPublisher;
use crate::models::{AppConfig, ConnectionStatus, ServiceSnapshot, TimerMode};
use crate::process_monitor::ProcessMonitor;
use crate::resolver;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const PRESENCE_HEARTBEAT: Duration = Duration::from_secs(15);

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<RwLock<AppConfig>>,
    pub snapshot: Arc<RwLock<ServiceSnapshot>>,
    pub store: ConfigStore,
}

impl AppState {
    pub fn new(config: AppConfig, store: ConfigStore) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
            snapshot: Arc::new(RwLock::new(ServiceSnapshot::default())),
            store,
        }
    }
}

fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn publish_snapshot(app: &AppHandle, state: &AppState, next: ServiceSnapshot) {
    let should_emit = {
        let mut current = state.snapshot.write().expect("snapshot lock poisoned");
        if *current == next {
            false
        } else {
            *current = next.clone();
            true
        }
    };
    if should_emit {
        let _ = app.emit("service-snapshot", next);
    }
}

pub fn start(app: AppHandle, state: AppState) {
    thread::Builder::new()
        .name("activitymux-service".to_string())
        .spawn(move || run(app, state))
        .expect("failed to start ActivityMux background service");
}

fn run(app: AppHandle, state: AppState) {
    let mut monitor = ProcessMonitor::new();
    let mut publisher: Option<DiscordPublisher> = None;
    let mut connected = false;
    let mut active_preset_id: Option<String> = None;
    let mut session_started_at = now_unix_seconds();
    let mut last_signature = String::new();
    let mut last_publish_attempt: Option<Instant> = None;
    let mut last_published_at = None;

    loop {
        let config = state
            .config
            .read()
            .expect("configuration lock poisoned")
            .clone();
        let running_names = monitor.running_names();
        let resolution = resolver::resolve(&config, &running_names);

        if active_preset_id != resolution.preset_id {
            active_preset_id = resolution.preset_id.clone();
            session_started_at = now_unix_seconds();
            last_signature.clear();
        }

        let application_id = config
            .discord_application_id_for(resolution.preset_id.as_deref())
            .to_string();
        if application_id.is_empty() {
            if let Some(mut current) = publisher.take() {
                current.disconnect();
            }
            connected = false;
            publish_snapshot(
                &app,
                &state,
                ServiceSnapshot {
                    connection: ConnectionStatus::SetupRequired,
                    resolution,
                    last_error: Some("Add a Discord application ID in Settings".to_string()),
                    last_published_at,
                },
            );
            thread::sleep(Duration::from_millis(config.settings.poll_interval_ms));
            continue;
        }

        let application_changed = publisher
            .as_ref()
            .map(|current| current.application_id() != application_id)
            .unwrap_or(true);
        if application_changed {
            if let Some(mut current) = publisher.take() {
                current.disconnect();
            }
            publisher = Some(DiscordPublisher::new(application_id));
            connected = false;
            last_signature.clear();
        }

        if !connected {
            publish_snapshot(
                &app,
                &state,
                ServiceSnapshot {
                    connection: ConnectionStatus::Connecting,
                    resolution: resolution.clone(),
                    last_error: None,
                    last_published_at,
                },
            );
            match publisher.as_mut().expect("publisher must exist").connect() {
                Ok(()) => {
                    connected = true;
                    last_signature.clear();
                }
                Err(error) => {
                    publish_snapshot(
                        &app,
                        &state,
                        ServiceSnapshot {
                            connection: ConnectionStatus::Disconnected,
                            resolution,
                            last_error: Some(format!("Discord desktop is unavailable: {error}")),
                            last_published_at,
                        },
                    );
                    thread::sleep(Duration::from_millis(config.settings.poll_interval_ms));
                    continue;
                }
            }
        }

        let heartbeat_due = last_publish_attempt
            .map(|instant| instant.elapsed() >= PRESENCE_HEARTBEAT)
            .unwrap_or(true);
        let operation = if let Some(preset_id) = &resolution.preset_id {
            match config.preset(preset_id) {
                Some(preset) => {
                    let signature = serde_json::to_string(&(preset, session_started_at))
                        .unwrap_or_else(|_| preset.id.clone());
                    let activity_changed = signature != last_signature;
                    if activity_changed || heartbeat_due {
                        last_publish_attempt = Some(Instant::now());
                        let result = publisher
                            .as_mut()
                            .expect("publisher must exist")
                            .publish(preset, session_started_at);
                        if result.is_ok() {
                            last_signature = signature;
                            last_published_at = Some(now_unix_seconds());
                            #[cfg(debug_assertions)]
                            if activity_changed {
                                eprintln!(
                                    "ActivityMux published '{}' because {:?}",
                                    preset.label, resolution.reason
                                );
                            }
                        }
                        Some(result)
                    } else {
                        None
                    }
                }
                None => None,
            }
        } else if !last_signature.is_empty() || heartbeat_due {
            last_publish_attempt = Some(Instant::now());
            let result = publisher.as_mut().expect("publisher must exist").clear();
            if result.is_ok() {
                last_signature.clear();
                last_published_at = Some(now_unix_seconds());
            }
            Some(result)
        } else {
            None
        };

        if let Some(Err(error)) = operation {
            if let Some(current) = publisher.as_mut() {
                current.disconnect();
            }
            connected = false;
            publish_snapshot(
                &app,
                &state,
                ServiceSnapshot {
                    connection: ConnectionStatus::Disconnected,
                    resolution,
                    last_error: Some(format!("Discord presence update failed: {error}")),
                    last_published_at,
                },
            );
        } else {
            publish_snapshot(
                &app,
                &state,
                ServiceSnapshot {
                    connection: ConnectionStatus::Connected,
                    resolution,
                    last_error: None,
                    last_published_at,
                },
            );
        }

        thread::sleep(Duration::from_millis(config.settings.poll_interval_ms));
    }
}

pub fn reset_persistent_timer(config: &mut AppConfig, preset_id: &str) -> Result<(), String> {
    let preset = config
        .presets
        .iter_mut()
        .find(|preset| preset.id == preset_id)
        .ok_or_else(|| "Preset does not exist".to_string())?;
    match &mut preset.activity.timer {
        TimerMode::Persistent { started_at } | TimerMode::Fixed { started_at } => {
            *started_at = now_unix_seconds();
            Ok(())
        }
        TimerMode::Disabled | TimerMode::Session => {
            Err("This preset does not have a persistent timer".to_string())
        }
    }
}
