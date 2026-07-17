import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Box, Center, Group, Loader, Modal, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { AlertTriangle, Search } from "lucide-react";
import { api } from "../api";
import type { RunningProcess } from "../types";

interface ProcessPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}

export function ProcessPicker({ open, onClose, onSelect }: ProcessPickerProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api.listProcesses()
      .then(setProcesses)
      .catch((reason: unknown) => setError(String(reason)))
      .finally(() => setLoading(false));
  }, [open]);

  const visible = useMemo(() => {
    const unique = new Map<string, RunningProcess>();
    for (const process of processes) {
      const key = process.name.toLowerCase();
      if (!unique.has(key)) unique.set(key, process);
    }
    const normalizedQuery = query.trim().toLowerCase();
    return [...unique.values()]
      .filter((process) => !normalizedQuery || process.name.toLowerCase().includes(normalizedQuery) || process.executable.toLowerCase().includes(normalizedQuery))
      .slice(0, 100);
  }, [processes, query]);

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={<Box><Text className="eyebrow" c="dimmed">PROCESSES</Text><Text fw={750} size="lg">Select process</Text></Box>}
      size="lg"
      radius="xl"
      centered
      overlayProps={{ backgroundOpacity: 0.72, blur: 8 }}
      classNames={{ content: "process-modal", header: "process-modal__header" }}
    >
      <TextInput
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by process or path"
        leftSection={<Search size={16} />}
        size="md"
        mb="md"
      />
      <ScrollArea.Autosize mah={440} type="hover">
        {loading && <Center py={48}><Stack align="center" gap="sm"><Loader size="sm" /><Text c="dimmed" size="sm">Reading processes…</Text></Stack></Center>}
        {error && <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert>}
        {!loading && !error && (
          <Stack gap={4}>
            {visible.map((process) => (
              <UnstyledButton
                className="process-result"
                type="button"
                key={`${process.name}-${process.pid}`}
                onClick={() => { onSelect(process.name); onClose(); }}
              >
                <Group wrap="nowrap">
                  <Avatar color="ultraviolet" variant="light" radius="md">{process.name.slice(0, 1).toUpperCase()}</Avatar>
                  <Box className="process-result__copy">
                    <Text fw={650} size="sm">{process.name}</Text>
                    <Text c="dimmed" size="xs" truncate>{process.executable || `PID ${process.pid}`}</Text>
                  </Box>
                </Group>
              </UnstyledButton>
            ))}
            {visible.length === 0 && <Text c="dimmed" size="sm" ta="center" py={48}>No matching processes.</Text>}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </Modal>
  );
}
