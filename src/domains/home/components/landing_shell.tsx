"use client";
import { brandColors } from "@/styles/brand_colors";
import { Box, useTheme } from "@mui/material";
import { type ReactNode, useEffect, useRef } from "react";
import { observeLandingReveals } from "../services/landing_motion";
import styles from "./landing.module.css";

export function LandingShell({ children }: { children: ReactNode }) {
  const dark = useTheme().palette.mode === "dark";
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current) return observeLandingReveals(root.current);
  }, []);
  return (
    <Box
      ref={root}
      className={styles.shell}
      sx={{
        "--landing-paper": dark ? brandColors.darkCanvas : brandColors.ivory,
        "--landing-surface": dark
          ? brandColors.darkSurface
          : brandColors.lightSurface,
        "--landing-ink": dark ? brandColors.ivory : brandColors.brown,
        "--landing-story": brandColors.blue,
        "--landing-story-ink": brandColors.brown,
        "--landing-footer": dark ? brandColors.darkCanvas : brandColors.brown,
        "--landing-footer-mark": dark ? brandColors.blue : brandColors.ivory,
        "--landing-action": dark ? brandColors.blue : brandColors.brown,
        "--landing-action-ink": dark
          ? brandColors.darkCanvas
          : brandColors.ivory,
        "--landing-muted": dark
          ? brandColors.darkMuted
          : brandColors.lightMuted,
      }}
    >
      {children}
    </Box>
  );
}
