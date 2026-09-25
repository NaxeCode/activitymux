import { useEffect, useState, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function isInteractive(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, textarea, select, [role='button']"));
}

export function startWindowDrag(event: MouseEvent) {
  if (!IN_TAURI || event.button !== 0 || isInteractive(event.target)) return;
  void getCurrentWindow().startDragging();
}

export function toggleWindowMaximized(event: MouseEvent) {
  if (!IN_TAURI || isInteractive(event.target)) return;
  void getCurrentWindow().toggleMaximize();
}

function RestoreIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.5 1.5h7v7h-7z" fill="none" stroke="currentColor" />
      <path d="M1.5 3.5h7v7h-7z" fill="none" stroke="currentColor" />
    </svg>
  );
}

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!IN_TAURI) return;
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void appWindow.isMaximized().then(setMaximized).catch(() => {});
    void appWindow.onResized(() => {
      void appWindow.isMaximized().then(setMaximized).catch(() => {});
    }).then((stop) => {
      unlisten = stop;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const run = (action: () => Promise<void>) => {
    if (!IN_TAURI) return;
    void action();
  };
  const appWindow = IN_TAURI ? getCurrentWindow() : null;
  return (
    <div className="window-controls">
      <button type="button" aria-label="Minimize" onClick={() => run(() => appWindow!.minimize())}>
        <Minus size={14} />
      </button>
      <button type="button" aria-label={maximized ? "Restore" : "Maximize"} onClick={() => run(() => appWindow!.toggleMaximize())}>
        {maximized ? <RestoreIcon /> : <Square size={12} />}
      </button>
      <button type="button" className="window-controls__close" aria-label="Close" onClick={() => run(() => appWindow!.close())}>
        <X size={14} />
      </button>
    </div>
  );
}
