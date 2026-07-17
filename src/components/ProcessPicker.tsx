import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { api } from "../api";
import type { RunningProcess } from "../types";

interface ProcessPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}

export function ProcessPicker({ open, onClose, onSelect }: ProcessPickerProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api.listProcesses()
      .then(setProcesses)
      .catch((reason: unknown) => setError(String(reason)))
      .finally(() => setLoading(false));
  }, [open]);

  const visible = useMemo(() => {
    const unique = new Map<string, RunningProcess>();
    for (const process of processes) {
      const key = process.name.toLowerCase();
      if (!unique.has(key)) unique.set(key, process);
    }
    const normalizedQuery = query.trim().toLowerCase();
    return [...unique.values()]
      .filter((process) =>
        !normalizedQuery
        || process.name.toLowerCase().includes(normalizedQuery)
        || process.executable.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 100);
  }, [processes, query]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Choose a running process" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div><p className="kicker">Running now</p><h2>Choose a process</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="search-box"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search processes" /></label>
        <div className="process-results">
          {loading && <div className="loading-row"><LoaderCircle className="spin" size={18} /> Reading processes…</div>}
          {error && <div className="inline-error">{error}</div>}
          {!loading && visible.map((process) => (
            <button type="button" key={`${process.name}-${process.pid}`} onClick={() => { onSelect(process.name); onClose(); }}>
              <span className="process-icon">{process.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{process.name}</strong><small>{process.executable || `PID ${process.pid}`}</small></span>
            </button>
          ))}
          {!loading && !error && visible.length === 0 && <p className="empty-copy">No matching processes.</p>}
        </div>
      </section>
    </div>
  );
}
