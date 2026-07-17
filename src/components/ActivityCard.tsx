import { useEffect, useMemo, useState } from "react";
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
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")} elapsed`;
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
      <div className="activity-card activity-card--empty">
        <ImageOff size={24} />
        <div>
          <strong>No presence selected</strong>
          <span>Add a default preset or pin one manually.</span>
        </div>
      </div>
    );
  }

  const { activity } = preset;
  const imageIsUrl = /^https?:\/\//i.test(activity.largeImage);
  return (
    <div className={`activity-card${compact ? " activity-card--compact" : ""}`}>
      <div className="activity-card__eyebrow">
        {activityVerbs[activity.activityType]} {activity.name}
      </div>
      <div className="activity-card__body">
        <div className="activity-card__art">
          {imageIsUrl ? (
            <img src={activity.largeImage} alt="" />
          ) : (
            <div className="activity-card__fallback">AM</div>
          )}
          {activity.smallImage && <span className="activity-card__small">●</span>}
        </div>
        <div className="activity-card__copy">
          <strong>{activity.details || preset.label}</strong>
          {activity.state && <span>{activity.state}</span>}
          {elapsed && (
            <span className="activity-card__timer">
              <Clock3 size={13} /> {elapsed}
            </span>
          )}
        </div>
      </div>
      {activity.buttons.length > 0 && (
        <div className="activity-card__buttons">
          {activity.buttons.map((button, index) => (
            <button type="button" key={`${button.label}-${index}`} disabled>
              {button.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
