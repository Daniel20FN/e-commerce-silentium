"use client";

import { CustomDialogProvider } from "@/components/dialog/dialog_context";
import { NavigationFeedbackProvider } from "@/components/navigation_link";
import { CancellableApiProvider } from "@/context/use_cancellable_api_context";
import { LanguageProvider } from "@/dictionary/context/language_context";
import { AuthSessionBootstrap } from "@/domains/auth/components/auth_session_bootstrap";
import { CartBootstrap } from "@/domains/cart/components/cart_bootstrap";
import CustomThemeProvider from "@/styles/custom_theme_provider";
import { ThemeProvider } from "@/styles/theme_context";
import type { ThemeMode } from "@/styles/theme_mode";
import { CssBaseline } from "@mui/material";
import { Provider } from "jotai";
import { SnackbarProvider } from "notistack";
import { ReactNode } from "react";

export function Providers({
  children,
  initialTheme,
  loadingLabel,
}: {
  children: ReactNode;
  initialTheme: ThemeMode;
  loadingLabel: string;
}) {
  return (
    <Provider>
      <CustomDialogProvider>
        <ThemeProvider initialTheme={initialTheme}>
          <CustomThemeProvider>
            <LanguageProvider>
              <SnackbarProvider maxSnack={4}>
                <CancellableApiProvider options={{ autoCleanup: true }}>
                  <CssBaseline />
                  <AuthSessionBootstrap />
                  <CartBootstrap />
                  <NavigationFeedbackProvider label={loadingLabel}>
                    {children}
                  </NavigationFeedbackProvider>
                </CancellableApiProvider>
              </SnackbarProvider>
            </LanguageProvider>
          </CustomThemeProvider>
        </ThemeProvider>
      </CustomDialogProvider>
    </Provider>
  );
}
