import { createTheme, type Theme } from "@mui/material/styles";

export function createAdminTheme(base: Theme): Theme {
  return createTheme(base, {
    components: {
      MuiButton: { defaultProps: { variant: "outlined" } },
    },
  });
}
