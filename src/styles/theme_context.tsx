import { setClientCookie } from "@/utils/cookies_helper";
import { ReactNode, createContext, useContext, useState } from "react";
import type { ThemeMode } from "./theme_mode";
export type { ThemeMode } from "./theme_mode";
interface ThemeContextProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);
export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useThemeMode must be used within a ThemeProvider");
  return context;
};
interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}
export const ThemeProvider = ({
  children,
  initialTheme = "light",
}: ThemeProviderProps) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialTheme);
  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: (mode) => {
          setClientCookie("theme", mode);
          setThemeModeState(mode);
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
