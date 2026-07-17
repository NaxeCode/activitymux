import { useState } from "react";
import { Plus, Power, Trash2, X } from "lucide-react";
import type { AppConfig, ProcessRule } from "../types";
import { ProcessPicker } from "./ProcessPicker";

interface RulesScreenProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}

const NEW_RULE = "__new_rule__";

export function RulesScreen({ config, onChange }: RulesScreenProps) {
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  const updateRule = (id: string, patch: Partial<ProcessRule>) => {
    onChange({
      ...config,
      rules: config.rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
    });
  };

  const addProcess = (name: string) => {
    if (pickerTarget === NEW_RULE) {
      const preset = config.presets[0];
      if (!preset) return;
      const rule: ProcessRule = {
        id: crypto.randomUUID(),
        label: `When ${name} is running`,
        enabled: true,
        priority: 100,
        presetId: preset.id,
        processNames: [name],
        matchMode: "any",
      };
      onChange({ ...config, rules: [...config.rules, rule] });
      return;
    }
    const rule = config.rules.find((candidate) => candidate.id === pickerTarget);
    if (!rule || rule.processNames.some((process) => process.toLowerCase() === name.toLowerCase())) return;
    updateRule(rule.id, { processNames: [...rule.processNames, name] });
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Priority router</p>
          <h1>Let running apps choose.</h1>
          <p>The highest matching priority wins. Ties keep the rule listed first.</p>
        </div>
        <button type="button" className="button button--primary" disabled={config.presets.length === 0} onClick={() => setPickerTarget(NEW_RULE)}>
          <Plus size={16} /> Add process rule
        </button>
      </header>

      <div className="rule-stack">
        {[...config.rules]
          .sort((left, right) => right.priority - left.priority)
          .map((rule) => (
            <section className={rule.enabled ? "panel rule-card" : "panel rule-card is-disabled"} key={rule.id}>
              <div className="rule-card__top">
                <button type="button" className={rule.enabled ? "power-toggle is-on" : "power-toggle"} onClick={() => updateRule(rule.id, { enabled: !rule.enabled })} title={rule.enabled ? "Disable rule" : "Enable rule"}><Power size={16} /></button>
                <label className="rule-name">Rule name<input value={rule.label} onChange={(event) => updateRule(rule.id, { label: event.target.value })} /></label>
                <label className="priority-field">Priority<input type="number" value={rule.priority} onChange={(event) => updateRule(rule.id, { priority: Number(event.target.value) })} /></label>
                <button type="button" className="icon-button icon-button--danger" title="Delete rule" onClick={() => onChange({ ...config, rules: config.rules.filter((candidate) => candidate.id !== rule.id) })}><Trash2 size={16} /></button>
              </div>

              <div className="rule-sentence">
                <span>When</span>
                <select value={rule.matchMode} onChange={(event) => updateRule(rule.id, { matchMode: event.target.value as ProcessRule["matchMode"] })}><option value="any">any of these processes are running</option><option value="all">all of these processes are running</option></select>
                <span>publish</span>
                <select value={rule.presetId} onChange={(event) => updateRule(rule.id, { presetId: event.target.value })}>{config.presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select>
              </div>

              <div className="process-chips">
                {rule.processNames.map((process) => (
                  <span className="process-chip" key={process}>{process}<button type="button" disabled={rule.processNames.length === 1} onClick={() => updateRule(rule.id, { processNames: rule.processNames.filter((candidate) => candidate !== process) })}><X size={12} /></button></span>
                ))}
                <button type="button" className="process-chip process-chip--add" onClick={() => setPickerTarget(rule.id)}><Plus size={12} /> Add process</button>
              </div>
            </section>
          ))}
        {config.rules.length === 0 && (
          <div className="panel empty-state">
            <div className="empty-state__icon"><Power size={24} /></div>
            <h2>No automatic rules yet</h2>
            <p>Pick a running process, choose a preset, and give it a priority.</p>
            <button type="button" className="button button--primary" disabled={config.presets.length === 0} onClick={() => setPickerTarget(NEW_RULE)}><Plus size={16} /> Create first rule</button>
          </div>
        )}
      </div>

      <ProcessPicker open={pickerTarget !== null} onClose={() => setPickerTarget(null)} onSelect={addProcess} />
    </div>
  );
}
