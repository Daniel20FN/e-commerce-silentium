"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { AuthShell } from "@/domains/auth/components/auth_shell";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { navigateTo } from "../services/oauth_navigation";
import type { OAuthDecisionParams } from "../types/api_params";
import type { OAuthDecisionApiResponse } from "../types/api_responses";
import type { OAuthAccess, OAuthAuthorizeParams } from "../types/oauth_types";
import { OAUTH_ACCESS } from "../types/oauth_types";

type ConsentCopy = Dictionary["mcpOAuth"]["consent"];

const DECISION_REQUEST_ID = "oauth-consent-decision";

export interface OAuthConsentClientInfo {
  name: string;
  uri: string | null;
  redirectHost: string;
  loopbackOnly: boolean;
  /** Scopes the client asked for, shown only as a hint. */
  requestedScopes: ("read" | "write")[];
}

interface OAuthConsentScreenProps {
  dictionary: Pick<Dictionary, "general" | "mcpOAuth">;
  authorization: OAuthAuthorizeParams;
  client: OAuthConsentClientInfo;
  accountLabel: string;
}

function errorMessage(copy: ConsentCopy, error: unknown): string {
  const messages: Record<string, string> = copy.errors;
  const code = error instanceof Error ? error.message : "";
  return messages[code] ?? copy.errors.generic;
}

export function OAuthConsentScreen({
  dictionary,
  authorization,
  client,
  accountLabel,
}: OAuthConsentScreenProps) {
  const copy = dictionary.mcpOAuth.consent;
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [access, setAccess] = useState<OAuthAccess>(OAUTH_ACCESS.read);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const busy = isPending(DECISION_REQUEST_ID) || redirecting;

  async function decide(decision: OAuthDecisionParams["decision"]) {
    if (busy) return;
    setFeedback(null);
    try {
      const result = await cancellableApi.post<
        OAuthDecisionApiResponse,
        OAuthDecisionParams
      >(DECISION_REQUEST_ID, "/oauth/authorize", {
        authorization,
        decision,
        access,
      });
      if (!result) return;
      setRedirecting(true);
      navigateTo(result.redirectTo);
    } catch (error) {
      setFeedback(errorMessage(copy, error));
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void decide("approve");
  }

  const requested = client.requestedScopes
    .map((scope) => (scope === "write" ? copy.scopeWrite : copy.scopeRead))
    .join(", ");

  return (
    <AuthShell
      dictionary={dictionary}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      <Box component="form" onSubmit={submit} aria-busy={busy}>
        <Stack spacing={3}>
          {feedback && <Alert severity="error">{feedback}</Alert>}

          <Box>
            <Typography variant="caption" color="text.secondary" component="p">
              {copy.clientLabel}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Typography
                variant="h6"
                component="p"
                sx={{ overflowWrap: "anywhere" }}
              >
                {client.name}
              </Typography>
              <Chip size="small" color="warning" label={copy.unverified} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {copy.unverifiedHelp}
            </Typography>
            {client.uri && (
              <Typography
                variant="body2"
                sx={{ mt: 1, overflowWrap: "anywhere" }}
              >
                {copy.clientUriLabel}: {client.uri}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="body2">
              {copy.redirectLabel}:{" "}
              <Box component="strong" sx={{ overflowWrap: "anywhere" }}>
                {client.redirectHost}
              </Box>
            </Typography>
            {client.loopbackOnly && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {copy.localWarning}
              </Alert>
            )}
          </Box>

          <Typography variant="body2">
            {copy.accountLabel}: <Box component="strong">{accountLabel}</Box>
          </Typography>

          <FormControl>
            <FormLabel id="oauth-access-label" sx={{ mb: 1 }}>
              {copy.accessTitle}
            </FormLabel>
            <RadioGroup
              aria-labelledby="oauth-access-label"
              name="access"
              value={access}
              onChange={(event) =>
                setAccess(
                  event.target.value === OAUTH_ACCESS.readWrite
                    ? OAUTH_ACCESS.readWrite
                    : OAUTH_ACCESS.read,
                )
              }
            >
              <FormControlLabel
                value={OAUTH_ACCESS.read}
                control={<Radio disabled={busy} />}
                sx={{ alignItems: "flex-start", mb: 1 }}
                label={
                  <Box sx={{ pt: 0.75 }}>
                    <Typography variant="subtitle2">
                      {copy.accessRead}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {copy.accessReadHelp}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value={OAUTH_ACCESS.readWrite}
                control={<Radio disabled={busy} />}
                sx={{ alignItems: "flex-start" }}
                label={
                  <Box sx={{ pt: 0.75 }}>
                    <Typography variant="subtitle2">
                      {copy.accessReadWrite}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {copy.accessReadWriteHelp}
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
            {requested && (
              <Typography variant="caption" color="text.secondary">
                {copy.requestedHint.replace("{scopes}", requested)}
              </Typography>
            )}
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            {copy.validity}
          </Typography>

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1.5}
            justifyContent="flex-end"
          >
            <Button
              variant="outlined"
              color="inherit"
              disabled={busy}
              onClick={() => void decide("deny")}
            >
              {copy.deny}
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} color="inherit" />
                  <span>{copy.working}</span>
                </Stack>
              ) : (
                copy.approve
              )}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </AuthShell>
  );
}

interface OAuthNoticeScreenProps {
  dictionary: Pick<Dictionary, "general">;
  title: string;
  subtitle: string;
  body: string;
  hint?: string;
}

/** Terminal screen for denied accounts and untrusted authorization requests. */
export function OAuthNoticeScreen({
  dictionary,
  title,
  subtitle,
  body,
  hint,
}: OAuthNoticeScreenProps) {
  return (
    <AuthShell dictionary={dictionary} title={title} subtitle={subtitle}>
      <Stack spacing={2}>
        <Alert severity="error" role="alert">
          {body}
        </Alert>
        {hint && (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Stack>
    </AuthShell>
  );
}
