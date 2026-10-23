"use client";
import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useRef, useState } from "react";
import type {
  AdminUserDeleteApiResponse,
  AdminUserListItemDto,
} from "../types/api_responses";

export function DeleteUserButton({
  user,
  dictionary,
  onDeleted,
}: {
  user: AdminUserListItemDto;
  dictionary: Dictionary;
  onDeleted: () => void;
}) {
  const { cancellableApi } = useCancellableApiContext();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const copy = dictionary.admin.users.deletion;
  async function remove(): Promise<void> {
    if (
      submitting.current ||
      email.trim().toLowerCase() !== user.email.toLowerCase()
    )
      return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await cancellableApi.delete<
        AdminUserDeleteApiResponse,
        never
      >(`delete-user-${user.id}`, `/admin/users/${user.id}`);
      if (!result) throw new Error("user_delete_failed");
      enqueueSnackbar(copy.success, { variant: "success" });
      setOpen(false);
      onDeleted();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setError(
        code === "user_delete_self"
          ? copy.errors.self
          : code === "user_delete_history"
            ? copy.errors.history
            : code === "user_delete_missing"
              ? copy.errors.missing
              : code === "user_delete_provider"
                ? copy.errors.provider
                : copy.errors.failed,
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={<DeleteOutline />}
        onClick={() => {
          setEmail("");
          setError(null);
          setOpen(true);
        }}
      >
        {copy.button}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!submitting.current) setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby={`delete-user-title-${user.id}`}
      >
        <DialogTitle id={`delete-user-title-${user.id}`}>
          {copy.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography sx={{ overflowWrap: "anywhere", fontWeight: 700 }}>
              {user.email}
            </Typography>
            <Typography>{copy.description}</Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label={copy.confirmLabel}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              autoComplete="off"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1, p: 2 }}>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              busy || email.trim().toLowerCase() !== user.email.toLowerCase()
            }
            onClick={() => void remove()}
          >
            {copy.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
