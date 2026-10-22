"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { PriorityLink } from "./priority_link";
import { RefreshPriorities } from "./refresh_priorities";
type Props = {
  copy: Dictionary["admin"]["dashboard"]["operations"];
  children: ReactNode;
};
export function OperationalHome({ copy: c, children }: Props) {
  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Typography component="h1" variant="h5">
        {c.heading}
      </Typography>
      <Stack
        direction="row"
        gap={1}
        flexWrap="wrap"
        justifyContent="space-between"
      >
        <Stack direction="row" gap={1} flexWrap="wrap">
          <PriorityLink href="/admin/pedidos/nuevo" variant="contained">
            {c.newOrder}
          </PriorityLink>
          <PriorityLink href="/admin/productos?create=1" variant="outlined">
            {c.newProduct}
          </PriorityLink>
          <PriorityLink href="/admin/pendientes?group=out" variant="outlined">
            {c.inventory}
          </PriorityLink>
          <PriorityLink href="/admin/analisis" variant="outlined">
            {c.analysis}
          </PriorityLink>
        </Stack>
        <RefreshPriorities label={c.refresh} pendingLabel={c.refreshing} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {c.scope}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}
export function OperationalQueue({ copy: c, children }: Props) {
  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
      >
        <PriorityLink href="/admin" variant="outlined">
          {c.back}
        </PriorityLink>
        <RefreshPriorities label={c.refresh} pendingLabel={c.refreshing} />
      </Stack>
      {children}
    </Stack>
  );
}
