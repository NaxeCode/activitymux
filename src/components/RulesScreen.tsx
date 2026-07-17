import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Pill,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { Plus, Power, Route, Trash2 } from "lucide-react";
import type { AppConfig, ProcessRule } from "../types";
import { ProcessPicker } from "./ProcessPicker";

interface RulesScreenProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}

const NEW_RULE = "__new_rule__";

export function RulesScreen({ config, onChange }: RulesScreenProps) {
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  const updateRule = (id: string, patch: Partial<ProcessRule>) => {
    onChange({ ...config, rules: config.rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) });
  };

  const addProcess = (name: string) => {
    if (pickerTarget === NEW_RULE) {
      const preset = config.presets[0];
      if (!preset) return;
      const rule: ProcessRule = {
        id: crypto.randomUUID(),
        label: `When ${name} is running`,
        enabled: true,
        priority: 100,
        presetId: preset.id,
        processNames: [name],
        matchMode: "any",
      };
      onChange({ ...config, rules: [...config.rules, rule] });
      return;
    }
    const rule = config.rules.find((candidate) => candidate.id === pickerTarget);
    if (!rule || rule.processNames.some((process) => process.toLowerCase() === name.toLowerCase())) return;
    updateRule(rule.id, { processNames: [...rule.processNames, name] });
  };

  const sortedRules = [...config.rules].sort((left, right) => right.priority - left.priority);

  return (
    <div className="screen">
      <header className="screen-header hero-header">
        <Box>
          <Badge variant="light" color="ultraviolet" size="sm" mb="sm">RULES</Badge>
          <Title order={1}>Process rules</Title>
          <Text c="dimmed" mt="xs">Higher priority wins.</Text>
        </Box>
        <Button variant="gradient" gradient={{ from: "ultraviolet.5", to: "ultraviolet.7" }} leftSection={<Plus size={16} />} disabled={config.presets.length === 0} onClick={() => setPickerTarget(NEW_RULE)}>Add rule</Button>
      </header>

      <Stack className="rule-stack" gap="md">
        {sortedRules.map((rule, index) => (
          <Paper className={`glass-panel rule-card${rule.enabled ? "" : " is-disabled"}`} radius="xl" p="lg" key={rule.id}>
            <Group justify="space-between" align="flex-start" mb="md">
              <Group gap="md" align="center">
                <ThemeIcon variant={rule.enabled ? "gradient" : "light"} gradient={{ from: "ultraviolet.4", to: "signal.5" }} color="gray" size="lg" radius="md">
                  <Route size={18} />
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text className="eyebrow" c="dimmed">RULE {String(index + 1).padStart(2, "0")}</Text>
                    <Badge size="xs" variant="light" color={rule.enabled ? "teal" : "gray"}>{rule.enabled ? "Active" : "Paused"}</Badge>
                  </Group>
                  <Text fw={700} mt={2}>{rule.label}</Text>
                </Box>
              </Group>
              <Group gap="sm">
                <Switch checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.currentTarget.checked })} color="teal" aria-label={rule.enabled ? "Disable rule" : "Enable rule"} />
                <Tooltip label="Delete route"><ActionIcon color="red" variant="light" onClick={() => onChange({ ...config, rules: config.rules.filter((candidate) => candidate.id !== rule.id) })}><Trash2 size={15} /></ActionIcon></Tooltip>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <TextInput label="Rule name" value={rule.label} onChange={(event) => updateRule(rule.id, { label: event.target.value })} />
              <NumberInput label="Priority" value={rule.priority} onChange={(value) => updateRule(rule.id, { priority: Number(value) || 0 })} allowDecimal={false} />
              <Select label="Publish preset" data={config.presets.map((preset) => ({ value: preset.id, label: preset.label }))} value={rule.presetId} onChange={(value) => value && updateRule(rule.id, { presetId: value })} />
            </SimpleGrid>

            <Paper className="rule-logic" radius="lg" p="md" mt="md">
              <Group gap="sm">
                <Text c="dimmed" size="sm">When</Text>
                <Select
                  className="logic-select"
                  size="xs"
                  data={[{ value: "any", label: "any selected process runs" }, { value: "all", label: "all selected processes run" }]}
                  value={rule.matchMode}
                  onChange={(value) => value && updateRule(rule.id, { matchMode: value as ProcessRule["matchMode"] })}
                />
                <Text c="dimmed" size="sm">publish</Text>
                <Badge color="ultraviolet" variant="light">{config.presets.find((preset) => preset.id === rule.presetId)?.label ?? "Missing preset"}</Badge>
              </Group>
            </Paper>

            <Group mt="md" gap="xs">
              <Pill.Group>
                {rule.processNames.map((process) => (
                  <Pill key={process} withRemoveButton={rule.processNames.length > 1} onRemove={() => updateRule(rule.id, { processNames: rule.processNames.filter((candidate) => candidate !== process) })}>{process}</Pill>
                ))}
              </Pill.Group>
              <Button size="compact-sm" variant="subtle" color="gray" leftSection={<Plus size={13} />} onClick={() => setPickerTarget(rule.id)}>Add process</Button>
            </Group>
          </Paper>
        ))}

        {config.rules.length === 0 && (
          <Paper className="glass-panel empty-state" radius="xl" p={48}>
            <ThemeIcon variant="light" color="ultraviolet" size={54} radius="xl" mx="auto"><Power size={24} /></ThemeIcon>
            <Title order={2} mt="md">No rules</Title>
            <Text c="dimmed" mt="xs" mb="lg">Add a process and preset.</Text>
            <Button variant="light" color="ultraviolet" leftSection={<Plus size={16} />} disabled={config.presets.length === 0} onClick={() => setPickerTarget(NEW_RULE)}>Add rule</Button>
          </Paper>
        )}
      </Stack>

      <ProcessPicker open={pickerTarget !== null} onClose={() => setPickerTarget(null)} onSelect={addProcess} />
    </div>
  );
}
