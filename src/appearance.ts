import { createTheme, type MantineColorsTuple } from "@mantine/core";

export const AESTHETIC_IDS = ["signal", "storybook", "loveme", "matrix", "tarot", "hearteyes"] as const;
export type AestheticId = (typeof AESTHETIC_IDS)[number];
export type ColorScheme = "light" | "dark";

export interface Appearance {
  aesthetic: AestheticId;
  colorScheme: ColorScheme;
}

export const APPEARANCE_STORAGE_KEY = "activitymux.appearance";

export const DEFAULT_APPEARANCE: Appearance = {
  aesthetic: "signal",
  colorScheme: "dark",
};

const SANS = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const SERIF = "Palatino, 'Palatino Linotype', 'Iowan Old Style', Georgia, serif";
const MONO = "ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";
const ROUNDED = "ui-rounded, 'Segoe UI', Inter, ui-sans-serif, system-ui, sans-serif";

export interface AestheticDefinition {
  id: AestheticId;
  label: string;
  blurb: string;
  fontFamily: string;
  headingFamily: string;
  radius: "xs" | "sm" | "md" | "lg" | "xl";
  primaryShade: { light: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; dark: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
  accent: MantineColorsTuple;
  signal: MantineColorsTuple;
  dark: MantineColorsTuple;
}

function shades(values: [string, string, string, string, string, string, string, string, string, string]): MantineColorsTuple {
  return values;
}

export const AESTHETICS: readonly AestheticDefinition[] = [
  {
    id: "signal",
    label: "Signal",
    blurb: "Violet glass and cyan status",
    fontFamily: SANS,
    headingFamily: SANS,
    radius: "md",
    primaryShade: { light: 6, dark: 5 },
    accent: shades(["#f3f0ff", "#e8e0ff", "#d0bcff", "#b48cff", "#9d63ff", "#8d47fa", "#7f36ee", "#6c2bd4", "#5b25ad", "#4b218b"]),
    signal: shades(["#e6fffb", "#c8fff5", "#92fce8", "#58f6da", "#2be7ca", "#14cdb2", "#08aa93", "#078878", "#086d61", "#07594f"]),
    dark: shades(["#c9c6d8", "#a9a6b8", "#8c8fa3", "#5c5670", "#3a354c", "#2a2738", "#1c1a28", "#12111a", "#0c0b12", "#07080d"]),
  },
  {
    id: "storybook",
    label: "Storybook",
    blurb: "Night pages, rabbits, and stars",
    fontFamily: SERIF,
    headingFamily: SERIF,
    radius: "lg",
    primaryShade: { light: 7, dark: 5 },
    accent: shades(["#f4f7fb", "#e4edf8", "#c5d7ef", "#9bb8e0", "#6d97cc", "#4d7dba", "#37659e", "#2c527f", "#234266", "#1a334f"]),
    signal: shades(["#fff8e8", "#f8ecc8", "#f0d992", "#e4c15a", "#d4a63a", "#b8862a", "#946a1e", "#6e4e16", "#4c3510", "#2e200a"]),
    dark: shades(["#f4efe6", "#d9d0c0", "#b7c3d4", "#4d627f", "#243652", "#16263c", "#101e32", "#0c1828", "#081220", "#07111f"]),
  },
  {
    id: "loveme",
    label: "Love me",
    blurb: "Red text on black",
    fontFamily: SANS,
    headingFamily: SERIF,
    radius: "md",
    primaryShade: { light: 6, dark: 5 },
    accent: shades(["#fff1f1", "#ffd6d6", "#ffaaaa", "#ff6d6d", "#ff3b3b", "#f01414", "#cc0d0d", "#a10c0c", "#6e0909", "#3d0505"]),
    signal: shades(["#fff5f0", "#ffd8cc", "#ffb199", "#ff815f", "#ff5a38", "#f03a1a", "#cc2c12", "#a1220e", "#6e1609", "#3d0c05"]),
    dark: shades(["#ffe8e8", "#ffb4b4", "#ff8a8a", "#7a3030", "#4a1212", "#2a0808", "#1c0505", "#140303", "#0c0202", "#070000"]),
  },
  {
    id: "matrix",
    label: "Matrix",
    blurb: "Green terminal rain",
    fontFamily: MONO,
    headingFamily: MONO,
    radius: "xs",
    primaryShade: { light: 7, dark: 6 },
    accent: shades(["#e9ffef", "#c8ffd6", "#8dffae", "#4dff84", "#1fe86a", "#12c456", "#0c9a43", "#087534", "#055226", "#032e15"]),
    signal: shades(["#edfff8", "#c9ffe9", "#8dffd4", "#4dffe0", "#1af0c8", "#12c9a4", "#0c9a7c", "#087560", "#055244", "#032e26"]),
    dark: shades(["#d7ffe4", "#9dffc0", "#6ee7a0", "#2f6b48", "#163828", "#0d2419", "#0a1c13", "#07140e", "#040c08", "#020604"]),
  },
  {
    id: "tarot",
    label: "Tarot",
    blurb: "Purple cards and bone ink",
    fontFamily: SERIF,
    headingFamily: SERIF,
    radius: "sm",
    primaryShade: { light: 6, dark: 5 },
    accent: shades(["#f7f1ff", "#eadcff", "#d4b8ff", "#b98cff", "#9d63f0", "#7c3ed0", "#642eab", "#4d2484", "#35185c", "#1e0e36"]),
    signal: shades(["#fbf6ea", "#f3ead8", "#e6d3a1", "#d4b56d", "#c49a45", "#a47b2e", "#7d5c22", "#5c4318", "#3d2c10", "#241a09"]),
    dark: shades(["#f3ead8", "#d9cbb6", "#cbb6e8", "#5c4578", "#3a264c", "#261433", "#1c0e26", "#140818", "#100614", "#0c0410"]),
  },
  {
    id: "hearteyes",
    label: "Heart eyes",
    blurb: "Pink manga halftone",
    fontFamily: ROUNDED,
    headingFamily: ROUNDED,
    radius: "xl",
    primaryShade: { light: 6, dark: 4 },
    accent: shades(["#fff0f7", "#ffd6ea", "#ffadd4", "#ff7dba", "#ff4f9a", "#f22784", "#d1126c", "#a30e55", "#6e0a3a", "#3d0620"]),
    signal: shades(["#fff0f8", "#ffd0ea", "#ffa3d4", "#ff78be", "#ff4fa8", "#e43490", "#c21d78", "#96155e", "#640e3f", "#380822"]),
    dark: shades(["#ffe8f3", "#ffc2de", "#ff8fc4", "#7a3a58", "#4a2034", "#2e1222", "#220d18", "#1a0b12", "#12060c", "#0c0408"]),
  },
];

export function aestheticById(id: AestheticId): AestheticDefinition {
  return AESTHETICS.find((item) => item.id === id) ?? AESTHETICS[0];
}

export function createAppearanceTheme(id: AestheticId) {
  const aesthetic = aestheticById(id);
  return createTheme({
    colors: { accent: aesthetic.accent, signal: aesthetic.signal, dark: aesthetic.dark },
    primaryColor: "accent",
    primaryShade: aesthetic.primaryShade,
    autoContrast: true,
    defaultRadius: aesthetic.radius,
    fontFamily: aesthetic.fontFamily,
    fontFamilyMonospace: MONO,
    headings: { fontFamily: aesthetic.headingFamily, fontWeight: "650" },
    cursorType: "pointer",
    focusRing: "auto",
  });
}

export function readAppearance(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "") as Partial<Appearance>;
    return {
      aesthetic: AESTHETIC_IDS.includes(raw.aesthetic as AestheticId) ? (raw.aesthetic as AestheticId) : DEFAULT_APPEARANCE.aesthetic,
      colorScheme: raw.colorScheme === "light" || raw.colorScheme === "dark" ? raw.colorScheme : DEFAULT_APPEARANCE.colorScheme,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(appearance: Appearance) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
}

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement;
  root.dataset.aesthetic = appearance.aesthetic;
  root.dataset.scheme = appearance.colorScheme;
  root.dataset.mantineColorScheme = appearance.colorScheme;
  root.style.colorScheme = appearance.colorScheme;
}
