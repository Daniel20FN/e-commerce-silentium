"use client";
import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { ConsentFields } from "@/domains/legal/components/consent_fields";
import { LEGAL_VERSION } from "@/domains/legal/services/legal_release";
import type { LegalUiCopy } from "@/domains/legal/services/legal_ui_copy";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { invitationMessage } from "../services/invitation_messages";
import { establishInvitationSession } from "../services/invitation_session";
import type {
  AcceptInvitationApiResponse,
  AcceptInvitationParams,
  PendingInvitationApiResponse,
  PendingInvitationData,
} from "../types/invitation_api";

export function AcceptInvitationForm({
  dictionary,
}: {
  dictionary: Pick<Dictionary, "auth"> & { legal: LegalUiCopy };
}) {
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [invitation, setInvitation] = useState<PendingInvitationData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [adult, setAdult] = useState(false);
  const copy = dictionary.auth.invitation;
  const busy = isPending("accept-user-invitation");
  const sessionSetup = useRef<Promise<void> | null>(null);
  useEffect(() => {
    let mounted = true;
    async function initialize(): Promise<void> {
      try {
        sessionSetup.current ??= establishInvitationSession();
        await sessionSetup.current;
        const pending = await cancellableApi.get<
          PendingInvitationApiResponse,
          undefined
        >("pending-user-invitation", "/auth/invitations");
        if (!pending) throw new Error("invitation_unavailable");
        if (mounted) setInvitation(pending);
      } catch (reason) {
        if (mounted)
          setError(
            invitationMessage(
              dictionary,
              reason instanceof Error ? reason.message : undefined,
              "invitation_unavailable",
            ),
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void initialize();
    return () => {
      mounted = false;
    };
  }, [cancellableApi, dictionary]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy || !invitation) return;
    if (password !== confirmation) {
      setError(copy.passwordMismatch);
      return;
    }
    setError(null);
    try {
      const result = await cancellableApi.post<
        AcceptInvitationApiResponse,
        AcceptInvitationParams
      >("accept-user-invitation", "/auth/invitations", {
        password,
        acceptTerms,
        acceptPrivacy,
        adult,
        legalVersion: LEGAL_VERSION,
      });
      if (!result) throw new Error("invitation_unavailable");
      setPassword("");
      setConfirmation("");
      window.location.assign(result.redirectTo);
    } catch (reason) {
      setError(
        invitationMessage(
          dictionary,
          reason instanceof Error ? reason.message : undefined,
          "invitation_unavailable",
        ),
      );
    }
  }
  if (loading) return <Typography role="status">{copy.loading}</Typography>;
  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {invitation ? (
        <Box component="form" onSubmit={submit} aria-busy={busy}>
          <Stack spacing={2}>
            <Typography>
              {copy.recipient.replace("{email}", invitation.email)}
            </Typography>
            <TextField
              autoFocus
              required
              type="password"
              autoComplete="new-password"
              label={dictionary.auth.common.password}
              value={password}
              disabled={busy}
              inputProps={{ minLength: 8, maxLength: 128 }}
              helperText={copy.passwordHelp}
              onChange={(event) => setPassword(event.target.value)}
            />
            <TextField
              required
              type="password"
              autoComplete="new-password"
              label={copy.confirmPassword}
              value={confirmation}
              disabled={busy}
              inputProps={{ minLength: 8, maxLength: 128 }}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <ConsentFields
              copy={dictionary.legal}
              value={{ acceptTerms, acceptPrivacy, adult }}
              disabled={busy}
              onChange={(key, checked) => {
                if (key === "acceptTerms") setAcceptTerms(checked);
                if (key === "acceptPrivacy") setAcceptPrivacy(checked);
                if (key === "adult") setAdult(checked);
              }}
            />
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? copy.submitting : copy.submit}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Button variant="outlined" href="/login">
          {copy.login}
        </Button>
      )}
    </Stack>
  );
}
