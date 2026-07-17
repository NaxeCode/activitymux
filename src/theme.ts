import { createTheme, type MantineColorsTuple } from "@mantine/core";

const ultraviolet: MantineColorsTuple = [
  "#f3f0ff",
  "#e8e0ff",
  "#d0bcff",
  "#b48cff",
  "#9d63ff",
  "#8d47fa",
  "#7f36ee",
  "#6c2bd4",
  "#5b25ad",
  "#4b218b",
];

const signal: MantineColorsTuple = [
  "#e6fffb",
  "#c8fff5",
  "#92fce8",
  "#58f6da",
  "#2be7ca",
  "#14cdb2",
  "#08aa93",
  "#078878",
  "#086d61",
  "#07594f",
];

export const activityMuxTheme = createTheme({
  colors: { ultraviolet, signal },
  primaryColor: "ultraviolet",
  primaryShade: 5,
  defaultRadius: "md",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
  headings: {
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: "650",
  },
  cursorType: "pointer",
  focusRing: "auto",
});
