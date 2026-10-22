export type ThemeMode = "light" | "dark";

export function resolveThemeMode(value: string | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}
