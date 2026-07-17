use crate::models::{AppConfig, ProcessMatchMode, Resolution, ResolutionReason};
use std::collections::HashSet;

pub fn normalize_process_name(value: &str) -> String {
    let file_name = value
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(value)
        .trim()
        .to_lowercase();
    file_name
        .strip_suffix(".exe")
        .unwrap_or(&file_name)
        .to_string()
}

pub fn resolve(config: &AppConfig, running_processes: &HashSet<String>) -> Resolution {
    if let Some(preset_id) = &config.manual_override_preset_id {
        if let Some(preset) = config.preset(preset_id) {
            return Resolution {
                preset_id: Some(preset.id.clone()),
                preset_label: Some(preset.label.clone()),
                reason: ResolutionReason::Manual,
            };
        }
    }

    let normalized_running: HashSet<String> = running_processes
        .iter()
        .map(|name| normalize_process_name(name))
        .collect();
    let mut winner = None;

    for rule in config.rules.iter().filter(|rule| rule.enabled) {
        let normalized_targets: Vec<String> = rule
            .process_names
            .iter()
            .map(|name| normalize_process_name(name))
            .collect();
        let matched: Vec<String> = normalized_targets
            .iter()
            .filter(|name| normalized_running.contains(name.as_str()))
            .cloned()
            .collect();
        let is_match = match rule.match_mode {
            ProcessMatchMode::Any => !matched.is_empty(),
            ProcessMatchMode::All => matched.len() == normalized_targets.len(),
        };
        if !is_match {
            continue;
        }

        let should_replace = winner
            .as_ref()
            .map(|(priority, _, _): &(i32, String, Vec<String>)| rule.priority > *priority)
            .unwrap_or(true);
        if should_replace {
            winner = Some((rule.priority, rule.id.clone(), matched));
        }
    }

    if let Some((priority, rule_id, matched_processes)) = winner {
        if let Some(rule) = config.rules.iter().find(|rule| rule.id == rule_id) {
            if let Some(preset) = config.preset(&rule.preset_id) {
                return Resolution {
                    preset_id: Some(preset.id.clone()),
                    preset_label: Some(preset.label.clone()),
                    reason: ResolutionReason::ProcessRule {
                        rule_id: rule.id.clone(),
                        rule_label: rule.label.clone(),
                        priority,
                        matched_processes,
                    },
                };
            }
        }
    }

    if let Some(preset_id) = &config.default_preset_id {
        if let Some(preset) = config.preset(preset_id) {
            return Resolution {
                preset_id: Some(preset.id.clone()),
                preset_label: Some(preset.label.clone()),
                reason: ResolutionReason::Default,
            };
        }
    }

    Resolution::none()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ProcessMatchMode, ProcessRule};

    fn processes(values: &[&str]) -> HashSet<String> {
        values.iter().map(|value| value.to_string()).collect()
    }

    #[test]
    fn manual_override_wins_everything() {
        let config = AppConfig {
            manual_override_preset_id: Some("thinking-about-messmer".to_string()),
            ..AppConfig::default()
        };
        let result = resolve(&config, &processes(&["eldenring.exe"]));
        assert_eq!(result.reason, ResolutionReason::Manual);
    }

    #[test]
    fn higher_priority_process_rule_wins() {
        let config = AppConfig {
            rules: vec![
                ProcessRule {
                    id: "low".to_string(),
                    label: "Low".to_string(),
                    enabled: true,
                    priority: 10,
                    preset_id: "thinking-about-messmer".to_string(),
                    process_names: vec!["nvim".to_string()],
                    match_mode: ProcessMatchMode::Any,
                },
                ProcessRule {
                    id: "high".to_string(),
                    label: "High".to_string(),
                    enabled: true,
                    priority: 100,
                    preset_id: "thinking-about-messmer".to_string(),
                    process_names: vec!["eldenring.exe".to_string()],
                    match_mode: ProcessMatchMode::Any,
                },
            ],
            ..AppConfig::default()
        };
        let result = resolve(&config, &processes(&["nvim", "ELDENRING.EXE"]));
        assert!(matches!(
            result.reason,
            ResolutionReason::ProcessRule { ref rule_id, .. } if rule_id == "high"
        ));
    }

    #[test]
    fn all_mode_requires_every_process() {
        let config = AppConfig {
            rules: vec![ProcessRule {
                id: "all".to_string(),
                label: "All".to_string(),
                enabled: true,
                priority: 100,
                preset_id: "thinking-about-messmer".to_string(),
                process_names: vec!["steam.exe".to_string(), "eldenring.exe".to_string()],
                match_mode: ProcessMatchMode::All,
            }],
            ..AppConfig::default()
        };
        let result = resolve(&config, &processes(&["eldenring.exe"]));
        assert_eq!(result.reason, ResolutionReason::Default);
    }

    #[test]
    fn normalization_ignores_windows_suffix_and_case() {
        assert_eq!(
            normalize_process_name("C:\\Games\\ELDENRING.EXE"),
            "eldenring"
        );
        assert_eq!(normalize_process_name("eldenring"), "eldenring");
    }
}
