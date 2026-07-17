export type ActivityType = "playing" | "listening" | "watching" | "competing";
export type StatusDisplayType = "name" | "state" | "details";
export type ProcessMatchMode = "any" | "all";

export type TimerMode =
  | { kind: "disabled" }
  | { kind: "session" }
  | { kind: "persistent"; startedAt: number }
  | { kind: "fixed"; startedAt: number };

export interface ActivityButton {
  label: string;
  url: string;
}

export interface ActivityTemplate {
  discordApplicationId: string;
  name: string;
  details: string;
  state: string;
  activityType: ActivityType;
  statusDisplayType: StatusDisplayType;
  largeImage: string;
  largeText: string;
  smallImage: string;
  smallText: string;
  timer: TimerMode;
  buttons: ActivityButton[];
}

export interface Preset {
  id: string;
  label: string;
  activity: ActivityTemplate;
}

export interface ProcessRule {
  id: string;
  label: string;
  enabled: boolean;
  priority: number;
  presetId: string;
  processNames: string[];
  matchMode: ProcessMatchMode;
}

export interface Settings {
  discordApplicationId: string;
  pollIntervalMs: number;
  launchAtLogin: boolean;
  closeToTray: boolean;
}

export interface AppConfig {
  schemaVersion: number;
  settings: Settings;
  presets: Preset[];
  rules: ProcessRule[];
  defaultPresetId: string | null;
  manualOverridePresetId: string | null;
}

export interface RunningProcess {
  pid: number;
  name: string;
  executable: string;
}

export type ResolutionReason =
  | { kind: "manual" }
  | {
      kind: "processRule";
      ruleId: string;
      ruleLabel: string;
      priority: number;
      matchedProcesses: string[];
    }
  | { kind: "default" }
  | { kind: "none" };

export interface Resolution {
  presetId: string | null;
  presetLabel: string | null;
  reason: ResolutionReason;
}

export type ConnectionStatus =
  | "setupRequired"
  | "connecting"
  | "connected"
  | "disconnected";

export interface ServiceSnapshot {
  connection: ConnectionStatus;
  resolution: Resolution;
  lastError: string | null;
  lastPublishedAt: number | null;
}

export type Screen = "dashboard" | "presets" | "rules" | "settings";
