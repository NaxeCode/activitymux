import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AppConfig, RunningProcess, ServiceSnapshot } from "./types";

export const api = {
  getConfig: () => invoke<AppConfig>("get_config"),
  saveConfig: (config: AppConfig) => invoke<AppConfig>("save_config", { config }),
  getSnapshot: () => invoke<ServiceSnapshot>("get_snapshot"),
  listProcesses: () => invoke<RunningProcess[]>("list_processes"),
  setManualOverride: (presetId: string | null) =>
    invoke<AppConfig>("set_manual_override", { presetId }),
  resetPersistentTimer: (presetId: string) =>
    invoke<AppConfig>("reset_persistent_timer", { presetId }),
  importConfig: (path: string) => invoke<AppConfig>("import_config", { path }),
  exportConfig: (path: string) => invoke<void>("export_config", { path }),
  onSnapshot: (handler: (snapshot: ServiceSnapshot) => void): Promise<UnlistenFn> =>
    listen<ServiceSnapshot>("service-snapshot", (event) => handler(event.payload)),
};
