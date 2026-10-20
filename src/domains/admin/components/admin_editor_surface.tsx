"use client";

import { Box, Dialog, type DialogProps } from "@mui/material";

export interface AdminEditorState {
  dirty: boolean;
  busy: boolean;
}

export function AdminEditorSurface({
  embedded = false,
  children,
  ...props
}: DialogProps & { embedded?: boolean }) {
  if (!embedded) return <Dialog {...props}>{children}</Dialog>;
  return (
    <Box
      component="section"
      sx={{
        minWidth: 0,
        "& > .MuiDialogTitle-root": { px: 0, pt: 0 },
        "& > .MuiDialogContent-root": { px: 0 },
        "& > .MuiDialogActions-root": { px: 0 },
      }}
    >
      {children}
    </Box>
  );
}
