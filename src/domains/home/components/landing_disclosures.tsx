"use client";
import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { sectionAnchorSx } from "../services/landing_links";

interface DisclosureItem {
  id: string;
  title: string;
  body: string;
}

export function LandingDisclosures({ items }: { items: DisclosureItem[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame: number | undefined;
    function openHash(): void {
      if (frame !== undefined) cancelAnimationFrame(frame);
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const target = Array.from(
        root.current?.querySelectorAll("details") ?? [],
      ).find((item) => item.id === id);
      if (!target) return;
      target.open = true;
      frame = requestAnimationFrame(() => {
        target.querySelector("summary")?.focus({ preventScroll: true });
        target.scrollIntoView?.({ block: "start" });
      });
    }
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => {
      window.removeEventListener("hashchange", openHash);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <Box ref={root}>
      {items.map((item) => (
        <Box
          component="details"
          key={item.id}
          id={item.id}
          sx={{
            ...sectionAnchorSx,
            borderBottom: 1,
            borderColor: "divider",
            "&[open]": { bgcolor: "action.hover", borderRadius: 2 },
            "& summary": {
              cursor: "pointer",
              p: { xs: 2, md: 2.5 },
              fontWeight: 600,
              lineHeight: 1.7,
              "&:hover": { bgcolor: "action.hover" },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "info.main",
                outlineOffset: 2,
                borderRadius: 1,
              },
              "&::marker": { color: "text.secondary" },
            },
            "& p": {
              px: { xs: 2, md: 2.5 },
              pb: 3,
              mt: 0,
              lineHeight: 1.9,
              color: "text.secondary",
            },
          }}
        >
          <summary>{item.title}</summary>
          <Typography>{item.body}</Typography>
        </Box>
      ))}
    </Box>
  );
}
