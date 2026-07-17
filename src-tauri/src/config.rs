use crate::models::AppConfig;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("could not determine the application configuration directory: {0}")]
    ConfigDirectory(String),
    #[error("could not read configuration: {0}")]
    Read(#[from] std::io::Error),
    #[error("configuration is not valid JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("configuration is invalid: {0}")]
    Validation(String),
}

#[derive(Debug, Clone)]
pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn for_app(app: &AppHandle) -> Result<Self, ConfigError> {
        let directory = app
            .path()
            .app_config_dir()
            .map_err(|error| ConfigError::ConfigDirectory(error.to_string()))?;
        Ok(Self {
            path: directory.join("config.json"),
        })
    }

    pub fn load_or_create(&self) -> Result<AppConfig, ConfigError> {
        self.restore_backup_if_needed()?;
        if !self.path.exists() {
            let config = AppConfig::default();
            self.save(&config)?;
            return Ok(config);
        }
        load_from_path(&self.path)
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), ConfigError> {
        config.validate().map_err(ConfigError::Validation)?;
        let contents = serde_json::to_vec_pretty(config)?;
        write_recoverable(&self.path, &contents)
    }

    pub fn import(&self, source: &Path) -> Result<AppConfig, ConfigError> {
        let config = load_from_path(source)?;
        self.save(&config)?;
        Ok(config)
    }

    pub fn export(&self, config: &AppConfig, destination: &Path) -> Result<(), ConfigError> {
        config.validate().map_err(ConfigError::Validation)?;
        let contents = serde_json::to_vec_pretty(config)?;
        write_recoverable(destination, &contents)
    }

    fn restore_backup_if_needed(&self) -> Result<(), ConfigError> {
        let backup = backup_path(&self.path);
        if !self.path.exists() && backup.exists() {
            fs::rename(backup, &self.path)?;
        }
        Ok(())
    }
}

fn load_from_path(path: &Path) -> Result<AppConfig, ConfigError> {
    let contents = fs::read(path)?;
    let config: AppConfig = serde_json::from_slice(&contents)?;
    config.validate().map_err(ConfigError::Validation)?;
    Ok(config)
}

fn temporary_path(path: &Path) -> PathBuf {
    let mut value = path.as_os_str().to_owned();
    value.push(".tmp");
    PathBuf::from(value)
}

fn backup_path(path: &Path) -> PathBuf {
    let mut value = path.as_os_str().to_owned();
    value.push(".bak");
    PathBuf::from(value)
}

fn write_recoverable(path: &Path, contents: &[u8]) -> Result<(), ConfigError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let temporary = temporary_path(path);
    let backup = backup_path(path);
    fs::write(&temporary, contents)?;

    if backup.exists() {
        fs::remove_file(&backup)?;
    }
    if path.exists() {
        fs::rename(path, &backup)?;
    }

    if let Err(error) = fs::rename(&temporary, path) {
        if backup.exists() {
            let _ = fs::rename(&backup, path);
        }
        return Err(ConfigError::Read(error));
    }

    if backup.exists() {
        fs::remove_file(backup)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn round_trips_configuration() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!("activitymux-config-{suffix}"));
        let store = ConfigStore {
            path: directory.join("config.json"),
        };
        let expected = AppConfig::default();

        store.save(&expected).unwrap();
        let actual = store.load_or_create().unwrap();

        assert_eq!(actual, expected);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_unknown_schema() {
        let config = AppConfig {
            schema_version: 999,
            ..AppConfig::default()
        };
        assert!(config.validate().is_err());
    }
}
