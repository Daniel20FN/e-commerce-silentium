"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { PriorityLink } from "@/domains/admin/home/components/priority_link";
import {
  Alert,
  Box,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { priorityHref } from "../services/operational_rules";
import type {
  PriorityBlock,
  PriorityQueue,
  PriorityRow,
} from "../types/operational";
import { RefreshPriorities } from "./refresh_priorities";
type Copy = Dictionary["admin"]["dashboard"]["operations"];
export function PriorityItem({ row, copy }: { row: PriorityRow; copy: Copy }) {
  return (
    <Box sx={{ minWidth: 0, py: 0.75 }}>
      <PriorityLink
        href={row.href}
        variant="outlined"
        size="small"
        sx={{
          textAlign: "left",
          justifyContent: "flex-start",
          maxWidth: "100%",
          overflowWrap: "anywhere",
        }}
      >
        {row.orderNumber === null
          ? row.name
          : copy.orderNumber.replace("{number}", String(row.orderNumber))}
      </PriorityLink>
      {row.sku !== null && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            overflowWrap: "anywhere",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {row.sku} · {copy.stock.replace("{stock}", String(row.stock))}
          {row.minimum !== null
            ? ` · ${copy.minimum.replace("{minimum}", String(row.minimum))}`
            : ""}
        </Typography>
      )}
    </Box>
  );
}
function QueueSummary({ queue, copy }: { queue: PriorityQueue; copy: Copy }) {
  const c = copy.groups[queue.group];
  return (
    <Box component="section" sx={{ minWidth: 0, py: 1.5 }}>
      <Stack
        direction="row"
        gap={1.5}
        justifyContent="space-between"
        alignItems="baseline"
      >
        <Typography component="h3" variant="subtitle2">
          {c.title}
        </Typography>
        <Typography
          component="span"
          variant="h5"
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: queue.count ? "info.main" : "text.secondary",
          }}
        >
          {queue.count.toLocaleString("es-CO")}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {c.description}
      </Typography>
      {queue.count === 0 ? (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {copy.empty}
        </Typography>
      ) : (
        <>
          <Stack sx={{ mt: 0.5 }}>
            {queue.rows.map((row) => (
              <PriorityItem key={row.id} row={row} copy={copy} />
            ))}
          </Stack>
          <PriorityLink
            href={priorityHref(queue.group)}
            size="small"
            variant="outlined"
            sx={{ mt: 0.75 }}
          >
            {copy.viewAll}
          </PriorityLink>
        </>
      )}
    </Box>
  );
}
export function PriorityLoading({
  title,
  copy,
}: {
  title: string;
  copy: Copy;
}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: 2, minWidth: 0 }}
      aria-busy="true"
      aria-label={title}
    >
      <Typography component="h2" variant="h6">
        {title}
      </Typography>
      <Typography role="status" variant="body2" color="text.secondary">
        {copy.loading}
      </Typography>
      <Skeleton height={64} animation={false} />
      <Skeleton height={64} animation={false} />
      <Skeleton height={64} animation={false} />
    </Paper>
  );
}
export function PriorityFailure({
  title,
  copy,
  heading = "h2",
}: {
  title: string;
  copy: Copy;
  heading?: "h1" | "h2";
}) {
  return (
    <Paper component="section" variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Stack spacing={1.5} alignItems="flex-start">
        <Typography component={heading} variant="h6">
          {title}
        </Typography>
        <Alert severity="error">{copy.error}</Alert>
        <RefreshPriorities label={copy.retry} pendingLabel={copy.refreshing} />
      </Stack>
    </Paper>
  );
}
export function PriorityPanelContent({
  block,
  copy,
  queues,
}: {
  block: PriorityBlock;
  copy: Copy;
  queues: PriorityQueue[];
}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: 2, minWidth: 0, alignSelf: "start" }}
    >
      <Typography component="h2" variant="h6">
        {copy.blocks[block]}
      </Typography>
      <Stack divider={<Divider />}>
        {queues.map((queue) => (
          <QueueSummary key={queue.group} queue={queue} copy={copy} />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p">
        {copy.updated.replace("{date}", queues[0].updatedLabel)}
      </Typography>
    </Paper>
  );
}
export function PriorityQueueContent({
  queue,
  cursor,
  copy,
}: {
  queue: PriorityQueue;
  cursor?: string;
  copy: Copy;
}) {
  const group = queue.group;
  return (
    <Stack spacing={2}>
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="baseline">
        <Typography component="h1" variant="h5">
          {copy.groups[group].title}
        </Typography>
        <Typography
          component="span"
          color="info.main"
          variant="h5"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {queue.count.toLocaleString("es-CO")}
        </Typography>
      </Stack>
      <Typography color="text.secondary">
        {copy.groups[group].description}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {copy.updated.replace("{date}", queue.updatedLabel)} ·{" "}
        {copy.oldestFirst}
      </Typography>
      {queue.rows.length ? (
        <Stack divider={<Divider />}>
          {queue.rows.map((row) => (
            <PriorityItem key={row.id} row={row} copy={copy} />
          ))}
        </Stack>
      ) : (
        <Alert severity="success">{copy.empty}</Alert>
      )}
      <Stack direction="row" gap={1} flexWrap="wrap">
        {cursor && (
          <PriorityLink href={priorityHref(group)} variant="outlined">
            {copy.firstPage}
          </PriorityLink>
        )}
        {queue.nextCursor && (
          <PriorityLink
            href={priorityHref(group, queue.nextCursor)}
            variant="outlined"
          >
            {copy.next}
          </PriorityLink>
        )}
      </Stack>
    </Stack>
  );
}
export function PriorityQueueError({
  group,
  copy,
}: {
  group: PriorityQueue["group"];
  copy: Copy;
}) {
  return (
    <Stack spacing={2}>
      <PriorityFailure
        title={copy.groups[group].title}
        copy={copy}
        heading="h1"
      />
      <PriorityLink href={priorityHref(group)} variant="outlined">
        {copy.firstPage}
      </PriorityLink>
    </Stack>
  );
}
