import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { Clock3, Copy, Image, Link2, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { AppConfig, Preset, TimerMode } from "../types";
import { ActivityCard } from "./ActivityCard";

interface PresetsScreenProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
  onResetTimer: (presetId: string) => Promise<void>;
}

const nowSeconds = () => Math.floor(Date.now() / 1_000);

function blankPreset(): Preset {
  return {
    id: crypto.randomUUID(),
    label: "New presence",
    activity: {
      discordApplicationId: "",
      name: "New presence",
      details: "",
      state: "",
      activityType: "playing",
      statusDisplayType: "name",
      largeImage: "",
      largeText: "",
      smallImage: "",
      smallText: "",
      timer: { kind: "disabled" },
      buttons: [],
    },
  };
}

function timerForKind(kind: TimerMode["kind"]): TimerMode {
  switch (kind) {
    case "disabled": return { kind: "disabled" };
    case "session": return { kind: "session" };
    case "persistent": return { kind: "persistent", startedAt: nowSeconds() };
    case "fixed": return { kind: "fixed", startedAt: nowSeconds() };
  }
}

export function PresetsScreen({ config, onChange, onResetTimer }: PresetsScreenProps) {
  const [selectedId, setSelectedId] = useState(config.presets[0]?.id ?? "");

  useEffect(() => {
    if (!config.presets.some((preset) => preset.id === selectedId)) setSelectedId(config.presets[0]?.id ?? "");
  }, [config.presets, selectedId]);

  const selected = useMemo(
    () => config.presets.find((preset) => preset.id === selectedId) ?? null,
    [config.presets, selectedId],
  );

  const updatePreset = (mutate: (preset: Preset) => Preset) => {
    onChange({ ...config, presets: config.presets.map((preset) => preset.id === selectedId ? mutate(preset) : preset) });
  };
  const updateActivity = (patch: Partial<Preset["activity"]>) => updatePreset((preset) => ({ ...preset, activity: { ...preset.activity, ...patch } }));

  const addPreset = () => {
    const preset = blankPreset();
    onChange({ ...config, presets: [...config.presets, preset] });
    setSelectedId(preset.id);
  };

  const duplicatePreset = () => {
    if (!selected) return;
    const duplicate = structuredClone(selected);
    duplicate.id = crypto.randomUUID();
    duplicate.label = `${selected.label} copy`;
    onChange({ ...config, presets: [...config.presets, duplicate] });
    setSelectedId(duplicate.id);
  };

  const deletePreset = () => {
    if (!selected) return;
    const remaining = config.presets.filter((preset) => preset.id !== selected.id);
    const fallback = remaining[0]?.id ?? null;
    onChange({
      ...config,
      presets: remaining,
      rules: config.rules.filter((rule) => rule.presetId !== selected.id),
      defaultPresetId: config.defaultPresetId === selected.id ? fallback : config.defaultPresetId,
      manualOverridePresetId: config.manualOverridePresetId === selected.id ? null : config.manualOverridePresetId,
    });
    setSelectedId(fallback ?? "");
  };

  return (
    <div className="screen">
      <header className="screen-header hero-header">
        <Box>
          <Badge variant="light" color="ultraviolet" size="sm" mb="sm">PRESETS</Badge>
          <Title order={1}>Presets</Title>
          <Text c="dimmed" mt="xs">Discord activity presets.</Text>
        </Box>
        <Button variant="gradient" gradient={{ from: "ultraviolet.5", to: "ultraviolet.7" }} leftSection={<Plus size={16} />} onClick={addPreset}>Add preset</Button>
      </header>

      <div className="preset-workbench">
        <Paper className="glass-panel preset-list" radius="xl" p="sm">
          <Group justify="space-between" px="xs" py="sm">
            <Text className="eyebrow" c="dimmed">PRESETS</Text>
            <Badge variant="light" color="gray" size="sm">{config.presets.length}</Badge>
          </Group>
          <ScrollArea.Autosize mah="calc(100vh - 250px)" type="hover">
            <Stack gap={6}>
              {config.presets.map((preset, index) => (
                <UnstyledButton
                  key={preset.id}
                  className={`preset-list__item${preset.id === selectedId ? " is-active" : ""}`}
                  onClick={() => setSelectedId(preset.id)}
                >
                  <ThemeIcon className="preset-avatar" variant={preset.id === selectedId ? "gradient" : "light"} gradient={{ from: "ultraviolet.4", to: "signal.5" }} color="gray" size={38} radius="md">
                    {String(index + 1).padStart(2, "0")}
                  </ThemeIcon>
                  <Box className="preset-list__copy">
                    <Text fw={650} size="sm" truncate>{preset.label}</Text>
                    <Text c="dimmed" size="xs" truncate>{preset.activity.name}</Text>
                  </Box>
                </UnstyledButton>
              ))}
              {config.presets.length === 0 && <Text c="dimmed" size="sm" ta="center" py="xl">Create your first preset.</Text>}
            </Stack>
          </ScrollArea.Autosize>
        </Paper>

        {selected ? (
          <Paper className="glass-panel preset-editor" radius="xl" p="lg">
            <Group justify="space-between" mb="md">
              <Box>
                <Text className="eyebrow" c="dimmed">SELECTED</Text>
                <Title order={2}>{selected.label}</Title>
              </Box>
              <Group gap="xs">
                <Tooltip label="Duplicate preset"><ActionIcon variant="light" color="gray" size="lg" onClick={duplicatePreset}><Copy size={16} /></ActionIcon></Tooltip>
                <Tooltip label="Delete preset"><ActionIcon variant="light" color="red" size="lg" onClick={deletePreset}><Trash2 size={16} /></ActionIcon></Tooltip>
              </Group>
            </Group>

            <Accordion variant="separated" radius="lg" defaultValue="identity" className="editor-accordion">
              <Accordion.Item value="identity">
                <Accordion.Control icon={<Sparkles size={17} />}>Activity</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput label="Editor label" value={selected.label} onChange={(event) => updatePreset((preset) => ({ ...preset, label: event.target.value }))} />
                    <TextInput label="Discord application name" maxLength={128} value={selected.activity.name} onChange={(event) => updateActivity({ name: event.target.value })} />
                    <Select label="Activity type" data={[{ value: "playing", label: "Playing" }, { value: "listening", label: "Listening to" }, { value: "watching", label: "Watching" }, { value: "competing", label: "Competing in" }]} value={selected.activity.activityType} onChange={(value) => value && updateActivity({ activityType: value as Preset["activity"]["activityType"] })} />
                    <Select label="Status text" data={[{ value: "name", label: "Discord app name" }, { value: "details", label: "Details" }, { value: "state", label: "State" }]} value={selected.activity.statusDisplayType} onChange={(value) => value && updateActivity({ statusDisplayType: value as Preset["activity"]["statusDisplayType"] })} />
                    <TextInput className="span-2" label="Application ID override" description="Leave blank to use the ID from Settings" inputMode="numeric" value={selected.activity.discordApplicationId} onChange={(event) => updateActivity({ discordApplicationId: event.target.value.replace(/\D/g, "") })} />
                    <TextInput className="span-2" label="Details" maxLength={128} value={selected.activity.details} onChange={(event) => updateActivity({ details: event.target.value })} placeholder="Contemplating the Impaler" />
                    <TextInput className="span-2" label="State" maxLength={128} value={selected.activity.state} onChange={(event) => updateActivity({ state: event.target.value })} placeholder="The flame still burns" />
                  </SimpleGrid>
                  <Text c="dimmed" size="xs" mt="md">The Discord application ID supplies the title and assets.</Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="artwork">
                <Accordion.Control icon={<Image size={17} />}>Artwork</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput className="span-2" label="Large image URL or asset key" value={selected.activity.largeImage} onChange={(event) => updateActivity({ largeImage: event.target.value })} placeholder="https://… or asset_key" />
                    <TextInput label="Large image hover text" value={selected.activity.largeText} onChange={(event) => updateActivity({ largeText: event.target.value })} />
                    <TextInput label="Small image URL or asset key" value={selected.activity.smallImage} onChange={(event) => updateActivity({ smallImage: event.target.value })} />
                    <TextInput className="span-2" label="Small image hover text" value={selected.activity.smallText} onChange={(event) => updateActivity({ smallText: event.target.value })} />
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="timer">
                <Accordion.Control icon={<Clock3 size={17} />}>Timer</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Select label="Timer behavior" data={[{ value: "disabled", label: "No timer" }, { value: "session", label: "Reset each activation" }, { value: "persistent", label: "Keep counting across restarts" }, { value: "fixed", label: "Start from a fixed date" }]} value={selected.activity.timer.kind} onChange={(value) => value && updateActivity({ timer: timerForKind(value as TimerMode["kind"]) })} />
                    {(selected.activity.timer.kind === "persistent" || selected.activity.timer.kind === "fixed") && (
                      <TextInput label="Start time" type="datetime-local" value={new Date(selected.activity.timer.startedAt * 1_000).toISOString().slice(0, 16)} onChange={(event) => updateActivity({ timer: { kind: selected.activity.timer.kind as "persistent" | "fixed", startedAt: Math.floor(new Date(event.target.value).getTime() / 1_000) } })} />
                    )}
                  </SimpleGrid>
                  {selected.activity.timer.kind === "persistent" && <Button mt="md" variant="light" color="gray" leftSection={<RotateCcw size={15} />} onClick={() => onResetTimer(selected.id)}>Reset to now</Button>}
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="buttons">
                <Accordion.Control icon={<Link2 size={17} />}>Buttons <Text span c="dimmed" size="xs">({selected.activity.buttons.length}/2)</Text></Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {selected.activity.buttons.map((button, index) => (
                      <Group key={index} wrap="nowrap" align="flex-end">
                        <TextInput label="Label" maxLength={32} value={button.label} onChange={(event) => updateActivity({ buttons: selected.activity.buttons.map((item, buttonIndex) => buttonIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Learn more" flex={1} />
                        <TextInput label="URL" value={button.url} onChange={(event) => updateActivity({ buttons: selected.activity.buttons.map((item, buttonIndex) => buttonIndex === index ? { ...item, url: event.target.value } : item) })} placeholder="https://…" flex={2} />
                        <ActionIcon color="red" variant="light" size={36} onClick={() => updateActivity({ buttons: selected.activity.buttons.filter((_, buttonIndex) => buttonIndex !== index) })}><Trash2 size={15} /></ActionIcon>
                      </Group>
                    ))}
                    {selected.activity.buttons.length < 2 && <Button variant="light" color="gray" leftSection={<Plus size={15} />} onClick={() => updateActivity({ buttons: [...selected.activity.buttons, { label: "Learn more", url: "https://" }] })}>Add button</Button>}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Paper>
        ) : (
          <Paper className="glass-panel preset-editor" radius="xl" p="xl"><Text c="dimmed" ta="center">Select or create a preset.</Text></Paper>
        )}

        <aside className="preview-column">
          <Group justify="space-between" mb="sm"><Text className="eyebrow" c="dimmed">LIVE PREVIEW</Text><Badge color="teal" variant="dot">SYNCED</Badge></Group>
          <ActivityCard preset={selected} compact />
          <Text c="dimmed" size="xs" mt="sm">Discord resolves asset keys.</Text>
        </aside>
      </div>
    </div>
  );
}
