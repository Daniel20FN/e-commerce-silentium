import { resolveThemeMode } from "./theme_mode";
it("defaults to light and accepts only the explicit persisted dark preference", () => {
  expect(resolveThemeMode("dark")).toBe("dark");
  for (const value of [undefined, "", "invalid", "Dark", "light"])
    expect(resolveThemeMode(value)).toBe("light");
});
