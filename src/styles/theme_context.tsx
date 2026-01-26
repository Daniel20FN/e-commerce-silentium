import { getClientCookie, setClientCookie } from "@/utils/cookies_helper";
import { ReactNode, createContext, useContext, useState } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

function getInitialTheme(): ThemeMode {
  if (typeof window !== "undefined") {
    const cookieTheme = getClientCookie("theme");
    if (cookieTheme === "light" || cookieTheme === "dark") {
      return cookieTheme;
    }

    // Detectar preferencia del sistema
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  }

  return "light";
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    getInitialTheme(),
  );

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
