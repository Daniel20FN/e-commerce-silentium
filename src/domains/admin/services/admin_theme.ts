import { createTheme, type Theme } from "@mui/material/styles";

export function createAdminTheme(base: Theme): Theme {
  const headingFont = { fontFamily: base.typography.fontFamily };
  return createTheme(base, {
    typography: {
      h1: headingFont,
      h2: headingFont,
      h3: headingFont,
      h4: headingFont,
      h5: headingFont,
      h6: headingFont,
    },
    components: {
      MuiButton: { defaultProps: { variant: "outlined" } },
    },
  });
}
