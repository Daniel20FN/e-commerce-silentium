"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { DeleteOutline } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import type {
  McpOAuthGrantDeleteApiResponse,
  McpOAuthGrantRevokeApiResponse,
  McpOAuthGrantsListApiResponse,
} from "../types/api_responses";
import type { McpOAuthGrantDto, OAuthGrantState } from "../types/oauth_types";

type AgentsCopy = Dictionary["admin"]["agents"];

const LIST_REQUEST_ID = "admin-agent-connections-list";
const REVOKE_REQUEST_ID = "admin-agent-connections-revoke";
const DELETE_REQUEST_ID = "admin-agent-connections-delete";
const STATE_COLOR: Record<OAuthGrantState, "success" | "default" | "error"> = {
  active: "success",
  expired: "default",
  revoked: "error",
};

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

function errorMessage(copy: AgentsCopy, error: unknown): string {
  const messages: Record<string, string> = copy.errors;
  const code = error instanceof Error ? error.message : "";
  return messages[code] ?? copy.errors.generic;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="p">
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="p"
        sx={{ overflowWrap: "anywhere" }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function ConnectionCard({
  copy,
  grant,
  onRevoke,
  onDelete,
}: {
  copy: AgentsCopy;
  grant: McpOAuthGrantDto;
  onRevoke: (grant: McpOAuthGrantDto) => void;
  onDelete: (grant: McpOAuthGrantDto) => void;
}) {
  const text = copy.connections;
  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{
        listStyle: "none",
        p: 2,
        display: "flex",
        gap: 2,
        flexDirection: { xs: "column", md: "row" },
        alignItems: { md: "center" },
      }}
    >
      <Box sx={{ flex: { md: "1 1 24%" }, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{ overflowWrap: "anywhere" }}
          >
            {grant.clientName}
          </Typography>
          <Chip
            size="small"
            color={STATE_COLOR[grant.state]}
            label={copy.states[grant.state]}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {text.unverified} · {text.source[grant.clientSource]}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: { md: "1 1 60%" },
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        <Field label={text.fields.scopes}>
          {grant.scopes.map((scope) => copy.scopes[scope]).join(", ")}
        </Field>
        <Field label={text.fields.created}>
          {dateFormat.format(new Date(grant.createdAt))}
        </Field>
        <Field label={text.fields.lastUsed}>
          {grant.lastUsedAt
            ? dateFormat.format(new Date(grant.lastUsedAt))
            : copy.never}
        </Field>
        <Field label={text.fields.expires}>
          {dateFormat.format(new Date(grant.expiresAt))}
        </Field>
      </Box>
      <Box sx={{ flex: { md: "0 0 auto" } }}>
        {grant.state === "active" && (
          <Button
            color="error"
            variant="outlined"
            fullWidth
            aria-label={`${copy.revoke.button} ${grant.clientName}`}
            onClick={() => onRevoke(grant)}
          >
            {copy.revoke.button}
          </Button>
        )}
        {grant.state === "revoked" && (
          <Button
            color="error"
            variant="outlined"
            fullWidth
            startIcon={<DeleteOutline />}
            aria-label={`${copy.delete.button} ${grant.clientName}`}
            onClick={() => onDelete(grant)}
          >
            {copy.delete.button}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

/** OAuth connections of the signed-in admin, next to the personal tokens. */
export function OAuthConnectionsSection({ copy }: { copy: AgentsCopy }) {
  const text = copy.connections;
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [grants, setGrants] = useState<McpOAuthGrantDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [revoking, setRevoking] = useState<McpOAuthGrantDto | null>(null);
  const [deleting, setDeleting] = useState<McpOAuthGrantDto | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const revokeBusy = isPending(REVOKE_REQUEST_ID);
  const deleteBusy = isPending(DELETE_REQUEST_ID);

  useEffect(() => {
    let active = true;
    cancellableApi
      .get<McpOAuthGrantsListApiResponse, undefined>(
        LIST_REQUEST_ID,
        "/admin/agent-connections",
      )
      .then((result) => {
        if (!active || !result) return;
        setGrants(result.grants);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof Error && error.name === "AbortError"))
          return;
        setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [cancellableApi, reloadCount]);

  async function confirmRevoke(): Promise<void> {
    if (!revoking || revokeBusy) return;
    setDialogError(null);
    try {
      const result = await cancellableApi.delete<
        McpOAuthGrantRevokeApiResponse,
        undefined
      >(
        REVOKE_REQUEST_ID,
        `/admin/agent-connections/${encodeURIComponent(revoking.id)}`,
        undefined,
        text.revoke.success,
      );
      if (!result) return;
      setGrants(
        (current) =>
          current?.map((grant) =>
            grant.id === result.grant.id ? result.grant : grant,
          ) ?? null,
      );
      setRevoking(null);
    } catch (error) {
      const message = errorMessage(copy, error);
      setDialogError(message);
      enqueueSnackbar(message, { variant: "error", preventDuplicate: true });
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting || deleteBusy) return;
    setDialogError(null);
    try {
      const result = await cancellableApi.delete<
        McpOAuthGrantDeleteApiResponse,
        undefined
      >(
        DELETE_REQUEST_ID,
        `/admin/agent-connections/${encodeURIComponent(deleting.id)}/permanent`,
        undefined,
        text.delete.success,
      );
      if (!result) return;
      setGrants(
        (current) => current?.filter((grant) => grant.id !== result.id) ?? null,
      );
      setDeleting(null);
    } catch (error) {
      const message = errorMessage(copy, error);
      setDialogError(message);
      enqueueSnackbar(message, { variant: "error", preventDuplicate: true });
    }
  }

  return (
    <Stack
      component="section"
      spacing={2}
      aria-labelledby="agent-connections-title"
    >
      <Box>
        <Typography variant="h5" component="h2" id="agent-connections-title">
          {text.title}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
          {text.intro}
        </Typography>
      </Box>

      {grants === null && !loadFailed && (
        <Stack direction="row" spacing={1} alignItems="center" role="status">
          <CircularProgress size={20} />
          <Typography>{text.loading}</Typography>
        </Stack>
      )}

      {loadFailed && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => setReloadCount((n) => n + 1)}
            >
              {copy.retry}
            </Button>
          }
        >
          {text.errorTitle}
        </Alert>
      )}

      {grants !== null && grants.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" component="h3">
            {text.emptyTitle}
          </Typography>
          <Typography color="text.secondary">
            {text.emptyDescription}
          </Typography>
        </Paper>
      )}

      {grants !== null && grants.length > 0 && (
        <Stack
          component="ul"
          spacing={1.5}
          sx={{ p: 0, m: 0 }}
          aria-label={text.listLabel}
        >
          {grants.map((grant) => (
            <ConnectionCard
              key={grant.id}
              copy={copy}
              grant={grant}
              onRevoke={(target) => {
                setDialogError(null);
                setRevoking(target);
              }}
              onDelete={(target) => {
                setDialogError(null);
                setDeleting(target);
              }}
            />
          ))}
        </Stack>
      )}

      <Dialog
        open={revoking !== null}
        onClose={() => {
          if (!revokeBusy) setRevoking(null);
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="agent-connection-revoke-title"
      >
        <DialogTitle id="agent-connection-revoke-title">
          {text.revoke.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <Typography>
              {text.revoke.body.replace("{name}", revoking?.clientName ?? "")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={revokeBusy} onClick={() => setRevoking(null)}>
            {text.revoke.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={revokeBusy}
            onClick={() => void confirmRevoke()}
          >
            {text.revoke.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="agent-connection-delete-title"
      >
        <DialogTitle id="agent-connection-delete-title">
          {text.delete.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <Typography>
              {text.delete.body.replace("{name}", deleting?.clientName ?? "")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={deleteBusy} onClick={() => setDeleting(null)}>
            {text.delete.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBusy}
            onClick={() => void confirmDelete()}
          >
            {text.delete.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
