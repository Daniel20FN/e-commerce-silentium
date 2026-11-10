"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  ContentCopyOutlined,
  DeleteOutline,
  VpnKeyOutlined,
} from "@mui/icons-material";
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
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState, type FormEvent } from "react";
import type { McpTokenCreateParams } from "../types/api_params";
import type {
  McpTokenCreateApiResponse,
  McpTokenDeleteApiResponse,
  McpTokenRevokeApiResponse,
  McpTokensListApiResponse,
} from "../types/api_responses";
import type { McpTokenDto, McpTokenState } from "../types/mcp_token";
import {
  MCP_TOKEN_ACCESS,
  MCP_TOKEN_EXPIRY_DAYS_VALUES,
} from "../types/mcp_token";

type AgentsCopy = Dictionary["admin"]["agents"];

const LIST_REQUEST_ID = "admin-agent-tokens-list";
const CREATE_REQUEST_ID = "admin-agent-tokens-create";
const REVOKE_REQUEST_ID = "admin-agent-tokens-revoke";
const DELETE_REQUEST_ID = "admin-agent-tokens-delete";
const DEFAULT_EXPIRY_DAYS = MCP_TOKEN_EXPIRY_DAYS_VALUES[0];
const BUSINESS_TIME_ZONE = "America/Bogota";
const STATE_COLOR: Record<McpTokenState, "success" | "default" | "error"> = {
  active: "success",
  expired: "default",
  revoked: "error",
};

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIME_ZONE,
});

function errorMessage(copy: AgentsCopy, error: unknown): string {
  const messages: Record<string, string> = copy.errors;
  const code = error instanceof Error ? error.message : "";
  return messages[code] ?? copy.errors.generic;
}

interface CreateDraft {
  name: string;
  access: McpTokenCreateParams["access"];
  expiresInDays: McpTokenCreateParams["expiresInDays"];
  currentPassword: string;
}

const EMPTY_DRAFT: CreateDraft = {
  name: "",
  access: MCP_TOKEN_ACCESS.read,
  expiresInDays: DEFAULT_EXPIRY_DAYS,
  currentPassword: "",
};

function CreateTokenDialog({
  copy,
  open,
  onClose,
  onCreated,
}: {
  copy: AgentsCopy;
  open: boolean;
  onClose: () => void;
  onCreated: (token: McpTokenDto) => void;
}) {
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [draft, setDraft] = useState<CreateDraft>(EMPTY_DRAFT);
  const [secret, setSecret] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const busy = isPending(CREATE_REQUEST_ID);

  function close(): void {
    // The plaintext secret and the password never outlive the dialog.
    setSecret(null);
    setDraft(EMPTY_DRAFT);
    setFeedback(null);
    setCopied("idle");
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setFeedback(null);
    try {
      const result = await cancellableApi.post<
        McpTokenCreateApiResponse,
        McpTokenCreateParams
      >(CREATE_REQUEST_ID, "/admin/agent-tokens", draft);
      if (!result) return;
      setDraft(EMPTY_DRAFT);
      setSecret(result.secret);
      onCreated(result.token);
    } catch (error) {
      setDraft((current) => ({ ...current, currentPassword: "" }));
      setFeedback(errorMessage(copy, error));
    }
  }

  async function copySecret(): Promise<void> {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        // A revealed secret can only be dismissed explicitly.
        if (!busy && !secret && reason !== "backdropClick") close();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="agent-token-dialog-title"
    >
      {secret ? (
        <>
          <DialogTitle id="agent-token-dialog-title">
            {copy.secret.title}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="warning">{copy.secret.warning}</Alert>
              <TextField
                label={copy.secret.label}
                value={secret}
                fullWidth
                onFocus={(event) => event.target.select()}
                slotProps={{
                  htmlInput: {
                    readOnly: true,
                    spellCheck: false,
                    sx: { fontFamily: "monospace", fontSize: "0.9rem" },
                  },
                }}
              />
              <Button
                variant="outlined"
                startIcon={<ContentCopyOutlined />}
                onClick={() => void copySecret()}
              >
                {copy.secret.copy}
              </Button>
              {copied === "done" && (
                <Alert severity="success" role="status">
                  {copy.secret.copied}
                </Alert>
              )}
              {copied === "failed" && (
                <Alert severity="error">{copy.secret.copyFailed}</Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={close}>
              {copy.secret.done}
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box
          component="form"
          onSubmit={submit}
          aria-busy={busy}
          sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <DialogTitle id="agent-token-dialog-title">
            {copy.create.title}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {feedback && <Alert severity="error">{feedback}</Alert>}
              <TextField
                autoFocus
                required
                label={copy.create.name}
                helperText={copy.create.nameHelp}
                value={draft.name}
                disabled={busy}
                slotProps={{ htmlInput: { maxLength: 80 } }}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
              <TextField
                select
                label={copy.create.access}
                helperText={copy.create.accessHelp}
                value={draft.access}
                disabled={busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    access:
                      event.target.value === MCP_TOKEN_ACCESS.readWrite
                        ? MCP_TOKEN_ACCESS.readWrite
                        : MCP_TOKEN_ACCESS.read,
                  })
                }
              >
                <MenuItem value={MCP_TOKEN_ACCESS.read}>
                  {copy.create.accessRead}
                </MenuItem>
                <MenuItem value={MCP_TOKEN_ACCESS.readWrite}>
                  {copy.create.accessReadWrite}
                </MenuItem>
              </TextField>
              <TextField
                select
                label={copy.create.expiry}
                helperText={copy.create.expiryHelp}
                value={draft.expiresInDays}
                disabled={busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    expiresInDays:
                      Number(event.target.value) ===
                      MCP_TOKEN_EXPIRY_DAYS_VALUES[1]
                        ? MCP_TOKEN_EXPIRY_DAYS_VALUES[1]
                        : MCP_TOKEN_EXPIRY_DAYS_VALUES[0],
                  })
                }
              >
                {MCP_TOKEN_EXPIRY_DAYS_VALUES.map((days) => (
                  <MenuItem key={days} value={days}>
                    {copy.create.expiryOption.replace("{days}", String(days))}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                type="password"
                label={copy.create.password}
                helperText={copy.create.passwordHelp}
                value={draft.currentPassword}
                disabled={busy}
                autoComplete="current-password"
                onChange={(event) =>
                  setDraft({ ...draft, currentPassword: event.target.value })
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button disabled={busy} onClick={close}>
              {copy.create.cancel}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                busy || !draft.name.trim() || !draft.currentPassword.length
              }
            >
              {busy ? <CircularProgress size={20} /> : copy.create.submit}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}

function TokenField({
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
      <Typography variant="body2" component="p">
        {children}
      </Typography>
    </Box>
  );
}

function TokenCard({
  copy,
  token,
  onRevoke,
  onDelete,
}: {
  copy: AgentsCopy;
  token: McpTokenDto;
  onRevoke: (token: McpTokenDto) => void;
  onDelete: (token: McpTokenDto) => void;
}) {
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
      <Box sx={{ flex: { md: "1 1 22%" }, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{ overflowWrap: "anywhere" }}
          >
            {token.name}
          </Typography>
          <Chip
            size="small"
            color={STATE_COLOR[token.state]}
            label={copy.states[token.state]}
          />
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontFamily: "monospace" }}
          aria-label={copy.fields.prefix}
        >
          {token.prefix}…
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
        <TokenField label={copy.fields.scopes}>
          {token.scopes.map((scope) => copy.scopes[scope]).join(", ")}
        </TokenField>
        <TokenField label={copy.fields.created}>
          {dateFormat.format(new Date(token.createdAt))}
        </TokenField>
        <TokenField label={copy.fields.lastUsed}>
          {token.lastUsedAt
            ? dateFormat.format(new Date(token.lastUsedAt))
            : copy.never}
        </TokenField>
        <TokenField label={copy.fields.expires}>
          {dateFormat.format(new Date(token.expiresAt))}
        </TokenField>
      </Box>
      <Box sx={{ flex: { md: "0 0 auto" } }}>
        {token.state === "active" && (
          <Button
            color="error"
            variant="outlined"
            fullWidth
            aria-label={`${copy.revoke.button} ${token.name}`}
            onClick={() => onRevoke(token)}
          >
            {copy.revoke.button}
          </Button>
        )}
        {token.state === "revoked" && (
          <Button
            color="error"
            variant="outlined"
            fullWidth
            startIcon={<DeleteOutline />}
            aria-label={`${copy.delete.button} ${token.name}`}
            onClick={() => onDelete(token)}
          >
            {copy.delete.button}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export function AgentTokensPage({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.admin.agents;
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [tokens, setTokens] = useState<McpTokenDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<McpTokenDto | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<McpTokenDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const revokeBusy = isPending(REVOKE_REQUEST_ID);
  const deleteBusy = isPending(DELETE_REQUEST_ID);

  useEffect(() => {
    let active = true;
    cancellableApi
      .get<McpTokensListApiResponse, undefined>(
        LIST_REQUEST_ID,
        "/admin/agent-tokens",
      )
      .then((result) => {
        if (!active || !result) return;
        setTokens(result.tokens);
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
    setRevokeError(null);
    try {
      const result = await cancellableApi.delete<
        McpTokenRevokeApiResponse,
        undefined
      >(
        REVOKE_REQUEST_ID,
        `/admin/agent-tokens/${encodeURIComponent(revoking.id)}`,
        undefined,
        copy.revoke.success,
      );
      if (!result) return;
      setTokens(
        (current) =>
          current?.map((token) =>
            token.id === result.token.id ? result.token : token,
          ) ?? null,
      );
      setRevoking(null);
    } catch (error) {
      const message = errorMessage(copy, error);
      setRevokeError(message);
      enqueueSnackbar(message, { variant: "error", preventDuplicate: true });
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting || deleteBusy) return;
    setDeleteError(null);
    try {
      const result = await cancellableApi.delete<
        McpTokenDeleteApiResponse,
        undefined
      >(
        DELETE_REQUEST_ID,
        `/admin/agent-tokens/${encodeURIComponent(deleting.id)}/permanent`,
        undefined,
        copy.delete.success,
      );
      if (!result) return;
      setTokens(
        (current) => current?.filter((token) => token.id !== result.id) ?? null,
      );
      setDeleting(null);
    } catch (error) {
      const message = errorMessage(copy, error);
      setDeleteError(message);
      enqueueSnackbar(message, { variant: "error", preventDuplicate: true });
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
      >
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 720 }}
        >
          {copy.intro}
        </Typography>
        <Button
          variant="contained"
          startIcon={<VpnKeyOutlined />}
          onClick={() => setCreateOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          {copy.createButton}
        </Button>
      </Stack>

      {tokens === null && !loadFailed && (
        <Stack direction="row" spacing={1} alignItems="center" role="status">
          <CircularProgress size={20} />
          <Typography>{copy.loading}</Typography>
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
          {copy.errorTitle}
        </Alert>
      )}

      {tokens !== null && tokens.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" component="h2">
            {copy.emptyTitle}
          </Typography>
          <Typography color="text.secondary">
            {copy.emptyDescription}
          </Typography>
        </Paper>
      )}

      {tokens !== null && tokens.length > 0 && (
        <Stack
          component="ul"
          spacing={1.5}
          sx={{ p: 0, m: 0 }}
          aria-label={copy.listLabel}
        >
          {tokens.map((token) => (
            <TokenCard
              key={token.id}
              copy={copy}
              token={token}
              onRevoke={(target) => {
                setRevokeError(null);
                setRevoking(target);
              }}
              onDelete={(target) => {
                setDeleteError(null);
                setDeleting(target);
              }}
            />
          ))}
        </Stack>
      )}

      <CreateTokenDialog
        copy={copy}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(token) =>
          setTokens((current) => [token, ...(current ?? [])])
        }
      />

      <Dialog
        open={revoking !== null}
        onClose={() => {
          if (!revokeBusy) setRevoking(null);
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="agent-token-revoke-title"
      >
        <DialogTitle id="agent-token-revoke-title">
          {copy.revoke.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {revokeError && <Alert severity="error">{revokeError}</Alert>}
            <Typography>
              {copy.revoke.body.replace("{name}", revoking?.name ?? "")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={revokeBusy} onClick={() => setRevoking(null)}>
            {copy.revoke.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={revokeBusy}
            onClick={() => void confirmRevoke()}
          >
            {copy.revoke.confirm}
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
        aria-labelledby="agent-token-delete-title"
      >
        <DialogTitle id="agent-token-delete-title">
          {copy.delete.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <Typography>
              {copy.delete.body.replace("{name}", deleting?.name ?? "")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={deleteBusy} onClick={() => setDeleting(null)}>
            {copy.delete.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBusy}
            onClick={() => void confirmDelete()}
          >
            {copy.delete.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
