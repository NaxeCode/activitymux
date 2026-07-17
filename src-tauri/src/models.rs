use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};

pub const CONFIG_SCHEMA_VERSION: u32 = 1;

fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub schema_version: u32,
    pub settings: Settings,
    pub presets: Vec<Preset>,
    pub rules: Vec<ProcessRule>,
    pub default_preset_id: Option<String>,
    pub manual_override_preset_id: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        let preset_id = "thinking-about-messmer".to_string();
        Self {
            schema_version: CONFIG_SCHEMA_VERSION,
            settings: Settings::default(),
            presets: vec![Preset {
                id: preset_id.clone(),
                label: "Thinking about Messmer".to_string(),
                activity: ActivityTemplate {
                    discord_application_id: String::new(),
                    name: "Thinking about Messmer".to_string(),
                    details: "Contemplating the Impaler".to_string(),
                    state: "The flame still burns".to_string(),
                    activity_type: ActivityType::Playing,
                    status_display_type: StatusDisplayType::Name,
                    large_image: String::new(),
                    large_text: "Messmer's Flame".to_string(),
                    small_image: String::new(),
                    small_text: String::new(),
                    timer: TimerMode::Persistent {
                        started_at: now_unix_seconds(),
                    },
                    buttons: Vec::new(),
                },
            }],
            rules: Vec::new(),
            default_preset_id: Some(preset_id),
            manual_override_preset_id: None,
        }
    }
}

impl AppConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.schema_version != CONFIG_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported configuration schema {} (expected {})",
                self.schema_version, CONFIG_SCHEMA_VERSION
            ));
        }
        if !self.settings.discord_application_id.is_empty()
            && !self
                .settings
                .discord_application_id
                .chars()
                .all(|character| character.is_ascii_digit())
        {
            return Err("Discord application ID must contain only digits".to_string());
        }
        if !(500..=60_000).contains(&self.settings.poll_interval_ms) {
            return Err("Process polling interval must be between 500 and 60000 ms".to_string());
        }

        let mut preset_ids = HashSet::new();
        for preset in &self.presets {
            if preset.id.trim().is_empty() || !preset_ids.insert(preset.id.as_str()) {
                return Err("Preset IDs must be non-empty and unique".to_string());
            }
            if !preset.activity.discord_application_id.is_empty()
                && !preset
                    .activity
                    .discord_application_id
                    .chars()
                    .all(|character| character.is_ascii_digit())
            {
                return Err(format!(
                    "Preset '{}' has an invalid Discord application ID",
                    preset.label
                ));
            }
            if preset.label.trim().is_empty() || preset.activity.name.trim().is_empty() {
                return Err(format!(
                    "Preset '{}' needs a label and activity name",
                    preset.id
                ));
            }
            if preset.activity.name.chars().count() > 128
                || preset.activity.details.chars().count() > 128
                || preset.activity.state.chars().count() > 128
            {
                return Err(format!(
                    "Preset '{}' contains text longer than 128 characters",
                    preset.label
                ));
            }
            if preset.activity.buttons.len() > 2 {
                return Err(format!(
                    "Preset '{}' has more than two buttons",
                    preset.label
                ));
            }
            for button in &preset.activity.buttons {
                if button.label.trim().is_empty()
                    || !(button.url.starts_with("https://") || button.url.starts_with("http://"))
                {
                    return Err(format!(
                        "Preset '{}' has a button without a label or valid HTTP(S) URL",
                        preset.label
                    ));
                }
            }
        }

        let references_existing_preset = |id: &Option<String>| {
            id.as_ref()
                .map(|value| preset_ids.contains(value.as_str()))
                .unwrap_or(true)
        };
        if !references_existing_preset(&self.default_preset_id) {
            return Err("Default preset does not exist".to_string());
        }
        if !references_existing_preset(&self.manual_override_preset_id) {
            return Err("Manual override preset does not exist".to_string());
        }

        let mut rule_ids = HashSet::new();
        for rule in &self.rules {
            if rule.id.trim().is_empty() || !rule_ids.insert(rule.id.as_str()) {
                return Err("Rule IDs must be non-empty and unique".to_string());
            }
            if !preset_ids.contains(rule.preset_id.as_str()) {
                return Err(format!("Rule '{}' references a missing preset", rule.label));
            }
            if rule.process_names.is_empty()
                || rule.process_names.iter().any(|name| name.trim().is_empty())
            {
                return Err(format!("Rule '{}' needs at least one process", rule.label));
            }
        }
        Ok(())
    }

    pub fn preset(&self, id: &str) -> Option<&Preset> {
        self.presets.iter().find(|preset| preset.id == id)
    }

    pub fn discord_application_id_for(&self, preset_id: Option<&str>) -> &str {
        preset_id
            .and_then(|id| self.preset(id))
            .map(|preset| preset.activity.discord_application_id.trim())
            .filter(|application_id| !application_id.is_empty())
            .unwrap_or_else(|| self.settings.discord_application_id.trim())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub discord_application_id: String,
    pub poll_interval_ms: u64,
    pub launch_at_login: bool,
    pub close_to_tray: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            discord_application_id: String::new(),
            poll_interval_ms: 1_000,
            launch_at_login: false,
            close_to_tray: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub label: String,
    pub activity: ActivityTemplate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActivityTemplate {
    #[serde(default)]
    pub discord_application_id: String,
    pub name: String,
    pub details: String,
    pub state: String,
    pub activity_type: ActivityType,
    pub status_display_type: StatusDisplayType,
    pub large_image: String,
    pub large_text: String,
    pub small_image: String,
    pub small_text: String,
    pub timer: TimerMode,
    pub buttons: Vec<ActivityButton>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ActivityType {
    Playing,
    Listening,
    Watching,
    Competing,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StatusDisplayType {
    Name,
    State,
    Details,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum TimerMode {
    Disabled,
    Session,
    Persistent { started_at: i64 },
    Fixed { started_at: i64 },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActivityButton {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRule {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    pub priority: i32,
    pub preset_id: String,
    pub process_names: Vec<String>,
    pub match_mode: ProcessMatchMode,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProcessMatchMode {
    Any,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RunningProcess {
    pub pid: u32,
    pub name: String,
    pub executable: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum ResolutionReason {
    Manual,
    ProcessRule {
        rule_id: String,
        rule_label: String,
        priority: i32,
        matched_processes: Vec<String>,
    },
    Default,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Resolution {
    pub preset_id: Option<String>,
    pub preset_label: Option<String>,
    pub reason: ResolutionReason,
}

impl Resolution {
    pub fn none() -> Self {
        Self {
            preset_id: None,
            preset_label: None,
            reason: ResolutionReason::None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionStatus {
    SetupRequired,
    Connecting,
    Connected,
    Disconnected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServiceSnapshot {
    pub connection: ConnectionStatus,
    pub resolution: Resolution,
    pub last_error: Option<String>,
    pub last_published_at: Option<i64>,
}

impl Default for ServiceSnapshot {
    fn default() -> Self {
        Self {
            connection: ConnectionStatus::SetupRequired,
            resolution: Resolution::none(),
            last_error: None,
            last_published_at: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AppConfig;

    #[test]
    fn preset_application_id_overrides_global_id() {
        let mut config = AppConfig::default();
        config.settings.discord_application_id = "111".to_string();

        assert_eq!(
            config.discord_application_id_for(Some("thinking-about-messmer")),
            "111"
        );

        config.presets[0].activity.discord_application_id = "222".to_string();

        assert_eq!(
            config.discord_application_id_for(Some("thinking-about-messmer")),
            "222"
        );
        assert_eq!(config.discord_application_id_for(None), "111");
    }
}
