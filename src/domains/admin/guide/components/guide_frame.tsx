"use client";

import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

export function GuideFrame({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={(theme) => ({
        minWidth: 0,
        maxWidth: 1280,
        mx: "auto",
        color: "text.primary",
        "& h1": { fontSize: 24, lineHeight: 1.3, m: 0, mb: 1 },
        "& h2": { fontSize: 22, lineHeight: 1.4, m: 0, mb: 1 },
        "& h3": { fontSize: 16, m: 0, mb: 1 },
        "& p": { mt: 0, mb: 2, lineHeight: 1.7 },
        "& a": {
          color: "info.main",
          textUnderlineOffset: "3px",
          overflowWrap: "anywhere",
        },
        "& a:focus-visible, & button:focus-visible, & input:focus-visible, & select:focus-visible":
          {
            outline: "2px solid",
            outlineColor: "info.main",
            outlineOffset: 3,
          },
        "& .guide-intro": { color: "text.secondary", maxWidth: "76ch" },
        "& .guide-search": {
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "end",
          my: 3,
        },
        "& label": {
          display: "block",
          fontSize: 14,
          fontWeight: 600,
          mb: 0.75,
        },
        "& .guide-search-field": {
          flex: "1 1 220px",
          maxWidth: 540,
          minWidth: 0,
        },
        "& input, & select": {
          width: "100%",
          minWidth: 0,
          minHeight: 44,
          font: "inherit",
          color: "text.primary",
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "text.secondary",
          borderRadius: 1,
          px: 1.5,
          boxSizing: "border-box",
        },
        "& input::placeholder": { color: "text.secondary", opacity: 1 },
        "& button, & .guide-action": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          px: 1.5,
          border: "1px solid",
          borderColor: "info.main",
          borderRadius: 1,
          color: "info.main",
          backgroundColor: "background.paper",
          cursor: "pointer",
          textDecoration: "none",
          "&:hover": {
            borderColor: "info.main",
            backgroundColor: "action.hover",
          },
        },
        "& .guide-layout": {
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            md: "240px minmax(0,1fr)",
          },
          gap: { xs: 3, md: 4 },
          alignItems: "start",
        },
        "& .guide-sidebar": {
          display: { xs: "none", md: "block" },
          position: "sticky",
          top: 0,
          maxHeight: "75dvh",
          overflowY: "auto",
          pr: 2,
        },
        "& .guide-topics": {
          listStyle: "none",
          m: 0,
          p: 0,
          "& li": { mb: 0.5 },
          "& a": {
            display: "block",
            px: 1.5,
            py: 1,
            textDecoration: "none",
            fontSize: 14,
            borderRadius: 1,
            color: "text.secondary",
          },
          "& a:hover": {
            backgroundColor: "action.hover",
            color: "text.primary",
          },
          "& a[aria-current=page]": {
            backgroundColor: "action.selected",
            color: "text.primary",
            fontWeight: 700,
          },
        },
        "& .guide-topic-picker": {
          display: { xs: "block", md: "none" },
          mb: 3,
        },
        "& .guide-topic-picker button": { mt: 1 },
        "& .guide-body": { minWidth: 0, maxWidth: "76ch" },
        "& .guide-article": {
          "& section": { mt: 3 },
          "& ol, & ul": { pl: 3, my: 0 },
          "& li": { pl: 0.5, mb: 1.5, lineHeight: 1.7 },
        },
        "& .guide-warning": {
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          backgroundColor: alpha(theme.palette.info.main, 0.08),
          "& p": { mb: 0 },
        },
        "& .guide-related": {
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          listStyle: "none",
          p: 0,
          "& li": { p: 0, m: 0 },
        },
        "& .guide-results": {
          listStyle: "none",
          p: 0,
          m: 0,
          "& li": {
            py: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          },
          "& h3": { fontSize: 18 },
        },
        "& .guide-footer": { mt: 4, color: "text.secondary", fontSize: 13 },
      })}
    >
      {children}
    </Box>
  );
}
