import { useEffect, useRef, useState, useMemo } from "react";
import { getVersion } from "@tauri-apps/api/app";
import type { Update } from "@tauri-apps/plugin-updater";
import {
  AppShell,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  NavLink,
  Notification,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  Activity,
  AlertCircle,
  Check,
  CircleGauge,
  Library,
  Save,
  Settings,
  Workflow,
} from "lucide-react";
import { api } from "./api";
import { Dashboard } from "./components/Dashboard";
import { PresetsScreen } from "./components/PresetsScreen";
import { RulesScreen } from "./components/RulesScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { DEMO_CONFIG, DEMO_SNAPSHOT } from "./demo";
import type { AppConfig, Screen, ServiceSnapshot } from "./types";
import { findUpdate, installUpdate, type UpdateOffer } from "./updates";
import { HelpTip } from "./components/HelpTip";
import { AppearanceMenu } from "./components/AppearanceControls";
import { useAppearance } from "./AppearanceProvider";
import { WindowControls, startWindowDrag, toggleWindowMaximized } from "./components/WindowControls";
import { connectionHelp, livePresence } from "./explain";
import "./App.css";

const EMPTY_SNAPSHOT: ServiceSnapshot = {
  connection: "setupRequired",
  resolution: { presetId: null, presetLabel: null, reason: { kind: "none" } },
  lastError: null,
  lastPublishedAt: null,
};

const DEMO_MODE = import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo");

const navigation: Array<{ id: Screen; label: string; description: string; icon: typeof CircleGauge }> = [
  { id: "dashboard", label: "Dashboard", description: "What Discord is showing", icon: CircleGauge },
  { id: "presets", label: "Presets", description: "Activities you can publish", icon: Library },
  { id: "rules", label: "Process rules", description: "Switch by the open app", icon: Workflow },
  { id: "settings", label: "Settings", description: "Discord ID and fallback", icon: Settings },
];

const connectionCopy = {
  setupRequired: { label: "Setup required", color: "yellow" },
  connecting: { label: "Connecting", color: "blue" },
  connected: { label: "Discord online", color: "signal" },
  disconnected: { label: "Discord offline", color: "red" },
} as const;

export default function App() {
  const { appearance } = useAppearance();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null);
  const [snapshot, setSnapshot] = useState<ServiceSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [appVersion, setAppVersion] = useState("0.2.3");
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<string | null>(null);
  const [updateOffer, setUpdateOffer] = useState<UpdateOffer | null>(null);
  const updateRef = useRef<Update | null>(null);

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

  useEffect(() => {
    if (DEMO_MODE || !("__TAURI_INTERNALS__" in window)) return;
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || DEMO_MODE || !("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    findUpdate()
      .then((found) => {
        if (cancelled || !found) {
          void found?.update.close();
          return;
        }
        updateRef.current = found.update;
        setUpdateOffer(found.offer);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => config !== null && savedConfig !== null && JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  const persist = async (nextConfig = config) => {
    if (!nextConfig) return null;
    setSaving(true);
    try {
      const saved = DEMO_MODE ? structuredClone(nextConfig) : await api.saveConfig(nextConfig);
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
    return (
      <Center className="loading-screen">
        <Stack align="center" gap="md">
          <div className="loading-orbit"><Loader color="accent" size="sm" /></div>
          <Text c="dimmed" size="sm">Starting ActivityMux…</Text>
        </Stack>
      </Center>
    );
  }

  const dismissUpdate = () => {
    if (installingUpdate) return;
    const pending = updateRef.current;
    updateRef.current = null;
    setUpdateOffer(null);
    setUpdateProgress(null);
    void pending?.close();
  };

  const checkForUpdates = async () => {
    if (DEMO_MODE || !("__TAURI_INTERNALS__" in window)) {
      setMessage({ kind: "error", text: "Update checks only run in the installed app" });
      return;
    }
    setCheckingUpdates(true);
    try {
      const found = await findUpdate();
      if (!found) {
        setMessage({ kind: "success", text: "You're on the latest version" });
        return;
      }
      const previous = updateRef.current;
      updateRef.current = found.update;
      setUpdateOffer(found.offer);
      setUpdateProgress(null);
      if (previous && previous !== found.update) void previous.close();
    } catch (reason) {
      setMessage({ kind: "error", text: String(reason) });
    } finally {
      setCheckingUpdates(false);
    }
  };

  const startUpdate = async () => {
    const pending = updateRef.current;
    if (!pending) return;
    setInstallingUpdate(true);
    setUpdateProgress("Preparing download…");
    try {
      await installUpdate(pending, setUpdateProgress);
    } catch (reason) {
      setInstallingUpdate(false);
      setUpdateProgress(null);
      setMessage({ kind: "error", text: String(reason) });
    }
  };

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

  const activeNavigation = navigation.find((item) => item.id === screen) ?? navigation[0];
  const connection = connectionCopy[snapshot.connection];
  const live = livePresence(snapshot);
  const liveLabel = live.presetLabel ?? "No activity";
  const liveOnDiscord = snapshot.connection === "connected" && live.presetId !== null;
  const liveKicker = liveOnDiscord ? "NOW LIVE" : live.presetId ? "SELECTED" : "NO ACTIVITY";

  return (
    <AppShell
      className="app-shell"
      navbar={{ width: 248, breakpoint: "sm" }}
      header={{ height: 68 }}
      padding={0}
    >
      <AppShell.Navbar className="sidebar" p="md">
        <Group className="brand" gap="sm" wrap="nowrap">
          <ThemeIcon className="brand__mark" size={42} radius="md" variant="gradient" gradient={{ from: "accent.4", to: "signal.5", deg: 135 }}>
            <Activity size={22} />
          </ThemeIcon>
          <Box>
            <Text fw={750} size="md" lh={1.1}>ActivityMux</Text>
            <Text className="tracking-label" c="dimmed" size="10px">PRESENCE ROUTER</Text>
          </Box>
        </Group>

        <Divider my="sm" />
        <Stack gap={6}>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                active={screen === item.id}
                label={item.label}
                description={item.description}
                leftSection={<Icon size={18} strokeWidth={1.8} />}
                onClick={() => setScreen(item.id)}
                variant="light"
                color="accent"
                className="nav-item"
              />
            );
          })}
        </Stack>
        {appearance.aesthetic === "hearteyes" && <div className="heart-eyes-art" aria-hidden="true" />}

        <Box mt="auto" className="sidebar__footer">
          <HelpTip label={liveOnDiscord ? `${liveLabel} is on Discord now. ${live.source}.` : `${liveLabel} is selected. ${connectionHelp[snapshot.connection]}`}>
            <UnstyledButton className="signal-status" type="button" onClick={() => setScreen("dashboard")}>
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <span className={`status-beacon status-beacon--${snapshot.connection}`} />
                <Box className="signal-status__copy">
                  <Text className="now-live__kicker">{liveKicker}</Text>
                  <Text fw={750} size="sm" truncate>{liveLabel}</Text>
                  <Text c="dimmed" size="xs" truncate>{connection.label} · {live.source}</Text>
                </Box>
              </Group>
            </UnstyledButton>
          </HelpTip>
          <Group justify="space-between" mt="sm">
            <Text c="dimmed" size="10px">LOCAL</Text>
            <Badge variant="outline" color="gray" size="xs">v{appVersion}</Badge>
          </Group>
        </Box>
      </AppShell.Navbar>

      <AppShell.Header className="topbar">
        <div className="topbar__body" onMouseDown={startWindowDrag} onDoubleClick={toggleWindowMaximized}>
          <Group className="topbar__main" h="100%" justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <ThemeIcon variant="light" color="accent" size="md" radius="md">
              <activeNavigation.icon size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">{activeNavigation.label}</Text>
            <HelpTip label={liveOnDiscord ? `${liveLabel} is on Discord now. ${live.source}.` : `${liveLabel} is selected, but Discord is not showing it yet. ${live.source}.`}>
              <UnstyledButton className={`now-live${liveOnDiscord ? "" : " is-empty"}`} type="button" onClick={() => setScreen("dashboard")}>
                <span className={`status-beacon status-beacon--${snapshot.connection}`} />
                <span className="now-live__copy">
                  <span className="now-live__kicker">{liveKicker}</span>
                  <strong>{liveLabel}</strong>
                </span>
                <Badge size="xs" variant="light" color={liveOnDiscord ? "signal" : "gray"}>{live.source}</Badge>
              </UnstyledButton>
            </HelpTip>
          </Group>
          <Group gap="md">
            <AppearanceMenu />
            <HelpTip label={dirty ? "Discord is still using the last save. Save to publish these edits." : "Discord is using this saved setup."}>
              <Group gap={7} className={dirty ? "save-state save-state--dirty" : "save-state"}>
                <span className={dirty ? "save-dot save-dot--dirty" : "save-dot"} />
                <Text c={dirty ? undefined : "dimmed"} size="xs">{dirty ? "Unsaved changes" : "Synced locally"}</Text>
              </Group>
            </HelpTip>
            <HelpTip label={dirty ? "Write the edits and send the chosen presence to Discord." : "Nothing new to send."}>
              <Button
                size="sm"
                variant={dirty ? "gradient" : "subtle"}
                gradient={{ from: "accent.5", to: "accent.7", deg: 135 }}
                leftSection={dirty ? <Save size={15} /> : <Check size={15} />}
                disabled={!dirty}
                loading={saving}
                onClick={() => persist()}
              >
                {dirty ? "Save changes" : "Saved"}
              </Button>
            </HelpTip>
          </Group>
          </Group>
        </div>
        <WindowControls />
      </AppShell.Header>

      <AppShell.Main className="workspace">
        <div className="ambient ambient--one" />
        <div className="ambient ambient--two" />
        <div className="workspace__content">
          {screen === "dashboard" && <Dashboard config={config} snapshot={snapshot} onManualOverride={changeManualOverride} onNavigateSettings={() => setScreen("settings")} />}
          {screen === "presets" && <PresetsScreen config={config} livePresetId={live.presetId} published={liveOnDiscord} onChange={setConfig} onResetTimer={resetTimer} />}
          {screen === "rules" && <RulesScreen config={config} liveRuleId={live.ruleId} livePresetLabel={live.presetLabel} onChange={setConfig} />}
          {screen === "settings" && (
            <SettingsScreen
              config={config}
              checkingUpdates={checkingUpdates}
              onChange={setConfig}
              onCheckForUpdates={checkForUpdates}
              onImport={async (path) => {
                try {
                  const imported = await api.importConfig(path);
                  setConfig(imported);
                  setSavedConfig(structuredClone(imported));
                  setMessage({ kind: "success", text: "Configuration imported" });
                } catch (reason) {
                  setMessage({ kind: "error", text: String(reason) });
                }
              }}
              onExport={async (path) => {
                const current = dirty ? await persist(config) : config;
                if (!current) return;
                try {
                  await api.exportConfig(path);
                  setMessage({ kind: "success", text: "Configuration exported" });
                } catch (reason) {
                  setMessage({ kind: "error", text: String(reason) });
                }
              }}
            />
          )}
        </div>
      </AppShell.Main>

      <Modal opened={updateOffer !== null} onClose={dismissUpdate} title="Update available" centered radius="xl" closeOnClickOutside={!installingUpdate} closeOnEscape={!installingUpdate} withCloseButton={!installingUpdate}>
        <Stack gap="md">
          <Text size="sm">ActivityMux {updateOffer?.version} is ready. It will restart after installing.</Text>
          {updateOffer?.notes && (
            <ScrollArea.Autosize mah={160}>
              <Text c="dimmed" size="sm" style={{ whiteSpace: "pre-wrap" }}>{updateOffer.notes}</Text>
            </ScrollArea.Autosize>
          )}
          {updateProgress && <Text size="sm">{updateProgress}</Text>}
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" disabled={installingUpdate} onClick={dismissUpdate}>Not now</Button>
            <Button variant="gradient" gradient={{ from: "accent.5", to: "accent.7" }} loading={installingUpdate} onClick={() => void startUpdate()}>Install and restart</Button>
          </Group>
        </Stack>
      </Modal>
      {message && (
        <Notification
          className="app-notification"
          color={message.kind === "success" ? "signal" : "red"}
          icon={message.kind === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          title={message.kind === "success" ? "Saved" : "Error"}
          withCloseButton={false}
        >
          {message.text}
        </Notification>
      )}
    </AppShell>
  );
}
