import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { AppConfig, Preset, TimerMode } from "../types";
import { ActivityCard } from "./ActivityCard";

interface PresetsScreenProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
  onResetTimer: (presetId: string) => Promise<void>;
}

const nowSeconds = () => Math.floor(Date.now() / 1_000);

function blankPreset(): Preset {
  const id = crypto.randomUUID();
  return {
    id,
    label: "New presence",
    activity: {
      discordApplicationId: "",
      name: "New presence",
      details: "",
      state: "",
      activityType: "playing",
      statusDisplayType: "name",
      largeImage: "",
      largeText: "",
      smallImage: "",
      smallText: "",
      timer: { kind: "disabled" },
      buttons: [],
    },
  };
}

function timerForKind(kind: TimerMode["kind"]): TimerMode {
  switch (kind) {
    case "disabled": return { kind: "disabled" };
    case "session": return { kind: "session" };
    case "persistent": return { kind: "persistent", startedAt: nowSeconds() };
    case "fixed": return { kind: "fixed", startedAt: nowSeconds() };
  }
}

export function PresetsScreen({ config, onChange, onResetTimer }: PresetsScreenProps) {
  const [selectedId, setSelectedId] = useState(config.presets[0]?.id ?? "");
  useEffect(() => {
    if (!config.presets.some((preset) => preset.id === selectedId)) {
      setSelectedId(config.presets[0]?.id ?? "");
    }
  }, [config.presets, selectedId]);
  const selected = useMemo(
    () => config.presets.find((preset) => preset.id === selectedId) ?? null,
    [config.presets, selectedId],
  );

  const updatePreset = (mutate: (preset: Preset) => Preset) => {
    onChange({
      ...config,
      presets: config.presets.map((preset) => preset.id === selectedId ? mutate(preset) : preset),
    });
  };

  const updateActivity = (patch: Partial<Preset["activity"]>) =>
    updatePreset((preset) => ({ ...preset, activity: { ...preset.activity, ...patch } }));

  const addPreset = () => {
    const preset = blankPreset();
    onChange({ ...config, presets: [...config.presets, preset] });
    setSelectedId(preset.id);
  };

  const duplicatePreset = () => {
    if (!selected) return;
    const duplicate = structuredClone(selected);
    duplicate.id = crypto.randomUUID();
    duplicate.label = `${selected.label} copy`;
    onChange({ ...config, presets: [...config.presets, duplicate] });
    setSelectedId(duplicate.id);
  };

  const deletePreset = () => {
    if (!selected) return;
    const remaining = config.presets.filter((preset) => preset.id !== selected.id);
    const fallback = remaining[0]?.id ?? null;
    onChange({
      ...config,
      presets: remaining,
      rules: config.rules.filter((rule) => rule.presetId !== selected.id),
      defaultPresetId: config.defaultPresetId === selected.id ? fallback : config.defaultPresetId,
      manualOverridePresetId:
        config.manualOverridePresetId === selected.id ? null : config.manualOverridePresetId,
    });
    setSelectedId(fallback ?? "");
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Presence library</p>
          <h1>Build reusable activities.</h1>
          <p>Names, artwork, timers, and buttons are stored locally.</p>
        </div>
        <button type="button" className="button button--primary" onClick={addPreset}>
          <Plus size={16} /> New preset
        </button>
      </header>

      <div className="editor-layout">
        <aside className="panel preset-list">
          {config.presets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={preset.id === selectedId ? "preset-list__item is-active" : "preset-list__item"}
              onClick={() => setSelectedId(preset.id)}
            >
              <span className="preset-avatar">{preset.label.slice(0, 2).toUpperCase()}</span>
              <span><strong>{preset.label}</strong><small>{preset.activity.name}</small></span>
            </button>
          ))}
          {config.presets.length === 0 && <p className="empty-copy">Create your first preset.</p>}
        </aside>

        {selected && (
          <main className="panel preset-editor">
            <div className="editor-toolbar">
              <h2>{selected.label}</h2>
              <div>
                <button className="icon-button" type="button" title="Duplicate" onClick={duplicatePreset}><Copy size={16} /></button>
                <button className="icon-button icon-button--danger" type="button" title="Delete" onClick={deletePreset}><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="form-grid">
              <label>Editor label<input value={selected.label} onChange={(event) => updatePreset((preset) => ({ ...preset, label: event.target.value }))} /></label>
              <label>Discord application name<input maxLength={128} value={selected.activity.name} onChange={(event) => updateActivity({ name: event.target.value })} /></label>
              <label>Activity type<select value={selected.activity.activityType} onChange={(event) => updateActivity({ activityType: event.target.value as Preset["activity"]["activityType"] })}><option value="playing">Playing</option><option value="listening">Listening to</option><option value="watching">Watching</option><option value="competing">Competing in</option></select></label>
              <label>Status text<select value={selected.activity.statusDisplayType} onChange={(event) => updateActivity({ statusDisplayType: event.target.value as Preset["activity"]["statusDisplayType"] })}><option value="name">Discord app name</option><option value="details">Details</option><option value="state">State</option></select></label>
              <label className="span-2">Application ID override<input inputMode="numeric" value={selected.activity.discordApplicationId} onChange={(event) => updateActivity({ discordApplicationId: event.target.value.trim() })} placeholder="Uses the ID from Settings when blank" /></label>
              <label className="span-2">Details<input maxLength={128} value={selected.activity.details} onChange={(event) => updateActivity({ details: event.target.value })} placeholder="Contemplating the Impaler" /></label>
              <label className="span-2">State<input maxLength={128} value={selected.activity.state} onChange={(event) => updateActivity({ state: event.target.value })} placeholder="The flame still burns" /></label>
            </div>
            <p className="helper-copy">Discord controls the activity title and uploaded artwork from the application ID. For accurate titles, name that Developer Portal application exactly as shown above. Use an override when a preset needs a different title or asset library.</p>

            <div className="section-divider"><span>Artwork</span></div>
            <div className="form-grid">
              <label className="span-2">Large image URL or asset key<input value={selected.activity.largeImage} onChange={(event) => updateActivity({ largeImage: event.target.value })} placeholder="https://… or asset_key" /></label>
              <label>Large image hover text<input value={selected.activity.largeText} onChange={(event) => updateActivity({ largeText: event.target.value })} /></label>
              <label>Small image URL or asset key<input value={selected.activity.smallImage} onChange={(event) => updateActivity({ smallImage: event.target.value })} /></label>
              <label className="span-2">Small image hover text<input value={selected.activity.smallText} onChange={(event) => updateActivity({ smallText: event.target.value })} /></label>
            </div>

            <div className="section-divider"><span>Timer</span></div>
            <div className="form-grid timer-grid">
              <label>Timer behavior<select value={selected.activity.timer.kind} onChange={(event) => updateActivity({ timer: timerForKind(event.target.value as TimerMode["kind"]) })}><option value="disabled">No timer</option><option value="session">Reset each activation</option><option value="persistent">Keep counting across restarts</option><option value="fixed">Start from a fixed date</option></select></label>
              {(selected.activity.timer.kind === "persistent" || selected.activity.timer.kind === "fixed") && (
                <label>Start time<input type="datetime-local" value={new Date(selected.activity.timer.startedAt * 1_000).toISOString().slice(0, 16)} onChange={(event) => updateActivity({ timer: { kind: selected.activity.timer.kind as "persistent" | "fixed", startedAt: Math.floor(new Date(event.target.value).getTime() / 1_000) } })} /></label>
              )}
              {selected.activity.timer.kind === "persistent" && (
                <button type="button" className="button button--ghost align-end" onClick={() => onResetTimer(selected.id)}><RotateCcw size={15} /> Reset to now</button>
              )}
            </div>

            <div className="section-divider"><span>Buttons</span><small>Visible to other Discord users</small></div>
            {selected.activity.buttons.map((button, index) => (
              <div className="button-row" key={index}>
                <input maxLength={32} value={button.label} onChange={(event) => updateActivity({ buttons: selected.activity.buttons.map((item, buttonIndex) => buttonIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Button label" />
                <input value={button.url} onChange={(event) => updateActivity({ buttons: selected.activity.buttons.map((item, buttonIndex) => buttonIndex === index ? { ...item, url: event.target.value } : item) })} placeholder="https://…" />
                <button type="button" className="icon-button icon-button--danger" onClick={() => updateActivity({ buttons: selected.activity.buttons.filter((_, buttonIndex) => buttonIndex !== index) })}><Trash2 size={15} /></button>
              </div>
            ))}
            {selected.activity.buttons.length < 2 && <button type="button" className="button button--ghost" onClick={() => updateActivity({ buttons: [...selected.activity.buttons, { label: "Learn more", url: "https://" }] })}><Plus size={15} /> Add button</button>}
          </main>
        )}

        <aside className="preview-column">
          <p className="kicker">Live preview</p>
          <ActivityCard preset={selected} compact />
          <p className="helper-copy">Asset keys display as the ActivityMux placeholder here. Discord resolves them from your application.</p>
        </aside>
      </div>
    </div>
  );
}
