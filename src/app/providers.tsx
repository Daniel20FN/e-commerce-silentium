"use client";

import { CustomDialogProvider } from "@/components/dialog/dialog_context";
import { CancellableApiProvider } from "@/context/use_cancellable_api_context";
import { LanguageProvider } from "@/dictionary/context/language_context";
import CustomThemeProvider from "@/styles/custom_theme_provider";
import { ThemeProvider } from "@/styles/theme_context";
import { CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Provider } from "jotai";
import { SnackbarProvider } from "notistack";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider>
      <CustomDialogProvider>
        <ThemeProvider>
          <CustomThemeProvider>
            <LanguageProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <SnackbarProvider maxSnack={4}>
                  <CancellableApiProvider options={{ autoCleanup: true }}>
                    <CssBaseline />
                    {children}
                  </CancellableApiProvider>
                </SnackbarProvider>
              </LocalizationProvider>
            </LanguageProvider>
          </CustomThemeProvider>
        </ThemeProvider>
      </CustomDialogProvider>
    </Provider>
  );
}
