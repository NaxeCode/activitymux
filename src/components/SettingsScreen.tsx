import { open, save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Download, ExternalLink, FileUp, ShieldCheck } from "lucide-react";
import type { AppConfig } from "../types";

interface SettingsScreenProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
  onImport: (path: string) => Promise<void>;
  onExport: (path: string) => Promise<void>;
}

export function SettingsScreen({ config, onChange, onImport, onExport }: SettingsScreenProps) {
  const updateSettings = (patch: Partial<AppConfig["settings"]>) =>
    onChange({ ...config, settings: { ...config.settings, ...patch } });

  const importConfiguration = async () => {
    const path = await open({ multiple: false, directory: false, filters: [{ name: "ActivityMux configuration", extensions: ["json"] }] });
    if (typeof path === "string") await onImport(path);
  };

  const exportConfiguration = async () => {
    const path = await save({ defaultPath: "activitymux-config.json", filters: [{ name: "ActivityMux configuration", extensions: ["json"] }] });
    if (path) await onExport(path);
  };

  return (
    <div className="screen settings-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Configuration</p>
          <h1>Connect and personalize.</h1>
          <p>ActivityMux stores all configuration locally on this computer.</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="panel settings-section">
          <div className="settings-section__heading"><span className="settings-icon">01</span><div><h2>Discord connection</h2><p>This public application ID supplies the default profile title and artwork library. Presets can override it.</p></div></div>
          <label>Discord application ID<input inputMode="numeric" value={config.settings.discordApplicationId} onChange={(event) => updateSettings({ discordApplicationId: event.target.value.replace(/\D/g, "") })} placeholder="123456789012345678" /></label>
          <button type="button" className="text-button" onClick={() => openUrl("https://discord.com/developers/applications")}><ExternalLink size={14} /> Open Discord Developer Portal</button>
          <div className="info-callout"><ShieldCheck size={18} /><span><strong>Never paste a client secret.</strong> ActivityMux only needs the numeric Application ID shown under General Information.</span></div>
        </section>

        <section className="panel settings-section">
          <div className="settings-section__heading"><span className="settings-icon">02</span><div><h2>Selection behavior</h2><p>Choose the fallback used when no process rule matches.</p></div></div>
          <label>Default preset<select value={config.defaultPresetId ?? ""} onChange={(event) => onChange({ ...config, defaultPresetId: event.target.value || null })}><option value="">Clear presence</option>{config.presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select></label>
          <label>Process polling interval<select value={config.settings.pollIntervalMs} onChange={(event) => updateSettings({ pollIntervalMs: Number(event.target.value) })}><option value={500}>0.5 seconds</option><option value={1000}>1 second</option><option value={2000}>2 seconds</option><option value={5000}>5 seconds</option></select></label>
        </section>

        <section className="panel settings-section">
          <div className="settings-section__heading"><span className="settings-icon">03</span><div><h2>Desktop behavior</h2><p>Keep the routing service available without leaving a window open.</p></div></div>
          <label className="toggle-row"><span><strong>Launch at login</strong><small>Start hidden and restore your presence automatically.</small></span><input type="checkbox" checked={config.settings.launchAtLogin} onChange={(event) => updateSettings({ launchAtLogin: event.target.checked })} /></label>
          <label className="toggle-row"><span><strong>Close to tray</strong><small>The Quit tray action always exits completely.</small></span><input type="checkbox" checked={config.settings.closeToTray} onChange={(event) => updateSettings({ closeToTray: event.target.checked })} /></label>
        </section>

        <section className="panel settings-section">
          <div className="settings-section__heading"><span className="settings-icon">04</span><div><h2>Backup and transfer</h2><p>Move presets and rules between Windows and Linux.</p></div></div>
          <div className="transfer-buttons">
            <button type="button" className="button button--ghost" onClick={importConfiguration}><FileUp size={16} /> Import JSON</button>
            <button type="button" className="button button--ghost" onClick={exportConfiguration}><Download size={16} /> Export JSON</button>
          </div>
          <p className="helper-copy">Import replaces the current local configuration after validation. Exported files never contain Discord credentials because ActivityMux does not use any.</p>
        </section>
      </div>
    </div>
  );
}
