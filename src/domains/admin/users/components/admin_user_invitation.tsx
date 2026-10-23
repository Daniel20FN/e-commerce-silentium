"use client";
import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { invitationMessage } from "@/domains/auth/services/invitation_messages";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import type { AdminUserInviteParams } from "../types/api_params";
import type { AdminUserInviteApiResponse } from "../types/api_responses";
import { ADMIN_USER_ROLE_VALUES } from "../types/shared";

const REQUEST_ID = "admin-user-invite";
export function AdminUserInvitation({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<AdminUserInviteParams>({
    firstName: "",
    lastName: "",
    email: "",
    role: "admin",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const copy = dictionary.admin.users.invitation;
  const busy = isPending(REQUEST_ID);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy || sentEmail) return;
    setFeedback(null);
    try {
      const result = await cancellableApi.post<
        AdminUserInviteApiResponse,
        AdminUserInviteParams
      >(REQUEST_ID, "/admin/users/invitations", input);
      if (!result) throw new Error("invitation_delivery_failed");
      setSentEmail(result.email);
    } catch (error) {
      setFeedback(
        invitationMessage(
          dictionary,
          error instanceof Error ? error.message : undefined,
        ),
      );
    }
  }
  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
          setFeedback(null);
          setSentEmail(null);
        }}
      >
        {copy.button}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="invite-user-title"
      >
        <DialogTitle id="invite-user-title">{copy.title}</DialogTitle>
        <Box
          component="form"
          onSubmit={submit}
          aria-busy={busy}
          sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography variant="body2">{copy.intro}</Typography>
              <Alert severity="info">{copy.mailerNotice}</Alert>
              {feedback && <Alert severity="error">{feedback}</Alert>}
              {sentEmail && (
                <Alert severity="success">
                  {copy.sent.replace("{email}", sentEmail)}
                </Alert>
              )}
              <TextField
                autoFocus
                required
                label={dictionary.auth.common.firstName}
                value={input.firstName}
                inputProps={{ maxLength: 100 }}
                disabled={busy || !!sentEmail}
                onChange={(event) =>
                  setInput({ ...input, firstName: event.target.value })
                }
              />
              <TextField
                required
                label={dictionary.auth.common.lastName}
                value={input.lastName}
                inputProps={{ maxLength: 100 }}
                disabled={busy || !!sentEmail}
                onChange={(event) =>
                  setInput({ ...input, lastName: event.target.value })
                }
              />
              <TextField
                required
                type="email"
                label={dictionary.auth.common.email}
                value={input.email}
                inputProps={{ maxLength: 254 }}
                disabled={busy || !!sentEmail}
                onChange={(event) =>
                  setInput({ ...input, email: event.target.value })
                }
              />
              <TextField
                select
                label={copy.role}
                value={input.role}
                disabled={busy || !!sentEmail}
                onChange={(event) => {
                  const role = ADMIN_USER_ROLE_VALUES.find(
                    (value) => value === event.target.value,
                  );
                  if (role) setInput({ ...input, role });
                }}
              >
                {ADMIN_USER_ROLE_VALUES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {dictionary.admin.users.roleLabels[role]}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="caption" color="text.secondary">
                {copy.expiry}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {sentEmail ? copy.close : copy.cancel}
            </Button>
            {!sentEmail && (
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? copy.submitting : copy.submit}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
