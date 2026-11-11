import { prisma } from "@/lib/prisma";
import "server-only";
import type {
  OAuthAccess,
  OAuthAuthorizeParams,
  OAuthClientRecord,
  OAuthValidatedAuthorization,
} from "../types/oauth_types";
import type { ClientDocumentFetcher } from "./oauth_cimd";
import { purgeExpiredOAuthData } from "./oauth_cleanup";
import { resolveClientForAuthorization } from "./oauth_client_service";
import {
  OAUTH_CODE_TTL_MS,
  OAUTH_MAX_ACTIVE_GRANTS_PER_USER,
  OAUTH_STATE_MAX_LENGTH,
  generateAuthorizationCode,
  hashSecret,
  isCodeChallengeShape,
  parseRequestedScopes,
  redirectUriMatches,
  resourceMatches,
  scopesForOAuthAccess,
} from "./oauth_rules";

export type AuthorizationValidation =
  | { ok: true; request: OAuthValidatedAuthorization }
  /** The client or redirect URI cannot be trusted: show an error, never redirect. */
  | { ok: false; kind: "page"; code: "invalid_client" | "invalid_redirect_uri" }
  /** Valid redirect URI: report the error to the client with `error`. */
  | {
      ok: false;
      kind: "redirect";
      redirectUri: string;
      state: string | null;
      error: string;
      description: string;
    };

export interface ValidateAuthorizationOptions {
  /** Canonical MCP resource URL of this server. */
  resource: string;
  now?: Date;
  allowFetch?: boolean;
  fetchDocument?: ClientDocumentFetcher;
}

function redirectFailure(
  redirectUri: string,
  state: string | null,
  error: string,
  description: string,
): AuthorizationValidation {
  return {
    ok: false,
    kind: "redirect",
    redirectUri,
    state,
    error,
    description,
  };
}

/**
 * Validates an authorization request. The client and the exact redirect URI
 * are checked first; until both are trusted no error is ever redirected.
 */
export async function validateAuthorizationRequest(
  params: OAuthAuthorizeParams,
  options: ValidateAuthorizationOptions,
): Promise<AuthorizationValidation> {
  const { client_id: clientId, redirect_uri: redirectUri } = params;
  if (!clientId || clientId.length > 2048)
    return { ok: false, kind: "page", code: "invalid_client" };
  const client: OAuthClientRecord | null = await resolveClientForAuthorization(
    clientId,
    {
      now: options.now,
      allowFetch: options.allowFetch,
      fetchDocument: options.fetchDocument,
    },
  );
  if (!client) return { ok: false, kind: "page", code: "invalid_client" };
  if (!redirectUri || !redirectUriMatches(client.redirectUris, redirectUri))
    return { ok: false, kind: "page", code: "invalid_redirect_uri" };

  const rawState = params.state;
  const state =
    rawState !== undefined && rawState.length <= OAUTH_STATE_MAX_LENGTH
      ? rawState
      : null;
  if (rawState !== undefined && state === null)
    return redirectFailure(
      redirectUri,
      null,
      "invalid_request",
      "state too long",
    );
  if (params.response_type !== "code")
    return redirectFailure(
      redirectUri,
      state,
      "unsupported_response_type",
      "Only response_type=code is supported",
    );
  if (
    !params.code_challenge ||
    !isCodeChallengeShape(params.code_challenge) ||
    params.code_challenge_method !== "S256"
  )
    return redirectFailure(
      redirectUri,
      state,
      "invalid_request",
      "PKCE with code_challenge_method=S256 is required",
    );
  let resource = options.resource;
  if (params.resource !== undefined) {
    if (!resourceMatches(params.resource, options.resource))
      return redirectFailure(
        redirectUri,
        state,
        "invalid_target",
        "Unknown resource",
      );
    resource = options.resource;
  }
  return {
    ok: true,
    request: {
      client,
      redirectUri,
      codeChallenge: params.code_challenge,
      resource,
      state,
      requestedScopes: parseRequestedScopes(params.scope),
    },
  };
}

export class OAuthConsentError extends Error {
  constructor(
    public readonly code: "oauth_grant_limit",
    public readonly status: 409,
  ) {
    super(code);
  }
}

/** Builds the browser redirect back to the client (code or error response). */
export function buildAuthorizationRedirect(
  redirectUri: string,
  result: { code?: string; error?: string; description?: string },
  state: string | null,
  issuer: string,
): string {
  const url = new URL(redirectUri);
  if (result.code) url.searchParams.set("code", result.code);
  if (result.error) {
    url.searchParams.set("error", result.error);
    if (result.description)
      url.searchParams.set("error_description", result.description);
  }
  if (state !== null) url.searchParams.set("state", state);
  url.searchParams.set("iss", issuer);
  return url.toString();
}

/**
 * Stores a single-use authorization code (hash only) for the person's choice
 * of access. The client's requested scope never decides what is granted.
 */
export async function issueAuthorizationCode(
  userId: string,
  request: OAuthValidatedAuthorization,
  access: OAuthAccess,
  now: Date = new Date(),
): Promise<string> {
  await purgeExpiredOAuthData(now);
  const active = await prisma.mcpOAuthGrant.count({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
  });
  if (active >= OAUTH_MAX_ACTIVE_GRANTS_PER_USER)
    throw new OAuthConsentError("oauth_grant_limit", 409);
  const code = generateAuthorizationCode();
  await prisma.mcpOAuthCode.create({
    data: {
      codeHash: hashSecret(code),
      clientRowId: request.client.id,
      userId,
      scopes: scopesForOAuthAccess(access),
      redirectUri: request.redirectUri,
      resource: request.resource,
      codeChallenge: request.codeChallenge,
      expiresAt: new Date(now.getTime() + OAUTH_CODE_TTL_MS),
    },
  });
  return code;
}
