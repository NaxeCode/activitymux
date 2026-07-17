use crate::models::{ActivityType, Preset, StatusDisplayType, TimerMode};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

fn receive_confirmation(client: &mut DiscordIpcClient) -> Result<(), String> {
    let (_, response) = client.recv().map_err(|error| error.to_string())?;
    if response.get("evt").and_then(|value| value.as_str()) == Some("ERROR") {
        let message = response
            .get("data")
            .and_then(|data| data.get("message"))
            .and_then(|value| value.as_str())
            .unwrap_or("Discord rejected the presence update");
        return Err(message.to_string());
    }
    Ok(())
}

pub struct DiscordPublisher {
    application_id: String,
    client: Option<DiscordIpcClient>,
}

impl DiscordPublisher {
    pub fn new(application_id: String) -> Self {
        Self {
            application_id,
            client: None,
        }
    }

    pub fn application_id(&self) -> &str {
        &self.application_id
    }

    pub fn connect(&mut self) -> Result<(), String> {
        let mut client = DiscordIpcClient::new(&self.application_id);
        client.connect().map_err(|error| error.to_string())?;
        self.client = Some(client);
        Ok(())
    }

    pub fn publish(&mut self, preset: &Preset, session_started_at: i64) -> Result<(), String> {
        let client = self
            .client
            .as_mut()
            .ok_or_else(|| "Discord IPC is not connected".to_string())?;
        let template = &preset.activity;
        let mut payload = activity::Activity::new()
            .activity_type(match template.activity_type {
                ActivityType::Playing => activity::ActivityType::Playing,
                ActivityType::Listening => activity::ActivityType::Listening,
                ActivityType::Watching => activity::ActivityType::Watching,
                ActivityType::Competing => activity::ActivityType::Competing,
            })
            .status_display_type(match template.status_display_type {
                StatusDisplayType::Name => activity::StatusDisplayType::Name,
                StatusDisplayType::State => activity::StatusDisplayType::State,
                StatusDisplayType::Details => activity::StatusDisplayType::Details,
            });

        if !template.details.is_empty() {
            payload = payload.details(template.details.as_str());
        }
        if !template.state.is_empty() {
            payload = payload.state(template.state.as_str());
        }

        let started_at = match template.timer {
            TimerMode::Disabled => None,
            TimerMode::Session => Some(session_started_at),
            TimerMode::Persistent { started_at } | TimerMode::Fixed { started_at } => {
                Some(started_at)
            }
        };
        if let Some(started_at) = started_at {
            payload = payload.timestamps(activity::Timestamps::new().start(started_at * 1_000));
        }

        if !template.large_image.is_empty()
            || !template.large_text.is_empty()
            || !template.small_image.is_empty()
            || !template.small_text.is_empty()
        {
            let mut assets = activity::Assets::new();
            if !template.large_image.is_empty() {
                assets = assets.large_image(template.large_image.as_str());
            }
            if !template.large_text.is_empty() {
                assets = assets.large_text(template.large_text.as_str());
            }
            if !template.small_image.is_empty() {
                assets = assets.small_image(template.small_image.as_str());
            }
            if !template.small_text.is_empty() {
                assets = assets.small_text(template.small_text.as_str());
            }
            payload = payload.assets(assets);
        }

        if !template.buttons.is_empty() {
            payload = payload.buttons(
                template
                    .buttons
                    .iter()
                    .map(|button| activity::Button::new(button.label.as_str(), button.url.as_str()))
                    .collect(),
            );
        }

        client
            .set_activity(payload)
            .map_err(|error| error.to_string())?;
        receive_confirmation(client)
    }

    pub fn clear(&mut self) -> Result<(), String> {
        let client = self
            .client
            .as_mut()
            .ok_or_else(|| "Discord IPC is not connected".to_string())?;
        client.clear_activity().map_err(|error| error.to_string())?;
        receive_confirmation(client)
    }

    pub fn disconnect(&mut self) {
        if let Some(mut client) = self.client.take() {
            let _ = client.close();
        }
    }
}

impl Drop for DiscordPublisher {
    fn drop(&mut self) {
        self.disconnect();
    }
}
