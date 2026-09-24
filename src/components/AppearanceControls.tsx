import { ActionIcon, Group, Menu, SegmentedControl, SimpleGrid, Text, UnstyledButton } from "@mantine/core";
import { Check, Moon, Sun } from "lucide-react";
import { AESTHETICS } from "../appearance";
import { useAppearance } from "../AppearanceProvider";

export function AppearanceMenu() {
  const { appearance, setAesthetic, toggleColorScheme } = useAppearance();
  const current = AESTHETICS.find((item) => item.id === appearance.aesthetic) ?? AESTHETICS[0];

  return (
    <Group className="look-switch" gap={6} wrap="nowrap">
      <Menu position="bottom-end" withinPortal width={240}>
        <Menu.Target>
          <UnstyledButton className="look-trigger" type="button" aria-label={`Look: ${current.label}`}>
            <span className={`look-swatch look-swatch--${current.id}`} />
            <span className="look-trigger__name">{current.label}</span>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {AESTHETICS.map((item) => (
            <Menu.Item
              key={item.id}
              leftSection={<span className={`look-swatch look-swatch--${item.id}`} />}
              rightSection={item.id === appearance.aesthetic ? <Check size={14} /> : null}
              onClick={() => setAesthetic(item.id)}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={appearance.colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleColorScheme}
      >
        {appearance.colorScheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </ActionIcon>
    </Group>
  );
}

export function AppearanceSettings() {
  const { appearance, setAesthetic, setColorScheme } = useAppearance();

  return (
    <>
      <SegmentedControl
        fullWidth
        color="accent"
        value={appearance.colorScheme}
        onChange={(value) => setColorScheme(value as "light" | "dark")}
        data={[{ label: "Dark", value: "dark" }, { label: "Light", value: "light" }]}
        mb="md"
      />
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        {AESTHETICS.map((item) => (
          <UnstyledButton
            key={item.id}
            type="button"
            className={item.id === appearance.aesthetic ? "look-card is-selected" : "look-card"}
            aria-pressed={item.id === appearance.aesthetic}
            onClick={() => setAesthetic(item.id)}
          >
            <span className={`look-card__plate look-swatch--${item.id}`} />
            <span className="look-card__copy">
              <strong>{item.label}</strong>
              <em>{item.blurb}</em>
            </span>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <Text c="dimmed" size="xs" mt="md">Saved on this computer. It is not included in exported config, and it does not change Discord.</Text>
    </>
  );
}
