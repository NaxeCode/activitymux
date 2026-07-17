import { useEffect, useMemo, useState } from "react";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import {
  AppShell,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  NavLink,
  Notification,
  Stack,
  Text,
  ThemeIcon,
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
import "./App.css";

const EMPTY_SNAPSHOT: ServiceSnapshot = {
  connection: "setupRequired",
  resolution: { presetId: null, presetLabel: null, reason: { kind: "none" } },
  lastError: null,
  lastPublishedAt: null,
};

const DEMO_MODE = import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo");

const navigation: Array<{ id: Screen; label: string; description: string; icon: typeof CircleGauge }> = [
  { id: "dashboard", label: "Dashboard", description: "Current presence", icon: CircleGauge },
  { id: "presets", label: "Presets", description: "Activities", icon: Library },
  { id: "rules", label: "Process rules", description: "Matching", icon: Workflow },
  { id: "settings", label: "Settings", description: "Configuration", icon: Settings },
];

const connectionCopy = {
  setupRequired: { label: "Setup required", color: "yellow" },
  connecting: { label: "Connecting", color: "blue" },
  connected: { label: "Discord online", color: "teal" },
  disconnected: { label: "Discord offline", color: "red" },
} as const;

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
    return (
      <Center className="loading-screen">
        <Stack align="center" gap="md">
          <div className="loading-orbit"><Loader color="ultraviolet.4" size="sm" /></div>
          <Text c="dimmed" size="sm">Starting ActivityMux…</Text>
        </Stack>
      </Center>
    );
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

  const activeNavigation = navigation.find((item) => item.id === screen) ?? navigation[0];
  const connection = connectionCopy[snapshot.connection];

  return (
    <AppShell
      className="app-shell"
      navbar={{ width: 248, breakpoint: "sm" }}
      header={{ height: 68 }}
      padding={0}
    >
      <AppShell.Navbar className="sidebar" p="md">
        <Group className="brand" gap="sm" wrap="nowrap">
          <ThemeIcon className="brand__mark" size={42} radius="md" variant="gradient" gradient={{ from: "ultraviolet.4", to: "signal.5", deg: 135 }}>
            <Activity size={22} />
          </ThemeIcon>
          <Box>
            <Text fw={750} size="md" lh={1.1}>ActivityMux</Text>
            <Text className="tracking-label" c="dimmed" size="10px">PRESENCE ROUTER</Text>
          </Box>
        </Group>

        <Divider my="lg" color="dark.5" />
        <Text className="nav-section-label" c="dimmed" size="10px" fw={700} mb="xs">MENU</Text>
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
                color="ultraviolet"
                className="nav-item"
              />
            );
          })}
        </Stack>

        <Box mt="auto" className="sidebar__footer">
          <Box className="signal-status">
            <Group gap="xs" wrap="nowrap">
              <span className={`status-beacon status-beacon--${snapshot.connection}`} />
              <Box className="signal-status__copy">
                <Text fw={650} size="xs">{connection.label}</Text>
                <Text c="dimmed" size="xs" truncate>{snapshot.resolution.presetLabel ?? "No activity"}</Text>
              </Box>
            </Group>
          </Box>
          <Group justify="space-between" mt="sm">
            <Text c="dimmed" size="10px">LOCAL</Text>
            <Badge variant="outline" color="gray" size="xs">v0.2.0</Badge>
          </Group>
        </Box>
      </AppShell.Navbar>

      <AppShell.Header className="topbar" px="xl">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <ThemeIcon variant="light" color="ultraviolet" size="md" radius="md">
              <activeNavigation.icon size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="sm">{activeNavigation.label}</Text>
              <Text c="dimmed" size="xs">{activeNavigation.description}</Text>
            </Box>
          </Group>
          <Group gap="md">
            <Group gap={7} className="save-state">
              <span className={dirty ? "save-dot save-dot--dirty" : "save-dot"} />
              <Text c={dirty ? "yellow.3" : "dimmed"} size="xs">{dirty ? "Unsaved changes" : "Synced locally"}</Text>
            </Group>
            <Button
              size="sm"
              variant={dirty ? "gradient" : "subtle"}
              gradient={{ from: "ultraviolet.5", to: "ultraviolet.7", deg: 135 }}
              leftSection={dirty ? <Save size={15} /> : <Check size={15} />}
              disabled={!dirty}
              loading={saving}
              onClick={() => persist()}
            >
              {dirty ? "Save changes" : "Saved"}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main className="workspace">
        <div className="ambient ambient--one" />
        <div className="ambient ambient--two" />
        <div className="workspace__content">
          {screen === "dashboard" && <Dashboard config={config} snapshot={snapshot} onManualOverride={changeManualOverride} onNavigateSettings={() => setScreen("settings")} />}
          {screen === "presets" && <PresetsScreen config={config} onChange={setConfig} onResetTimer={resetTimer} />}
          {screen === "rules" && <RulesScreen config={config} onChange={setConfig} />}
          {screen === "settings" && (
            <SettingsScreen
              config={config}
              onChange={setConfig}
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

      {message && (
        <Notification
          className="app-notification"
          color={message.kind === "success" ? "teal" : "red"}
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
