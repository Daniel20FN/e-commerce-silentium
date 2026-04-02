"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import {
  currentUserAtom,
  hasResolvedCurrentUserAtom,
} from "@/domains/auth/states/current_user_atom";
import type { CurrentUserApiResponse } from "@/domains/auth/types/api_responses";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

const AUTH_BOOTSTRAP_REQUEST_ID = "auth-session-bootstrap";

export function AuthSessionBootstrap() {
  const { cancellableApi, abort } = useCancellableApiContext();
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setHasResolvedCurrentUser = useSetAtom(hasResolvedCurrentUserAtom);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async (): Promise<void> => {
      try {
        const response = await cancellableApi.get<
          CurrentUserApiResponse,
          undefined
        >(AUTH_BOOTSTRAP_REQUEST_ID, "/auth/me");

        if (!isMounted) {
          return;
        }

        setCurrentUser(response?.user ?? null);
      } catch {
        if (!isMounted) {
          return;
        }

        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setHasResolvedCurrentUser(true);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
      abort(AUTH_BOOTSTRAP_REQUEST_ID);
    };
  }, [abort, cancellableApi, setCurrentUser, setHasResolvedCurrentUser]);

  return null;
}
