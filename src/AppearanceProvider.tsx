import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import {
  applyAppearance,
  createAppearanceTheme,
  readAppearance,
  writeAppearance,
  type AestheticId,
  type Appearance,
  type ColorScheme,
} from "./appearance";

interface AppearanceContextValue {
  appearance: Appearance;
  setAesthetic: (aesthetic: AestheticId) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  toggleColorScheme: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState(readAppearance);
  const theme = useMemo(() => createAppearanceTheme(appearance.aesthetic), [appearance.aesthetic]);

  useLayoutEffect(() => {
    applyAppearance(appearance);
    writeAppearance(appearance);
  }, [appearance]);

  const value = useMemo<AppearanceContextValue>(() => ({
    appearance,
    setAesthetic: (aesthetic) => setAppearance((current) => ({ ...current, aesthetic })),
    setColorScheme: (colorScheme) => setAppearance((current) => ({ ...current, colorScheme })),
    toggleColorScheme: () => setAppearance((current) => ({
      ...current,
      colorScheme: current.colorScheme === "dark" ? "light" : "dark",
    })),
  }), [appearance]);

  return (
    <AppearanceContext.Provider value={value}>
      <MantineProvider theme={theme} forceColorScheme={appearance.colorScheme}>
        {children}
      </MantineProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used inside AppearanceProvider");
  return value;
}
