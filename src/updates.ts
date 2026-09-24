import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

export interface UpdateOffer {
  version: string;
  notes: string;
}

export async function findUpdate(): Promise<{ update: Update; offer: UpdateOffer } | null> {
  const update = await check({ timeout: 20_000 });
  if (!update) return null;
  return {
    update,
    offer: {
      version: update.version,
      notes: update.body?.trim() ?? "",
    },
  };
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function describeDownload(event: DownloadEvent, downloaded: number): { downloaded: number; text: string } {
  if (event.event === "Started") {
    const total = event.data.contentLength ?? 0;
    return {
      downloaded: 0,
      text: total > 0 ? `Downloading 0 of ${formatBytes(total)}` : "Downloading…",
    };
  }
  if (event.event === "Progress") {
    const next = downloaded + event.data.chunkLength;
    return { downloaded: next, text: `Downloading ${formatBytes(next)}` };
  }
  return { downloaded, text: "Installing…" };
}

export async function installUpdate(update: Update, onProgress: (text: string) => void): Promise<void> {
  let downloaded = 0;
  await update.downloadAndInstall((event) => {
    const next = describeDownload(event, downloaded);
    downloaded = next.downloaded;
    onProgress(next.text);
  });
  // Windows exits inside the installer. Linux and macOS need an explicit restart.
  if (!navigator.userAgent.includes("Windows")) await relaunch();
}
