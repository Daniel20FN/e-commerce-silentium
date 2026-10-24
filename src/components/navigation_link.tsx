"use client";

import { Box, LinearProgress, Portal } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import NextLink, { useLinkStatus } from "next/link";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";

const LoadingLabel = createContext("");

export function NavigationFeedbackProvider({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <LoadingLabel.Provider value={label}>{children}</LoadingLabel.Provider>
  );
}

function PendingIndicator() {
  const { pending } = useLinkStatus();
  const label = useContext(LoadingLabel);
  if (!pending) return null;
  return (
    <Portal>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: "fixed",
          inset: "0 0 auto",
          zIndex: (theme) => theme.zIndex.tooltip + 1,
          pointerEvents: "none",
        }}
      >
        <Box component="span" sx={visuallyHidden}>
          {label}
        </Box>
        <LinearProgress
          aria-hidden="true"
          sx={{
            height: 3,
            "@media (prefers-reduced-motion: reduce)": {
              "& .MuiLinearProgress-bar": { animation: "none" },
            },
          }}
        />
      </Box>
    </Portal>
  );
}

export default function NavigationLink({
  children,
  ...props
}: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <PendingIndicator />
    </NextLink>
  );
}
