import type { ConnectionStatus, ResolutionReason, ServiceSnapshot } from "./types";

export const connectionHelp: Record<ConnectionStatus, string> = {
  setupRequired: "Add a Discord application ID in Settings. Nothing is published until that ID is saved.",
  connecting: "ActivityMux is trying to reach the Discord desktop app on this computer.",
  connected: "Discord accepted the presence. Discord's own game detection and Spotify stay separate.",
  disconnected: "Discord desktop is closed, or it rejected the update. The dashboard error says which.",
};

export function liveSourceLabel(reason: ResolutionReason): string {
  switch (reason.kind) {
    case "manual": return "Pinned";
    case "processRule": return reason.ruleLabel;
    case "default": return "Default";
    case "none": return "Cleared";
  }
}

export function livePresence(snapshot: ServiceSnapshot) {
  return {
    presetId: snapshot.resolution.presetId,
    presetLabel: snapshot.resolution.presetLabel,
    ruleId: snapshot.resolution.reason.kind === "processRule" ? snapshot.resolution.reason.ruleId : null,
    source: liveSourceLabel(snapshot.resolution.reason),
  };
}
