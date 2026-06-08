"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  AUTH_RESEND_COOLDOWN,
  getResendCooldownRemainingSeconds,
} from "@/domains/auth/services/resend_confirmation";
import type {
  RegisterApiParams,
  ResendConfirmationApiParams,
} from "@/domains/auth/types/api_params";
import type {
  RegisterApiResponse,
  ResendConfirmationApiResponse,
} from "@/domains/auth/types/api_responses";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RegisterFormErrors {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  acceptTerms?: string;
  form?: string;
}

interface RegisterFormProps {
  dictionary: Dictionary;
}

const REGISTER_REQUEST_ID = "auth-register";
const RESEND_CONFIRMATION_REQUEST_ID = "auth-resend-confirmation";

function replaceTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, value);
  }, template);
}

function resolveAuthErrorMessage(
  dictionary: Dictionary,
  errorCode: string | undefined,
): string {
  const authErrors = dictionary.auth.errors as Record<string, string>;

  return (
    (errorCode ? authErrors[errorCode] : undefined) ??
    dictionary.auth.errors.unexpected_auth_error
  );
}

export function RegisterForm({ dictionary }: RegisterFormProps) {
  const { cancellableApi, isPending } = useCancellableApiContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptsMarketingEmails, setAcceptsMarketingEmails] = useState(false);
  const [acceptsWhatsAppMarketing, setAcceptsWhatsAppMarketing] =
    useState(false);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [resendFeedback, setResendFeedback] = useState<{
    severity: "success" | "info" | "error";
    message: string;
  } | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null,
  );
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resendAvailableAt) {
      return;
    }

    const timeoutId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timeoutId);
    };
  }, [resendAvailableAt]);

  const remainingSeconds = getResendCooldownRemainingSeconds(
    resendAvailableAt,
    countdownNow,
  );

  const validate = (): boolean => {
    const nextErrors: RegisterFormErrors = {};

    if (!firstName.trim()) {
      nextErrors.firstName = dictionary.auth.common.requiredField;
    }

    if (!lastName.trim()) {
      nextErrors.lastName = dictionary.auth.common.requiredField;
    }

    if (!email.trim()) {
      nextErrors.email = dictionary.auth.common.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = dictionary.auth.common.invalidEmail;
    }

    if (!password) {
      nextErrors.password = dictionary.auth.common.requiredField;
    } else if (password.length < 8) {
      nextErrors.password = dictionary.auth.common.passwordMinLength;
    }

    if (!acceptTerms) {
      nextErrors.acceptTerms = dictionary.auth.errors.accept_terms_required;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setErrors({});
    setResendFeedback(null);

    try {
      const response = await cancellableApi.post<
        RegisterApiResponse,
        RegisterApiParams
      >(REGISTER_REQUEST_ID, "/auth/register", {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        acceptTerms,
        acceptsMarketingEmails,
        acceptsWhatsAppMarketing,
      });

      if (!response) {
        setErrors({ form: dictionary.auth.errors.unexpected_auth_error });
        return;
      }

      setSuccessEmail(response.email);
      setCountdownNow(Date.now());
      setResendAvailableAt(Date.now() + AUTH_RESEND_COOLDOWN.seconds * 1000);
      setResendFeedback({
        severity: "info",
        message: dictionary.auth.register.resendInitialCooldown,
      });
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : undefined;
      setErrors({ form: resolveAuthErrorMessage(dictionary, errorCode) });
    }
  };

  const handleResendConfirmation = async (): Promise<void> => {
    if (!successEmail || remainingSeconds > 0) {
      return;
    }

    setResendFeedback(null);

    try {
      const response = await cancellableApi.post<
        ResendConfirmationApiResponse,
        ResendConfirmationApiParams
      >(RESEND_CONFIRMATION_REQUEST_ID, "/auth/resend-confirmation", {
        email: successEmail,
      });

      if (!response) {
        setResendFeedback({
          severity: "error",
          message: dictionary.auth.errors.unexpected_auth_error,
        });
        return;
      }

      setCountdownNow(Date.now());
      setResendAvailableAt(Date.now() + response.cooldownSeconds * 1000);
      setResendFeedback({
        severity: "success",
        message: dictionary.auth.register.resendSuccess,
      });
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : undefined;
      setResendFeedback({
        severity: "error",
        message: resolveAuthErrorMessage(dictionary, errorCode),
      });
    }
  };

  const isRegisterPending = isPending(REGISTER_REQUEST_ID);
  const isResendPending = isPending(RESEND_CONFIRMATION_REQUEST_ID);

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
      {successEmail ? (
        <Alert severity="success">
          <Typography fontWeight={700}>
            {dictionary.auth.register.successTitle}
          </Typography>
          <Typography>
            {dictionary.auth.register.successDescription}{" "}
            <strong>{successEmail}</strong>.
          </Typography>
          <Typography>{dictionary.auth.register.successHint}</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                void handleResendConfirmation();
              }}
              disabled={isResendPending || remainingSeconds > 0}
              startIcon={
                isResendPending ? (
                  <CircularProgress color="inherit" size={18} />
                ) : undefined
              }
              sx={{ alignSelf: "flex-start" }}
            >
              {isResendPending
                ? dictionary.auth.register.resendSubmitting
                : dictionary.auth.register.resendButton}
            </Button>

            {remainingSeconds > 0 ? (
              <Typography color="text.secondary" variant="body2">
                {replaceTemplate(dictionary.auth.register.resendCooldown, {
                  seconds: String(remainingSeconds),
                })}
              </Typography>
            ) : null}

            {resendFeedback ? (
              <Alert severity={resendFeedback.severity}>
                {resendFeedback.message}
              </Alert>
            ) : null}
          </Stack>
        </Alert>
      ) : null}

      {errors.form ? <Alert severity="error">{errors.form}</Alert> : null}

      <TextField
        label={dictionary.auth.common.firstName}
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
        error={Boolean(errors.firstName)}
        helperText={errors.firstName}
        autoComplete="given-name"
        fullWidth
      />

      <TextField
        label={dictionary.auth.common.lastName}
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
        error={Boolean(errors.lastName)}
        helperText={errors.lastName}
        autoComplete="family-name"
        fullWidth
      />

      <TextField
        label={dictionary.auth.common.email}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={Boolean(errors.email)}
        helperText={errors.email}
        autoComplete="email"
        fullWidth
      />

      <TextField
        label={dictionary.auth.common.password}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={Boolean(errors.password)}
        helperText={errors.password}
        autoComplete="new-password"
        fullWidth
      />

      <Stack spacing={0.75}>
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
              />
            }
            label={dictionary.auth.common.acceptTerms}
          />
          {errors.acceptTerms ? (
            <Typography color="error" variant="caption">
              {errors.acceptTerms}
            </Typography>
          ) : null}
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptsMarketingEmails}
                onChange={(event) =>
                  setAcceptsMarketingEmails(event.target.checked)
                }
              />
            }
            label={dictionary.auth.register.acceptsMarketingEmails}
          />
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptsWhatsAppMarketing}
                onChange={(event) =>
                  setAcceptsWhatsAppMarketing(event.target.checked)
                }
              />
            }
            label={dictionary.auth.register.acceptsWhatsAppMarketing}
          />
        </Box>
      </Stack>

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isRegisterPending}
        startIcon={
          isRegisterPending ? (
            <CircularProgress color="inherit" size={18} />
          ) : undefined
        }
      >
        {isRegisterPending
          ? dictionary.auth.register.submitting
          : dictionary.auth.register.submit}
      </Button>

      <Box>
        <Typography component="span" color="text.secondary">
          {dictionary.auth.register.loginPrompt}{" "}
        </Typography>
        <Button component={Link} href="/login" sx={{ px: 0, minWidth: 0 }}>
          {dictionary.auth.register.loginLink}
        </Button>
      </Box>
    </Stack>
  );
}
