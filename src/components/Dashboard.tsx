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
    case "manual": return "Pinned manual override";
    case "processRule": return `${snapshot.resolution.reason.ruleLabel} · priority ${snapshot.resolution.reason.priority}`;
    case "default": return "Default preset";
    case "none": return "No rule or default matched";
  }
}

const connectionLabels = {
  setupRequired: { label: "Setup required", color: "yellow" },
  connecting: { label: "Connecting", color: "blue" },
  connected: { label: "Signal live", color: "teal" },
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
      <header className="screen-header hero-header">
        <Box>
          <Badge variant="light" color="ultraviolet" size="sm" mb="sm">CURRENT</Badge>
          <Title order={1}>Current presence</Title>
          <Text c="dimmed" mt="xs">Published to Discord.</Text>
        </Box>
        <Badge
          className="connection-pill"
          color={connection.color}
          variant="light"
          size="lg"
          radius="xl"
          leftSection={<Radio size={14} />}
        >
          {connection.label}
        </Badge>
      </header>

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
            <Text size="sm">Required before ActivityMux can publish.</Text>
            <Button variant="light" color="yellow" size="xs" rightSection={<Settings2 size={15} />} onClick={onNavigateSettings}>Open settings</Button>
          </Group>
        </Alert>
      )}

      <SimpleGrid className="dashboard-grid" cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper className="glass-panel live-panel" p="xl" radius="xl">
          <Group justify="space-between" mb="lg">
            <Box>
              <Text className="eyebrow" c="dimmed">PREVIEW</Text>
              <Title order={2} mt={4}>{resolvedPreset?.label ?? "Nothing selected"}</Title>
            </Box>
            {isPinned && <Badge variant="gradient" gradient={{ from: "ultraviolet.5", to: "pink.6" }} leftSection={<Pin size={12} />}>Pinned</Badge>}
          </Group>

          <ActivityCard preset={resolvedPreset} />

          <Paper className="resolution-box" radius="lg" p="md" mt="lg">
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon variant="gradient" gradient={{ from: "ultraviolet.5", to: "signal.5" }} radius="md">
                <Sparkles size={16} />
              </ThemeIcon>
              <Box>
                <Text fw={700} size="sm">Selected by</Text>
                <Text c="dimmed" size="sm">{reasonText(snapshot)}</Text>
                {snapshot.resolution.reason.kind === "processRule" && (
                  <Text c="ultraviolet.2" size="xs" mt={4}>Matched {snapshot.resolution.reason.matchedProcesses.join(", ")}</Text>
                )}
              </Box>
            </Group>
          </Paper>

          {snapshot.lastError && <Alert color="red" variant="light" icon={<AlertTriangle size={16} />} mt="md">{snapshot.lastError}</Alert>}
        </Paper>

        <Stack gap="lg">
          <Paper className="glass-panel override-panel" p="xl" radius="xl">
            <Group gap="sm" mb="xs">
              <ThemeIcon variant="light" color="ultraviolet" radius="md"><Pin size={17} /></ThemeIcon>
              <Box>
                <Text className="eyebrow" c="dimmed">OVERRIDE</Text>
                <Title order={3}>Manual override</Title>
              </Box>
            </Group>
            <Select
              label="Preset"
              placeholder="Choose a preset"
              data={config.presets.map((preset) => ({ value: preset.id, label: preset.label }))}
              value={selection}
              onChange={(value) => setSelection(value ?? "")}
              searchable
              mb="md"
            />
            <SimpleGrid cols={2} spacing="sm">
              <Button
                variant="gradient"
                gradient={{ from: "ultraviolet.5", to: "ultraviolet.7" }}
                leftSection={<Pin size={16} />}
                disabled={!selection}
                loading={busy}
                onClick={() => updateOverride(selection)}
              >
                {isPinned ? "Change pin" : "Pin preset"}
              </Button>
              <Button variant="light" color="gray" leftSection={<PinOff size={16} />} disabled={!isPinned || busy} onClick={() => updateOverride(null)}>
                Release
              </Button>
            </SimpleGrid>
          </Paper>

          <Paper className="routing-order" p="lg" radius="xl">
            <Group gap="sm" mb="md">
              <Workflow size={17} />
              <Text fw={700} size="sm">Resolution order</Text>
            </Group>
            <Timeline active={isPinned ? 0 : 1} bulletSize={22} lineWidth={2} color="ultraviolet">
              <Timeline.Item bullet={<Check size={12} />} title="Manual override"><Text c="dimmed" size="xs">Always wins while pinned</Text></Timeline.Item>
              <Timeline.Item title="Process priority"><Text c="dimmed" size="xs">Highest matching rule</Text></Timeline.Item>
              <Timeline.Item title="Default preset"><Text c="dimmed" size="xs">Used when no rule matches</Text></Timeline.Item>
              <Timeline.Item title="Clear"><Text c="dimmed" size="xs">No fallback configured</Text></Timeline.Item>
            </Timeline>
          </Paper>
        </Stack>
      </SimpleGrid>
    </div>
  );
}
