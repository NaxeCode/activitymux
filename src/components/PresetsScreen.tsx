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
  UnstyledButton,
} from "@mantine/core";
import { Clock3, Copy, Image, Link2, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { AppConfig, Preset, TimerMode } from "../types";
import { ActivityCard } from "./ActivityCard";
import { HelpTip } from "./HelpTip";

interface PresetsScreenProps {
  config: AppConfig;
  livePresetId: string | null;
  published: boolean;
  onChange: (config: AppConfig) => void;
  onResetTimer: (presetId: string) => Promise<void>;
}

const nowSeconds = () => Math.floor(Date.now() / 1_000);

function localDateTimeValue(seconds: number) {
  const date = new Date(seconds * 1_000);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

const timerHelp = {
  disabled: "No elapsed time is sent to Discord.",
  session: "Starts when this preset becomes active. Leaving and coming back starts it over.",
  persistent: "Keeps counting from the start time, including after ActivityMux restarts.",
  fixed: "Counts from the date you pick. Switching away does not restart it.",
} as const;
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

export function PresetsScreen({ config, livePresetId, published, onChange, onResetTimer }: PresetsScreenProps) {
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
      <Group className="screen-toolbar" justify="space-between" align="center" wrap="nowrap" mb="md">
        <Text c="dimmed" size="sm">Discord takes the title from the application ID, not from the name in this list.</Text>
        <Button variant="gradient" gradient={{ from: "accent.5", to: "accent.7" }} leftSection={<Plus size={16} />} onClick={addPreset}>Add preset</Button>
      </Group>

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
                  className={`preset-list__item${preset.id === selectedId ? " is-selected" : ""}${preset.id === livePresetId ? " is-live" : ""}`}
                  onClick={() => setSelectedId(preset.id)}
                >
                  <ThemeIcon className="preset-avatar" variant={preset.id === livePresetId ? "filled" : preset.id === selectedId ? "gradient" : "light"} color={preset.id === livePresetId ? "signal" : "gray"} gradient={{ from: "accent.4", to: "signal.5" }} size={38} radius="md">
                    {String(index + 1).padStart(2, "0")}
                  </ThemeIcon>
                  <Box className="preset-list__copy">
                    <Text fw={650} size="sm" truncate>{preset.label}</Text>
                    <Text className={preset.id === livePresetId ? "tone-signal" : undefined} c={preset.id === livePresetId ? undefined : "dimmed"} size="xs" truncate>{preset.id === livePresetId ? (published ? "Live on Discord" : "Selected") : preset.activity.name}</Text>
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
                <Group gap="xs">
                  <Text className="eyebrow" c="dimmed">SELECTED</Text>
                  {selected.id === livePresetId && <Badge color="signal" variant="light" size="xs">{published ? "Live on Discord" : "Selected"}</Badge>}
                </Group>
                <Title order={2}>{selected.label}</Title>
                {selected.id !== livePresetId && <Text c="dimmed" size="xs" mt={4}>{livePresetId ? "This is not the preset Discord is using." : "Discord is not using a preset."}</Text>}
              </Box>
              <Group gap="xs">
                <HelpTip label="Copy this preset. Rules and the pin still point at the original."><ActionIcon variant="light" color="gray" size="lg" onClick={duplicatePreset} aria-label="Duplicate preset"><Copy size={16} /></ActionIcon></HelpTip>
                <HelpTip label="Remove this preset. Save will fail if a rule, pin, or default still uses it."><ActionIcon variant="light" color="red" size="lg" onClick={deletePreset} aria-label="Delete preset"><Trash2 size={16} /></ActionIcon></HelpTip>
              </Group>
            </Group>

            <Accordion variant="separated" radius="lg" defaultValue="identity" className="editor-accordion">
              <Accordion.Item value="identity">
                <Accordion.Control icon={<Sparkles size={17} />}>Activity</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput label="Preset name" description="Shown in ActivityMux only. Discord does not use this." value={selected.label} onChange={(event) => updatePreset((preset) => ({ ...preset, label: event.target.value }))} />
                    <TextInput label="Preview name" description="Shown in the preview card only. Discord's title is the application name from the Developer Portal." maxLength={128} value={selected.activity.name} onChange={(event) => updateActivity({ name: event.target.value })} />
                    <Select label="Activity type" description="The verb Discord puts in front of the activity." data={[{ value: "playing", label: "Playing" }, { value: "listening", label: "Listening to" }, { value: "watching", label: "Watching" }, { value: "competing", label: "Competing in" }]} value={selected.activity.activityType} onChange={(value) => value && updateActivity({ activityType: value as Preset["activity"]["activityType"] })} />
                    <Select label="Status text" description="The line Discord shows as your status. App name comes from the portal, not the preview name." data={[{ value: "name", label: "Discord app name" }, { value: "details", label: "Details" }, { value: "state", label: "State" }]} value={selected.activity.statusDisplayType} onChange={(value) => value && updateActivity({ statusDisplayType: value as Preset["activity"]["statusDisplayType"] })} />
                    <TextInput className="span-2" label="Application ID override" description="Blank uses the ID in Settings. A different ID is how this preset gets its own title and artwork." inputMode="numeric" value={selected.activity.discordApplicationId} onChange={(event) => updateActivity({ discordApplicationId: event.target.value.replace(/\D/g, "") })} />
                    <TextInput className="span-2" label="Details" description="First line under the title. Up to 128 characters." maxLength={128} value={selected.activity.details} onChange={(event) => updateActivity({ details: event.target.value })} placeholder="Contemplating the Impaler" />
                    <TextInput className="span-2" label="State" description="Second line. Up to 128 characters." maxLength={128} value={selected.activity.state} onChange={(event) => updateActivity({ state: event.target.value })} placeholder="The flame still burns" />
                  </SimpleGrid>
                  <Text c="dimmed" size="xs" mt="md">Save before Discord sees this. The application ID supplies the title and the artwork set.</Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="artwork">
                <Accordion.Control icon={<Image size={17} />}>Artwork</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput className="span-2" label="Large image" description="Asset key uploaded to that Discord application, or an image URL. This preview only loads URLs." value={selected.activity.largeImage} onChange={(event) => updateActivity({ largeImage: event.target.value })} placeholder="asset_key or https://…" />
                    <TextInput label="Large hover text" description="Tooltip people see on the large image in Discord." value={selected.activity.largeText} onChange={(event) => updateActivity({ largeText: event.target.value })} />
                    <TextInput label="Small image" description="Small badge asset key or URL. Also resolved by Discord, not by this preview." value={selected.activity.smallImage} onChange={(event) => updateActivity({ smallImage: event.target.value })} />
                    <TextInput className="span-2" label="Small hover text" description="Tooltip people see on the small image." value={selected.activity.smallText} onChange={(event) => updateActivity({ smallText: event.target.value })} />
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="timer">
                <Accordion.Control icon={<Clock3 size={17} />}>Timer</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Select label="Timer behavior" description={timerHelp[selected.activity.timer.kind]} data={[{ value: "disabled", label: "No timer" }, { value: "session", label: "Reset each activation" }, { value: "persistent", label: "Keep counting across restarts" }, { value: "fixed", label: "Start from a fixed date" }]} value={selected.activity.timer.kind} onChange={(value) => value && updateActivity({ timer: timerForKind(value as TimerMode["kind"]) })} />
                    {(selected.activity.timer.kind === "persistent" || selected.activity.timer.kind === "fixed") && (
                      <TextInput label="Start time" description="Local time. Discord counts elapsed time from this moment." type="datetime-local" value={localDateTimeValue(selected.activity.timer.startedAt)} onChange={(event) => updateActivity({ timer: { kind: selected.activity.timer.kind as "persistent" | "fixed", startedAt: Math.floor(new Date(event.target.value).getTime() / 1_000) } })} />
                    )}
                  </SimpleGrid>
                  {selected.activity.timer.kind === "persistent" && <HelpTip label="Sets the stored start to now and saves immediately."><Button mt="md" variant="light" color="gray" leftSection={<RotateCcw size={15} />} onClick={() => onResetTimer(selected.id)}>Reset to now</Button></HelpTip>}
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="buttons">
                <Accordion.Control icon={<Link2 size={17} />}>Buttons <Text span c="dimmed" size="xs">({selected.activity.buttons.length}/2)</Text></Accordion.Control>
                <Accordion.Panel>
                  <Text c="dimmed" size="sm" mb="sm">Discord shows up to two links on the profile. They are not clickable in this preview, and each URL must start with http:// or https://.</Text>
                  <Stack gap="sm">
                    {selected.activity.buttons.map((button, index) => (
                      <Group key={index} wrap="nowrap" align="flex-end">
                        <TextInput label="Label" maxLength={32} value={button.label} onChange={(event) => updateActivity({ buttons: selected.activity.buttons.map((item, buttonIndex) => buttonIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Learn more" flex={1} />
                        <TextInput label="URL" value={button.url} onChange={(event) => updateActivity({ buttons: selected.activity.buttons.map((item, buttonIndex) => buttonIndex === index ? { ...item, url: event.target.value } : item) })} placeholder="https://…" flex={2} />
                        <HelpTip label="Remove this button. Save before Discord drops it."><ActionIcon color="red" variant="light" size={36} onClick={() => updateActivity({ buttons: selected.activity.buttons.filter((_, buttonIndex) => buttonIndex !== index) })} aria-label="Remove button"><Trash2 size={15} /></ActionIcon></HelpTip>
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
          <Group justify="space-between" mb="sm"><Text className="eyebrow" c="dimmed">LOCAL PREVIEW</Text><HelpTip label="This card is drawn here. It is not a live view of your Discord profile."><Badge color="gray" variant="dot">Local only</Badge></HelpTip></Group>
          <ActivityCard preset={selected} compact />
          <Text c="dimmed" size="xs" mt="sm">Local preview. Discord uses the portal application name as the title and resolves artwork keys there.</Text>
        </aside>
      </div>
    </div>
  );
}
