"use client";

import { CustomDialogProvider } from "@/components/dialog/dialog_context";
import { CancellableApiProvider } from "@/context/use_cancellable_api_context";
import { LanguageProvider } from "@/dictionary/context/language_context";
import CustomThemeProvider from "@/styles/custom_theme_provider";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Provider } from "jotai";
import { SnackbarProvider } from "notistack";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider>
      <CustomDialogProvider>
        <CustomThemeProvider>
          <LanguageProvider>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <SnackbarProvider maxSnack={4}>
                <CancellableApiProvider options={{ autoCleanup: true }}>
                  {children}
                </CancellableApiProvider>
              </SnackbarProvider>
            </LocalizationProvider>
          </LanguageProvider>
        </CustomThemeProvider>
      </CustomDialogProvider>
    </Provider>
  );
}
