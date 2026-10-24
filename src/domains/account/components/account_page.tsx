"use client";
import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { currentUserAtom } from "@/domains/auth/states/current_user_atom";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSetAtom } from "jotai";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type {
  AccountDeleteParams,
  AccountPasswordParams,
  AccountProfileParams,
} from "../types/api_params";
import type {
  AccountActionApiResponse,
  AccountApiResponse,
  AccountData,
} from "../types/api_responses";

export function AccountPage({
  initial,
  copy,
}: {
  initial: AccountData;
  copy: Dictionary["account"];
}) {
  const { cancellableApi } = useCancellableApiContext();
  const setCurrentUser = useSetAtom(currentUserAtom);
  const [profile, setProfile] = useState<AccountProfileParams>({
    firstName: initial.user.profile.firstName ?? "",
    lastName: initial.user.profile.lastName ?? "",
    phone: initial.phone,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [finished, setFinished] = useState<string | null>(null);
  const flight = useRef(false);
  const failure = (reason: unknown) => {
    const code =
      reason instanceof Error ? reason.message : "account_unavailable";
    const item = Object.entries(copy.errors).find(([key]) => key === code);
    return item?.[1] ?? copy.errors.account_unavailable;
  };
  async function run(
    action: () => Promise<void>,
    inDialog = false,
  ): Promise<void> {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setFeedback(null);
    setDeleteError(null);
    try {
      await action();
    } catch (reason) {
      if (inDialog) setDeleteError(failure(reason));
      else setFeedback({ text: failure(reason), error: true });
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void run(async () => {
      const result = await cancellableApi.patch<
        AccountApiResponse,
        AccountProfileParams
      >("account-profile", "/account", profile);
      if (!result) throw new Error("account_unavailable");
      setCurrentUser(result.user);
      setFeedback({ text: copy.saved, error: false });
    });
  }
  function changePassword(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (password !== repeat) {
      setFeedback({ text: copy.errors.account_password_mismatch, error: true });
      return;
    }
    void run(async () => {
      const result = await cancellableApi.post<
        AccountActionApiResponse,
        AccountPasswordParams
      >("account-password", "/account/password", { currentPassword, password });
      if (!result?.success) throw new Error("account_unavailable");
      setCurrentUser(null);
      setFinished(copy.passwordChanged);
    }).finally(() => {
      setCurrentPassword("");
      setPassword("");
      setRepeat("");
    });
  }
  function remove(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void run(async () => {
      const result = await cancellableApi.delete<
        AccountActionApiResponse,
        AccountDeleteParams
      >("account-delete", "/account", {
        currentPassword: deletePassword,
        confirmationEmail,
      });
      if (!result?.success) throw new Error("account_delete_failed");
      setCurrentUser(null);
      setDeleting(false);
      setFinished(copy.deleted);
    }, true).finally(() => setDeletePassword(""));
  }
  if (finished)
    return (
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Typography variant="h4" component="h1">
            {copy.title}
          </Typography>
          <Alert severity="success">{finished}</Alert>
          <Button component={Link} href="/login" variant="outlined">
            {copy.login}
          </Button>
        </Stack>
      </Container>
    );
  return (
    <Container maxWidth="lg">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {copy.title}
          </Typography>
          <Typography color="text.secondary">{copy.intro}</Typography>
        </Box>
        {feedback && (
          <Alert severity={feedback.error ? "error" : "success"}>
            {feedback.text}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Box
            component="section"
            aria-labelledby="account-profile-title"
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
            }}
          >
            <Typography id="account-profile-title" component="h2" variant="h6">
              {copy.profile}
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 1, mb: 3 }}
            >
              {copy.profileIntro}
            </Typography>
            <Box component="form" onSubmit={save}>
              <Stack spacing={2.5}>
                <TextField
                  label={copy.firstName}
                  autoComplete="given-name"
                  required
                  value={profile.firstName}
                  disabled={busy}
                  inputProps={{ maxLength: 100 }}
                  onChange={(e) =>
                    setProfile({ ...profile, firstName: e.target.value })
                  }
                />
                <TextField
                  label={copy.lastName}
                  autoComplete="family-name"
                  required
                  value={profile.lastName}
                  disabled={busy}
                  inputProps={{ maxLength: 100 }}
                  onChange={(e) =>
                    setProfile({ ...profile, lastName: e.target.value })
                  }
                />
                <TextField
                  label={copy.phone}
                  type="tel"
                  autoComplete="tel"
                  value={profile.phone}
                  helperText={copy.phoneHelp}
                  disabled={busy}
                  inputProps={{ maxLength: 25 }}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                />
                <TextField
                  label={copy.email}
                  value={initial.user.email}
                  slotProps={{ input: { readOnly: true } }}
                  helperText={copy.emailHelp}
                />
                <Button type="submit" variant="outlined" disabled={busy}>
                  {busy ? copy.saving : copy.save}
                </Button>
              </Stack>
            </Box>
          </Box>
          <Box
            component="section"
            aria-labelledby="account-security-title"
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
            }}
          >
            <Typography id="account-security-title" component="h2" variant="h6">
              {copy.security}
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 1, mb: 3 }}
            >
              {copy.securityIntro}
            </Typography>
            <Box component="form" onSubmit={changePassword}>
              <Stack spacing={2.5}>
                <TextField
                  label={copy.currentPassword}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  disabled={busy}
                  inputProps={{ maxLength: 128 }}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  label={copy.newPassword}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  disabled={busy}
                  helperText={copy.passwordHelp}
                  inputProps={{ minLength: 8, maxLength: 128 }}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  label={copy.repeatPassword}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repeat}
                  disabled={busy}
                  inputProps={{ minLength: 8, maxLength: 128 }}
                  onChange={(e) => setRepeat(e.target.value)}
                />
                <Button type="submit" variant="outlined" disabled={busy}>
                  {copy.changePassword}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
        <Divider />
        <Box component="section" aria-labelledby="account-delete-title">
          <Typography id="account-delete-title" component="h2" variant="h6">
            {copy.deleteTitle}
          </Typography>
          <Typography
            sx={{ mt: 1, mb: 2, maxWidth: "70ch" }}
            color="text.secondary"
          >
            {copy.deleteIntro}
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: "85ch", mb: 2 }}>
            {copy.deleteDetails}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.privacyHelp}{" "}
            <Link href="mailto:contacto@silentium-hogar.com">
              {copy.privacyContact}
            </Link>
          </Typography>
          <Button
            sx={{ mt: 3 }}
            color="error"
            variant="outlined"
            disabled={busy}
            onClick={() => {
              setDeleteError(null);
              setConfirmationEmail("");
              setDeletePassword("");
              setDeleting(true);
            }}
          >
            {copy.deleteButton}
          </Button>
        </Box>
        <Box>
          <Button component={Link} href="/productos" variant="outlined">
            {copy.back}
          </Button>
        </Box>
      </Stack>
      <Dialog
        open={deleting}
        fullWidth
        maxWidth="sm"
        onClose={() => {
          if (!busy) {
            setDeleting(false);
            setDeletePassword("");
          }
        }}
        aria-labelledby="delete-own-account-title"
      >
        <DialogTitle id="delete-own-account-title">
          {copy.deleteConfirmTitle}
        </DialogTitle>
        <Box component="form" onSubmit={remove}>
          <DialogContent>
            <Stack spacing={2.5}>
              <Alert severity="warning">{copy.deleteWarning}</Alert>
              {deleteError && <Alert severity="error">{deleteError}</Alert>}
              <TextField
                label={copy.confirmEmail}
                type="email"
                autoComplete="off"
                required
                value={confirmationEmail}
                disabled={busy}
                onChange={(e) => setConfirmationEmail(e.target.value)}
              />
              <TextField
                label={copy.currentPassword}
                type="password"
                autoComplete="current-password"
                required
                value={deletePassword}
                disabled={busy}
                inputProps={{ maxLength: 128 }}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => {
                setDeleting(false);
                setDeletePassword("");
              }}
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              color="error"
              variant="outlined"
              disabled={
                busy ||
                !deletePassword ||
                confirmationEmail.trim().toLowerCase() !==
                  initial.user.email.toLowerCase()
              }
            >
              {busy ? copy.working : copy.confirmDelete}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
}
