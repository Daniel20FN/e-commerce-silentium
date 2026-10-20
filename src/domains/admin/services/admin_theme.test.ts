import { createTheme } from "@mui/material/styles";
import { createAdminTheme } from "./admin_theme";

it("gives admin buttons an outlined default without changing the storefront theme", () => {
  const base = createTheme({
    components: { MuiButton: { defaultProps: { disableElevation: true } } },
  });
  const admin = createAdminTheme(base);
  expect(admin.components?.MuiButton?.defaultProps).toMatchObject({
    variant: "outlined",
    disableElevation: true,
  });
  expect(base.components?.MuiButton?.defaultProps?.variant).toBeUndefined();
});
