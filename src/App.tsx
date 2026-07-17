import { useEffect, useMemo, useState } from "react";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { Activity, Check, CircleGauge, Library, LoaderCircle, Save, Settings, Workflow } from "lucide-react";
import { api } from "./api";
import { Dashboard } from "./components/Dashboard";
import { PresetsScreen } from "./components/PresetsScreen";
import { RulesScreen } from "./components/RulesScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { DEMO_CONFIG, DEMO_SNAPSHOT } from "./demo";
import type { AppConfig, Screen, ServiceSnapshot } from "./types";
import "./App.css";

const EMPTY_SNAPSHOT: ServiceSnapshot = {
  connection: "setupRequired",
  resolution: { presetId: null, presetLabel: null, reason: { kind: "none" } },
  lastError: null,
  lastPublishedAt: null,
};
const DEMO_MODE = import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo");


export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null);
  const [snapshot, setSnapshot] = useState<ServiceSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      const fixture = structuredClone(DEMO_CONFIG);
      setConfig(fixture);
      setSavedConfig(structuredClone(fixture));
      setSnapshot(structuredClone(DEMO_SNAPSHOT));
      setLoading(false);
      return;
    }
    let cancelled = false;
    let stopListening: (() => void) | undefined;
    Promise.all([api.getConfig(), api.getSnapshot(), api.onSnapshot(setSnapshot)])
      .then(([loadedConfig, loadedSnapshot, unlisten]) => {
        if (cancelled) {
          unlisten();
          return;
        }
        setConfig(loadedConfig);
        setSavedConfig(structuredClone(loadedConfig));
        setSnapshot(loadedSnapshot);
        stopListening = unlisten;
      })
      .catch((reason: unknown) => setMessage({ kind: "error", text: String(reason) }))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const dirty = useMemo(
    () => config !== null && savedConfig !== null && JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  const persist = async (nextConfig = config) => {
    if (!nextConfig) return null;
    setSaving(true);
    try {
      const saved = DEMO_MODE ? structuredClone(nextConfig) : await api.saveConfig(nextConfig);
      if (!DEMO_MODE) {
        if (saved.settings.launchAtLogin) await enable();
        else await disable();
      }
      setConfig(saved);
      setSavedConfig(structuredClone(saved));
      setMessage({ kind: "success", text: "Configuration saved" });
      return saved;
    } catch (reason) {
      setMessage({ kind: "error", text: String(reason) });
      return null;
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <main className="loading-screen"><LoaderCircle className="spin" size={28} /><span>Starting ActivityMux…</span></main>;
  }

  const changeManualOverride = async (presetId: string | null) => {
    const current = dirty ? await persist(config) : config;
    if (!current) return;
    try {
      const updated = await api.setManualOverride(presetId);
      setConfig(updated);
      setSavedConfig(structuredClone(updated));
    } catch (reason) {
      setMessage({ kind: "error", text: String(reason) });
    }
  };

  const resetTimer = async (presetId: string) => {
    const current = dirty ? await persist(config) : config;
    if (!current) return;
    try {
      const updated = await api.resetPersistentTimer(presetId);
      setConfig(updated);
      setSavedConfig(structuredClone(updated));
      setMessage({ kind: "success", text: "Timer reset" });
    } catch (reason) {
      setMessage({ kind: "error", text: String(reason) });
    }
  };

  const navigation: Array<{ id: Screen; label: string; icon: typeof CircleGauge }> = [
    { id: "dashboard", label: "Dashboard", icon: CircleGauge },
    { id: "presets", label: "Presets", icon: Library },
    { id: "rules", label: "Process rules", icon: Workflow },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand__mark"><Activity size={20} /></span><span><strong>ActivityMux</strong><small>Presence router</small></span></div>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            return <button type="button" key={item.id} className={screen === item.id ? "is-active" : ""} onClick={() => setScreen(item.id)}><Icon size={17} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar__footer">
          <div className={`mini-status mini-status--${snapshot.connection}`}><span /><div><strong>{snapshot.connection === "connected" ? "Discord connected" : snapshot.connection === "connecting" ? "Connecting" : "Discord offline"}</strong><small>{snapshot.resolution.presetLabel ?? "No activity"}</small></div></div>
          <span className="version">v0.1.0</span>
        </div>
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
          <button type="button" className={dirty ? "button button--primary" : "button button--saved"} disabled={!dirty || saving} onClick={() => persist()}>
            {saving ? <LoaderCircle className="spin" size={15} /> : dirty ? <Save size={15} /> : <Check size={15} />}
            {saving ? "Saving" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
        <div className="workspace__content">
          {screen === "dashboard" && <Dashboard config={config} snapshot={snapshot} onManualOverride={changeManualOverride} onNavigateSettings={() => setScreen("settings")} />}
          {screen === "presets" && <PresetsScreen config={config} onChange={setConfig} onResetTimer={resetTimer} />}
          {screen === "rules" && <RulesScreen config={config} onChange={setConfig} />}
          {screen === "settings" && <SettingsScreen config={config} onChange={setConfig} onImport={async (path) => { try { const imported = await api.importConfig(path); setConfig(imported); setSavedConfig(structuredClone(imported)); setMessage({ kind: "success", text: "Configuration imported" }); } catch (reason) { setMessage({ kind: "error", text: String(reason) }); } }} onExport={async (path) => { const current = dirty ? await persist(config) : config; if (!current) return; try { await api.exportConfig(path); setMessage({ kind: "success", text: "Configuration exported" }); } catch (reason) { setMessage({ kind: "error", text: String(reason) }); } }} />}
        </div>
      </div>

      {message && <div className={`toast toast--${message.kind}`}>{message.kind === "success" ? <Check size={16} /> : "!"}<span>{message.text}</span></div>}
    </div>
  );
}
