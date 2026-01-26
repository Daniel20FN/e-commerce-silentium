import { createTheme, ThemeProvider } from "@mui/material";
import { useMemo } from "react";
import { lightTheme } from "./mui_theme";

export default function CustomThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useMemo(() => {
    return createTheme(lightTheme);
  }, []);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
