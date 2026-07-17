import type { AppConfig, ServiceSnapshot } from "./types";

export const DEMO_CONFIG: AppConfig = {
  schemaVersion: 1,
  settings: {
    discordApplicationId: "771124766517755954",
    pollIntervalMs: 1_000,
    launchAtLogin: false,
    closeToTray: true,
  },
  presets: [
    {
      id: "thinking-about-messmer",
      label: "Thinking about Messmer",
      activity: {
        discordApplicationId: "",
        name: "Thinking about Messmer",
        details: "Contemplating the Impaler",
        state: "The flame still burns",
        activityType: "playing",
        statusDisplayType: "name",
        largeImage: "",
        largeText: "Messmer's Flame",
        smallImage: "",
        smallText: "",
        timer: { kind: "persistent", startedAt: Math.floor(Date.now() / 1_000) - 94_827 },
        buttons: [],
      },
    },
    {
      id: "writing-code",
      label: "Writing code",
      activity: {
        discordApplicationId: "",
        name: "Neovim",
        details: "Refactoring the presence router",
        state: "Probably introducing another bug",
        activityType: "playing",
        statusDisplayType: "details",
        largeImage: "",
        largeText: "Neovim",
        smallImage: "",
        smallText: "",
        timer: { kind: "session" },
        buttons: [],
      },
    },
  ],
  rules: [
    {
      id: "elden-ring",
      label: "Elden Ring is running",
      enabled: true,
      priority: 900,
      presetId: "thinking-about-messmer",
      processNames: ["eldenring.exe"],
      matchMode: "any",
    },
  ],
  defaultPresetId: "writing-code",
  manualOverridePresetId: null,
};

export const DEMO_SNAPSHOT: ServiceSnapshot = {
  connection: "connected",
  resolution: {
    presetId: "thinking-about-messmer",
    presetLabel: "Thinking about Messmer",
    reason: {
      kind: "processRule",
      ruleId: "elden-ring",
      ruleLabel: "Elden Ring is running",
      priority: 900,
      matchedProcesses: ["eldenring"],
    },
  },
  lastError: null,
  lastPublishedAt: Math.floor(Date.now() / 1_000),
};
