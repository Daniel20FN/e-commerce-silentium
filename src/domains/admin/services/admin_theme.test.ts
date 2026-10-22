import { createTheme } from "@mui/material/styles";
import { createAdminTheme } from "./admin_theme";

it("keeps admin portal headings in the operational font without changing storefront headings", () => {
  const base = createTheme({
    typography: {
      fontFamily: "Manrope",
      h6: { fontFamily: "Cormorant Garamond" },
    },
  });
  const admin = createAdminTheme(base);
  for (const heading of [
    admin.typography.h1,
    admin.typography.h2,
    admin.typography.h3,
    admin.typography.h4,
    admin.typography.h5,
    admin.typography.h6,
  ]) {
    expect(heading.fontFamily).toBe("Manrope");
  }
  expect(base.typography.h6.fontFamily).toBe("Cormorant Garamond");
});

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
