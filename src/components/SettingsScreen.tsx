import { open, save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Alert,
  Box,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Download, ExternalLink, FileUp, HardDrive, Palette, RadioTower, RefreshCw, Route, Settings2, ShieldCheck } from "lucide-react";
import { AppearanceSettings } from "./AppearanceControls";
import { HelpTip } from "./HelpTip";
import type { AppConfig } from "../types";

interface SettingsScreenProps {
  config: AppConfig;
  checkingUpdates: boolean;
  onChange: (config: AppConfig) => void;
  onImport: (path: string) => Promise<void>;
  onExport: (path: string) => Promise<void>;
  onCheckForUpdates: () => Promise<void>;
}

export function SettingsScreen({ config, checkingUpdates, onChange, onImport, onExport, onCheckForUpdates }: SettingsScreenProps) {
  const updateSettings = (patch: Partial<AppConfig["settings"]>) => onChange({ ...config, settings: { ...config.settings, ...patch } });

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

      <SimpleGrid className="settings-grid" cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper className="glass-panel look-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="gradient" gradient={{ from: "accent.5", to: "signal.5" }} size="lg" radius="md"><Palette size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">01 · LOOK</Text><Title order={3}>Appearance</Title><Text c="dimmed" size="sm" mt={4}>Aesthetic and color mode.</Text></Box>
          </Group>
          <AppearanceSettings />
        </Paper>
        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="gradient" gradient={{ from: "accent.5", to: "signal.5" }} size="lg" radius="md"><RadioTower size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">02 · CONNECTION</Text><Title order={3}>Discord</Title><Text c="dimmed" size="sm" mt={4}>Default application ID.</Text></Box>
          </Group>
          <TextInput label="Discord application ID" description="From the Developer Portal. Presets can override it when they need a different title or art set." inputMode="numeric" value={config.settings.discordApplicationId} onChange={(event) => updateSettings({ discordApplicationId: event.target.value.replace(/\D/g, "") })} placeholder="123456789012345678" size="md" />
          <HelpTip label="Open General Information and copy the Application ID. Do not copy the client secret."><Button mt="md" variant="subtle" color="accent" leftSection={<ExternalLink size={15} />} onClick={() => openUrl("https://discord.com/developers/applications")}>Open Developer Portal</Button></HelpTip>
          <Alert mt="md" variant="light" color="signal" icon={<ShieldCheck size={18} />} title="Application ID only">Never paste a client secret or bot token.</Alert>
        </Paper>

        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="light" color="accent" size="lg" radius="md"><Route size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">03 · SELECTION</Text><Title order={3}>Fallback</Title><Text c="dimmed" size="sm" mt={4}>Used when no rule matches.</Text></Box>
          </Group>
          <Stack gap="md">
            <Select label="Default preset" description="Used when nothing is pinned and no process rule matches. Clear presence removes the activity." data={[{ value: "__clear__", label: "Clear presence" }, ...config.presets.map((preset) => ({ value: preset.id, label: preset.label }))]} value={config.defaultPresetId ?? "__clear__"} onChange={(value) => onChange({ ...config, defaultPresetId: value === "__clear__" ? null : value })} />
            <Select label="Process polling interval" description="How often running programs are checked. Faster reacts sooner and uses more CPU." data={[{ value: "500", label: "0.5 seconds" }, { value: "1000", label: "1 second" }, { value: "2000", label: "2 seconds" }, { value: "5000", label: "5 seconds" }]} value={String(config.settings.pollIntervalMs)} onChange={(value) => value && updateSettings({ pollIntervalMs: Number(value) })} />
          </Stack>
        </Paper>

        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="light" color="accent" size="lg" radius="md"><Settings2 size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">04 · DESKTOP</Text><Title order={3}>Desktop</Title><Text c="dimmed" size="sm" mt={4}>Startup and tray.</Text></Box>
          </Group>
          <Stack gap="xs">
            <Paper className="setting-toggle" p="md" radius="lg">
              <Switch label="Launch at login" description="Starts hidden in the tray. Takes effect when you save." checked={config.settings.launchAtLogin} onChange={(event) => updateSettings({ launchAtLogin: event.currentTarget.checked })} color="signal" />
            </Paper>
            <Paper className="setting-toggle" p="md" radius="lg">
              <Switch label="Close to tray" description="Closing the window keeps publishing. Quit from the tray icon to stop." checked={config.settings.closeToTray} onChange={(event) => updateSettings({ closeToTray: event.currentTarget.checked })} color="signal" />
            </Paper>
          </Stack>
          <HelpTip label="Checks GitHub for a newer installer and asks before installing. The app restarts afterward."><Button mt="md" variant="light" color="accent" leftSection={<RefreshCw size={15} />} loading={checkingUpdates} onClick={() => void onCheckForUpdates()}>Check for updates</Button></HelpTip>
        </Paper>

        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="light" color="accent" size="lg" radius="md"><HardDrive size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">05 · TRANSFER</Text><Title order={3}>Backup</Title><Text c="dimmed" size="sm" mt={4}>Import or export JSON.</Text></Box>
          </Group>
          <Group grow>
            <HelpTip fill label="Replace presets, rules, the pin, and these settings with a validated JSON file."><Button variant="light" color="gray" leftSection={<FileUp size={16} />} onClick={importConfiguration}>Import JSON</Button></HelpTip>
            <HelpTip fill label="Write the current setup to a file. Unsaved edits are saved first."><Button variant="light" color="accent" leftSection={<Download size={16} />} onClick={exportConfiguration}>Export JSON</Button></HelpTip>
          </Group>
          <Text c="dimmed" size="xs" mt="md">Import replaces the whole configuration. No token or secret is stored.</Text>
        </Paper>
      </SimpleGrid>
    </div>
  );
}
