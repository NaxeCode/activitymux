import { useEffect, useMemo, useState } from "react";
import { Box, Button, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { Clock3, ImageOff } from "lucide-react";
import type { Preset } from "../types";

interface ActivityCardProps {
  preset: Preset | null;
  compact?: boolean;
}

const activityVerbs = {
  playing: "Playing",
  listening: "Listening to",
  watching: "Watching",
  competing: "Competing in",
} as const;

function formatElapsed(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const remainingSeconds = safe % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m elapsed`;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")} elapsed`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} elapsed`;
}

export function ActivityCard({ preset, compact = false }: ActivityCardProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = useMemo(() => {
    if (!preset) return null;
    const timer = preset.activity.timer;
    if (timer.kind === "disabled") return null;
    if (timer.kind === "session") return "Starts when this preset activates";
    return formatElapsed(now / 1_000 - timer.startedAt);
  }, [now, preset]);

  if (!preset) {
    return (
      <Paper className="activity-card activity-card--empty" radius="lg" p="lg">
        <Group wrap="nowrap">
          <ThemeIcon variant="light" color="gray" size="lg"><ImageOff size={20} /></ThemeIcon>
          <Box>
            <Text fw={700} size="sm">No presence selected</Text>
            <Text c="dimmed" size="xs">Add a default preset or pin one manually.</Text>
          </Box>
        </Group>
      </Paper>
    );
  }

  const { activity } = preset;
  const imageIsUrl = /^https?:\/\//i.test(activity.largeImage);

  return (
    <Paper className={`activity-card${compact ? " activity-card--compact" : ""}`} radius="lg" p={compact ? "md" : "lg"}>
      <Text className="activity-card__eyebrow" c="dimmed" size="xs">
        {activityVerbs[activity.activityType]} {activity.name}
      </Text>
      <Group className="activity-card__body" mt="sm" align="center" wrap="nowrap">
        <Box className="activity-card__art">
          {imageIsUrl ? <img src={activity.largeImage} alt="" /> : <div className="activity-card__fallback"><span>AM</span></div>}
          {activity.smallImage && <span className="activity-card__small" />}
        </Box>
        <Stack className="activity-card__copy" gap={2}>
          <Text fw={750} size={compact ? "sm" : "md"} lineClamp={1}>{activity.details || preset.label}</Text>
          {activity.state && <Text c="gray.4" size="sm" lineClamp={1}>{activity.state}</Text>}
          {elapsed && <Group gap={5} mt={2}><Clock3 size={13} /><Text c="dimmed" size="xs">{elapsed}</Text></Group>}
        </Stack>
      </Group>
      {activity.buttons.length > 0 && (
        <Group className="activity-card__buttons" grow mt="md" gap="xs">
          {activity.buttons.map((button, index) => <Button key={`${button.label}-${index}`} variant="light" color="gray" size="xs" disabled>{button.label}</Button>)}
        </Group>
      )}
    </Paper>
  );
}
