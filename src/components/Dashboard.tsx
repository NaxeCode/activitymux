import { useMemo, useState } from "react";
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
  Text,
  ThemeIcon,
  Timeline,
  Title,
} from "@mantine/core";
import { AlertTriangle, Check, Pin, PinOff, Radio, Settings2, Sparkles, Workflow } from "lucide-react";
import { HelpTip } from "./HelpTip";
import { connectionHelp } from "../explain";
import type { AppConfig, ServiceSnapshot } from "../types";
import { ActivityCard } from "./ActivityCard";

interface DashboardProps {
  config: AppConfig;
  snapshot: ServiceSnapshot;
  onManualOverride: (presetId: string | null) => Promise<void>;
  onNavigateSettings: () => void;
}

function reasonText(snapshot: ServiceSnapshot) {
  switch (snapshot.resolution.reason.kind) {
    case "manual": return "Pinned. Running programs are ignored until you release it.";
    case "processRule": return `${snapshot.resolution.reason.ruleLabel} matched at priority ${snapshot.resolution.reason.priority}.`;
    case "default": return "No pin and no matching rule, so the default preset is on.";
    case "none": return "Nothing is pinned, no rule matched, and there is no default. Presence is cleared.";
  }
}

function activeStep(snapshot: ServiceSnapshot) {
  switch (snapshot.resolution.reason.kind) {
    case "manual": return 0;
    case "processRule": return 1;
    case "default": return 2;
    case "none": return 3;
  }
}

const connectionLabels = {
  setupRequired: { label: "Setup required", color: "yellow" },
  connecting: { label: "Connecting", color: "blue" },
  connected: { label: "Signal live", color: "signal" },
  disconnected: { label: "Disconnected", color: "red" },
} as const;

export function Dashboard({ config, snapshot, onManualOverride, onNavigateSettings }: DashboardProps) {
  const [selection, setSelection] = useState(config.manualOverridePresetId ?? config.presets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const resolvedPreset = useMemo(
    () => config.presets.find((preset) => preset.id === snapshot.resolution.presetId) ?? null,
    [config.presets, snapshot.resolution.presetId],
  );
  const isPinned = config.manualOverridePresetId !== null;
  const connection = connectionLabels[snapshot.connection];

  const updateOverride = async (presetId: string | null) => {
    setBusy(true);
    try {
      await onManualOverride(presetId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen dashboard">

      {snapshot.connection === "setupRequired" && (
        <Alert
          className="setup-banner"
          color="yellow"
          variant="light"
          icon={<AlertTriangle size={20} />}
          title="Add a Discord application ID"
          withCloseButton={false}
        >
          <Group justify="space-between" align="center">
            <Text size="sm">Discord uses that application's name as the title. No bot token is needed.</Text>
            <Button variant="light" color="yellow" size="xs" rightSection={<Settings2 size={15} />} onClick={onNavigateSettings}>Open settings</Button>
          </Group>
        </Alert>
      )}

      <SimpleGrid className="dashboard-grid" cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper className="glass-panel live-panel" p="lg" radius="xl">
          <Group justify="space-between" mb="md" wrap="nowrap">
            <Box>
              <Text className="eyebrow tone-signal">DISCORD IS USING</Text>
              <Title order={3} mt={2}>{resolvedPreset?.label ?? "Nothing selected"}</Title>
            </Box>
            <HelpTip label={connectionHelp[snapshot.connection]}>
              <Badge className="connection-pill" color={connection.color} variant="light" size="sm" radius="xl" leftSection={<Radio size={12} />}>{connection.label}</Badge>
            </HelpTip>
          </Group>

          <ActivityCard preset={resolvedPreset} />
          <Text c="dimmed" size="xs" mt="sm">Local preview. Discord's title comes from the application name in the Developer Portal, not from this card.</Text>

          <Paper className="resolution-box" radius="lg" p="md" mt="lg">
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon variant="gradient" gradient={{ from: "accent.5", to: "signal.5" }} radius="md">
                <Sparkles size={16} />
              </ThemeIcon>
              <Box>
                <Text fw={700} size="sm">Selected by</Text>
                <Text c="dimmed" size="sm">{reasonText(snapshot)}</Text>
                {snapshot.resolution.reason.kind === "processRule" && (
                  <Text className="tone-accent" size="xs" mt={4}>Matched {snapshot.resolution.reason.matchedProcesses.join(", ")}</Text>
                )}
              </Box>
            </Group>
          </Paper>

          {snapshot.lastError && <Alert color="red" variant="light" icon={<AlertTriangle size={16} />} mt="md">{snapshot.lastError}</Alert>}
        </Paper>

        <Stack gap="lg">
          <Paper className="glass-panel override-panel" p="lg" radius="xl">
            <Group gap="sm" mb="xs">
              <ThemeIcon variant="light" color="accent" radius="md"><Pin size={17} /></ThemeIcon>
              <Box>
                <Text className="eyebrow" c="dimmed">OVERRIDE</Text>
                <Title order={3}>Manual override</Title>
              </Box>
            </Group>
            <Select
              label="Preset"
              description="Forces this activity until you release it. Process rules are ignored."
              placeholder="Choose a preset"
              data={config.presets.map((preset) => ({ value: preset.id, label: preset.label }))}
              value={selection}
              onChange={(value) => setSelection(value ?? "")}
              searchable
              mb="md"
            />
            <SimpleGrid cols={2} spacing="sm">
              <HelpTip fill label="Save this pin immediately. It stays on across restarts until you release it.">
                <Button
                  variant="gradient"
                  gradient={{ from: "accent.5", to: "accent.7" }}
                  leftSection={<Pin size={16} />}
                  disabled={!selection}
                  loading={busy}
                  onClick={() => updateOverride(selection)}
                >
                  {isPinned ? "Change pin" : "Pin preset"}
                </Button>
              </HelpTip>
              <HelpTip fill label="Remove the pin now. The highest matching rule, or the default, takes over.">
                <Button variant="light" color="gray" leftSection={<PinOff size={16} />} disabled={!isPinned || busy} onClick={() => updateOverride(null)}>
                  Release
                </Button>
              </HelpTip>
            </SimpleGrid>
          </Paper>

          <Paper className="routing-order" p="lg" radius="xl">
            <Group gap="sm" mb="md">
              <Workflow size={17} />
              <Text fw={700} size="sm">Resolution order</Text>
            </Group>
            <Timeline active={activeStep(snapshot)} bulletSize={22} lineWidth={2} color="accent">
              <Timeline.Item bullet={<Check size={12} />} title="Manual pin"><Text c="dimmed" size="xs">Forces one preset. Open programs do not matter.</Text></Timeline.Item>
              <Timeline.Item title="Process rule"><Text c="dimmed" size="xs">Highest matching priority number wins. Ties keep the first saved rule.</Text></Timeline.Item>
              <Timeline.Item title="Default preset"><Text c="dimmed" size="xs">Used when nothing is pinned and no rule matches.</Text></Timeline.Item>
              <Timeline.Item title="Clear"><Text c="dimmed" size="xs">Removes the activity when no default is set.</Text></Timeline.Item>
            </Timeline>
          </Paper>
        </Stack>
      </SimpleGrid>
    </div>
  );
}
