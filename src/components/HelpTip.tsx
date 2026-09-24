import { Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

interface HelpTipProps {
  label: string;
  children: ReactNode;
  fill?: boolean;
}

export function HelpTip({ label, children, fill = false }: HelpTipProps) {
  return (
    <Tooltip label={label} multiline w={280} withArrow position="top" openDelay={300}>
      <span className={fill ? "help-tip help-tip--fill" : "help-tip"}>{children}</span>
    </Tooltip>
  );
}
