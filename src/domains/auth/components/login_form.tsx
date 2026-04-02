"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { currentUserAtom } from "@/domains/auth/states/current_user_atom";
import type { LoginApiParams } from "@/domains/auth/types/api_params";
import type { LoginApiResponse } from "@/domains/auth/types/api_responses";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSetAtom } from "jotai";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

interface LoginFormProps {
  dictionary: Dictionary;
}

const LOGIN_REQUEST_ID = "auth-login";

function resolveFieldError(
  dictionary: Dictionary,
  errorCode: string | undefined,
): string {
  const authErrors = dictionary.auth.errors as Record<string, string>;

  return (
    (errorCode ? authErrors[errorCode] : undefined) ??
    dictionary.auth.errors.unexpected_auth_error
  );
}

export function LoginForm({ dictionary }: LoginFormProps) {
  const { cancellableApi, isPending } = useCancellableApiContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setCurrentUser = useSetAtom(currentUserAtom);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const confirmed = searchParams.get("confirmed") === "1";
  const returnTo = useMemo(
    () => searchParams.get("returnTo") ?? undefined,
    [searchParams],
  );

  const validate = (): boolean => {
    const nextErrors: LoginFormErrors = {};

    if (!email.trim()) {
      nextErrors.email = dictionary.auth.common.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = dictionary.auth.common.invalidEmail;
    }

    if (!password) {
      nextErrors.password = dictionary.auth.common.requiredField;
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

    try {
      const response = await cancellableApi.post<
        LoginApiResponse,
        LoginApiParams
      >(LOGIN_REQUEST_ID, "/auth/login", {
        email: email.trim(),
        password,
        returnTo,
      });

      if (!response) {
        setErrors({ form: dictionary.auth.errors.unexpected_auth_error });
        return;
      }

      setCurrentUser(response.user);
      router.push(response.redirectTo);
      router.refresh();
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : undefined;
      setErrors({ form: resolveFieldError(dictionary, errorCode) });
    }
  };

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
      {confirmed ? (
        <Alert severity="success">
          {dictionary.auth.login.confirmedSuccess}
        </Alert>
      ) : null}

      {returnTo ? (
        <Alert severity="info">{dictionary.auth.login.returningTo}</Alert>
      ) : null}

      {errors.form ? <Alert severity="error">{errors.form}</Alert> : null}

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
        autoComplete="current-password"
        fullWidth
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isPending(LOGIN_REQUEST_ID)}
        startIcon={
          isPending(LOGIN_REQUEST_ID) ? (
            <CircularProgress color="inherit" size={18} />
          ) : undefined
        }
      >
        {isPending(LOGIN_REQUEST_ID)
          ? dictionary.auth.login.submitting
          : dictionary.auth.login.submit}
      </Button>

      <Box>
        <Typography component="span" color="text.secondary">
          {dictionary.auth.login.registerPrompt}{" "}
        </Typography>
        <Button component={Link} href="/register" sx={{ px: 0, minWidth: 0 }}>
          {dictionary.auth.login.registerLink}
        </Button>
      </Box>
    </Stack>
  );
}
