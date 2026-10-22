"use client";

import { brandColors } from "@/styles/brand_colors";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { PriorityBlock } from "../types/operational";

const headers = {
  orders: { background: brandColors.brown, foreground: brandColors.ivory },
  inventory: {
    background: brandColors.blue,
    foreground: brandColors.brownHover,
  },
  catalog: {
    background: brandColors.beige,
    foreground: brandColors.brownHover,
  },
} satisfies Record<PriorityBlock, { background: string; foreground: string }>;

export function PriorityPanelFrame({
  block,
  title,
  busy,
  children,
}: {
  block: PriorityBlock;
  title: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const header = headers[block];
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={title}
      aria-busy={busy}
      sx={(theme) => ({
        minWidth: 0,
        alignSelf: "start",
        overflow: "hidden",
        borderRadius: "12px",
        borderColor: alpha(
          theme.palette.mode === "dark" ? brandColors.beige : brandColors.brown,
          theme.palette.mode === "dark" ? 0.45 : 0.35,
        ),
        backgroundColor: "background.paper",
        boxShadow: "none",
      })}
    >
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: { xs: 68, md: 82 },
          px: 2.5,
          py: 2,
          backgroundColor: header.background,
          color: header.foreground,
        }}
      >
        <Typography
          component="h2"
          variant="h6"
          sx={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Paper>
  );
}
