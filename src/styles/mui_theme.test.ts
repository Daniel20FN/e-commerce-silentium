import { createTheme, getContrastRatio } from "@mui/material/styles";
import { brandColors } from "./brand_colors";
import { darkTheme, lightTheme } from "./mui_theme";

describe("Silentium brand themes", () => {
  it.each([lightTheme, darkTheme])(
    "keeps readable text and actions in $palette.mode mode",
    (options) => {
      const theme = createTheme(options);
      for (const background of [
        theme.palette.background.default,
        theme.palette.background.paper,
      ]) {
        expect(
          getContrastRatio(theme.palette.text.primary, background),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          getContrastRatio(theme.palette.text.secondary, background),
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const action of [
        theme.palette.primary,
        theme.palette.secondary,
        theme.palette.info,
      ]) {
        expect(
          getContrastRatio(action.contrastText, action.main),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("uses the official light palette and a brown-led dark adaptation with official celeste accents", () => {
    const light = createTheme(lightTheme);
    const dark = createTheme(darkTheme);
    expect(light.palette.background.default).toBe(brandColors.ivory);
    expect(light.palette.primary.main).toBe(brandColors.brown);
    expect(light.palette.secondary.main).toBe(brandColors.blue);
    expect(dark.palette.primary.main).toBe(brandColors.blue);
    expect(dark.palette.secondary.main).toBe(brandColors.beige);
    expect(dark.palette.background.default).toBe(brandColors.darkCanvas);
    expect(dark.palette.background.default).toBe("#211B17");
    expect(dark.palette.background.paper).toBe("#302720");
    for (const foreground of [brandColors.ivory, brandColors.darkMuted]) {
      expect(
        getContrastRatio(foreground, brandColors.darkRaised),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      getContrastRatio(brandColors.brown, brandColors.blue),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      getContrastRatio(brandColors.lightMuted, brandColors.lightSurface),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
