import { open, save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Alert,
  Badge,
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
import { Download, ExternalLink, FileUp, HardDrive, RadioTower, Route, Settings2, ShieldCheck } from "lucide-react";
import type { AppConfig } from "../types";

interface SettingsScreenProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
  onImport: (path: string) => Promise<void>;
  onExport: (path: string) => Promise<void>;
}

export function SettingsScreen({ config, onChange, onImport, onExport }: SettingsScreenProps) {
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
      <header className="screen-header hero-header">
        <Box>
          <Badge variant="light" color="ultraviolet" size="sm" mb="sm">SETTINGS</Badge>
          <Title order={1}>Settings</Title>
          <Text c="dimmed" mt="xs">Local configuration.</Text>
        </Box>
      </header>

      <SimpleGrid className="settings-grid" cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="gradient" gradient={{ from: "ultraviolet.5", to: "signal.5" }} size="lg" radius="md"><RadioTower size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">01 · CONNECTION</Text><Title order={3}>Discord</Title><Text c="dimmed" size="sm" mt={4}>Default application ID.</Text></Box>
          </Group>
          <TextInput label="Discord application ID" inputMode="numeric" value={config.settings.discordApplicationId} onChange={(event) => updateSettings({ discordApplicationId: event.target.value.replace(/\D/g, "") })} placeholder="123456789012345678" size="md" />
          <Button mt="md" variant="subtle" color="ultraviolet" leftSection={<ExternalLink size={15} />} onClick={() => openUrl("https://discord.com/developers/applications")}>Open Developer Portal</Button>
          <Alert mt="md" variant="light" color="teal" icon={<ShieldCheck size={18} />} title="Application ID only">Never paste a client secret or bot token.</Alert>
        </Paper>

        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="light" color="ultraviolet" size="lg" radius="md"><Route size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">02 · SELECTION</Text><Title order={3}>Fallback</Title><Text c="dimmed" size="sm" mt={4}>Used when no rule matches.</Text></Box>
          </Group>
          <Stack gap="md">
            <Select label="Default preset" data={[{ value: "__clear__", label: "Clear presence" }, ...config.presets.map((preset) => ({ value: preset.id, label: preset.label }))]} value={config.defaultPresetId ?? "__clear__"} onChange={(value) => onChange({ ...config, defaultPresetId: value === "__clear__" ? null : value })} />
            <Select label="Process polling interval" data={[{ value: "500", label: "0.5 seconds" }, { value: "1000", label: "1 second" }, { value: "2000", label: "2 seconds" }, { value: "5000", label: "5 seconds" }]} value={String(config.settings.pollIntervalMs)} onChange={(value) => value && updateSettings({ pollIntervalMs: Number(value) })} />
          </Stack>
        </Paper>

        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="light" color="ultraviolet" size="lg" radius="md"><Settings2 size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">03 · DESKTOP</Text><Title order={3}>Desktop</Title><Text c="dimmed" size="sm" mt={4}>Startup and tray.</Text></Box>
          </Group>
          <Stack gap="xs">
            <Paper className="setting-toggle" p="md" radius="lg">
              <Switch label="Launch at login" description="Start hidden." checked={config.settings.launchAtLogin} onChange={(event) => updateSettings({ launchAtLogin: event.currentTarget.checked })} color="teal" />
            </Paper>
            <Paper className="setting-toggle" p="md" radius="lg">
              <Switch label="Close to tray" description="Keep running." checked={config.settings.closeToTray} onChange={(event) => updateSettings({ closeToTray: event.currentTarget.checked })} color="teal" />
            </Paper>
          </Stack>
        </Paper>

        <Paper className="glass-panel settings-section" radius="xl" p="xl">
          <Group align="flex-start" gap="md" mb="lg" wrap="nowrap">
            <ThemeIcon variant="light" color="ultraviolet" size="lg" radius="md"><HardDrive size={18} /></ThemeIcon>
            <Box><Text className="eyebrow" c="dimmed">04 · TRANSFER</Text><Title order={3}>Backup</Title><Text c="dimmed" size="sm" mt={4}>Import or export JSON.</Text></Box>
          </Group>
          <Group grow>
            <Button variant="light" color="gray" leftSection={<FileUp size={16} />} onClick={importConfiguration}>Import JSON</Button>
            <Button variant="light" color="ultraviolet" leftSection={<Download size={16} />} onClick={exportConfiguration}>Export JSON</Button>
          </Group>
          <Text c="dimmed" size="xs" mt="md">Imports are validated. No credentials are stored.</Text>
        </Paper>
      </SimpleGrid>
    </div>
  );
}
