import { useMemo, useState } from "react";
import { AlertTriangle, Check, Pin, PinOff, Radio, Settings2, Sparkles } from "lucide-react";
import type { AppConfig, ServiceSnapshot } from "../types";
import { ActivityCard } from "./ActivityCard";

interface DashboardProps {
  config: AppConfig;
  snapshot: ServiceSnapshot;
  onManualOverride: (presetId: string | null) => Promise<void>;
  onNavigateSettings: () => void;
}

function reasonText(snapshot: ServiceSnapshot) {
  switch (snapshot.resolution.reason.kind) {
    case "manual":
      return "Pinned manual override";
    case "processRule":
      return `${snapshot.resolution.reason.ruleLabel} · priority ${snapshot.resolution.reason.priority}`;
    case "default":
      return "Default preset";
    case "none":
      return "No rule or default matched";
  }
}

export function Dashboard({
  config,
  snapshot,
  onManualOverride,
  onNavigateSettings,
}: DashboardProps) {
  const [selection, setSelection] = useState(
    config.manualOverridePresetId ?? config.presets[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const resolvedPreset = useMemo(
    () => config.presets.find((preset) => preset.id === snapshot.resolution.presetId) ?? null,
    [config.presets, snapshot.resolution.presetId],
  );
  const isPinned = config.manualOverridePresetId !== null;
  const connectionLabels = {
    setupRequired: "Setup required",
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected",
  } as const;

  const updateOverride = async (presetId: string | null) => {
    setBusy(true);
    try {
      await onManualOverride(presetId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen dashboard">
      <header className="screen-header">
        <div>
          <p className="kicker">Live presence</p>
          <h1>Control what Discord sees.</h1>
          <p>One deterministic activity, selected from your rules and overrides.</p>
        </div>
        <div className={`connection-pill connection-pill--${snapshot.connection}`}>
          <Radio size={15} /> {connectionLabels[snapshot.connection]}
        </div>
      </header>

      {snapshot.connection === "setupRequired" && (
        <button className="setup-banner" type="button" onClick={onNavigateSettings}>
          <AlertTriangle size={20} />
          <span>
            <strong>Add your Discord application ID</strong>
            ActivityMux is ready, but needs an application identity before it can publish.
          </span>
          <Settings2 size={18} />
        </button>
      )}

      <div className="dashboard-grid">
        <section className="panel live-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Discord preview</p>
              <h2>{resolvedPreset?.label ?? "Nothing selected"}</h2>
            </div>
            {isPinned && <span className="tag"><Pin size={12} /> Pinned</span>}
          </div>
          <ActivityCard preset={resolvedPreset} />
          <div className="resolution-box">
            <Sparkles size={17} />
            <div>
              <strong>Why this is active</strong>
              <span>{reasonText(snapshot)}</span>
              {snapshot.resolution.reason.kind === "processRule" && (
                <small>
                  Matched {snapshot.resolution.reason.matchedProcesses.join(", ")}
                </small>
              )}
            </div>
          </div>
          {snapshot.lastError && (
            <div className="inline-error"><AlertTriangle size={16} /> {snapshot.lastError}</div>
          )}
        </section>

        <aside className="panel override-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Manual override</p>
              <h2>Pin a presence</h2>
            </div>
          </div>
          <p className="muted">
            A pinned preset wins over every process rule until you release it.
          </p>
          <label>
            Preset
            <select value={selection} onChange={(event) => setSelection(event.target.value)}>
              {config.presets.map((preset) => (
                <option value={preset.id} key={preset.id}>{preset.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button button--primary button--wide"
            disabled={busy || !selection}
            onClick={() => updateOverride(selection)}
          >
            <Pin size={16} /> {isPinned ? "Change pinned preset" : "Pin selected preset"}
          </button>
          <button
            type="button"
            className="button button--ghost button--wide"
            disabled={busy || !isPinned}
            onClick={() => updateOverride(null)}
          >
            <PinOff size={16} /> Release override
          </button>
          <div className="override-order">
            <span><Check size={13} /> Manual override</span>
            <span>Process rule priority</span>
            <span>Default preset</span>
            <span>Clear presence</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
