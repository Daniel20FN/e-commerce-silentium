"use client";
import { Box, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import styles from "./landing.module.css";

export function LandingShell({ children }: { children: ReactNode }) {
  const dark = useTheme().palette.mode === "dark";
  return (
    <Box
      className={styles.shell}
      sx={{
        "--landing-paper": dark ? "#10283a" : "#f3e9df",
        "--landing-surface": dark ? "#173346" : "#e9dcd0",
        "--landing-ink": dark ? "#f3e9df" : "#001e3b",
        "--landing-muted": dark ? "#d2c9c1" : "#45515a",
      }}
    >
      {children}
    </Box>
  );
}
