import { createTheme, ThemeProvider } from "@mui/material";
import { useMemo } from "react";
import { useThemeMode } from "./theme_context";
import { darkTheme, lightTheme } from "./mui_theme";

export default function CustomThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { themeMode } = useThemeMode();

  const theme = useMemo(() => {
    const themeOptions = themeMode === "dark" ? darkTheme : lightTheme;
    return createTheme(themeOptions);
  }, [themeMode]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
