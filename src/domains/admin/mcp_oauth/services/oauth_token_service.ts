import type { McpTokenScopeValue } from "@/domains/admin/mcp/types/mcp_token";
import { hasAdminAccess } from "@/domains/admin/services/admin_roles";
import { isDeletedAccount } from "@/domains/auth/services/deleted_account";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { prisma } from "@/lib/prisma";
import "server-only";
import type {
  OAuthClientRecord,
  OAuthTokenResponse,
} from "../types/oauth_types";
import { OAuthError } from "./oauth_http";
import {
  OAUTH_ACCESS_TOKEN_TTL_MS,
  OAUTH_GRANT_TTL_MS,
  OAUTH_LAST_USED_WINDOW_MS,
  generateAccessToken,
  generateRefreshToken,
  hashSecret,
  isAccessTokenShape,
  isAuthorizationCodeShape,
  isRefreshTokenShape,
  resourceMatches,
  scopeString,
  verifyPkce,
} from "./oauth_rules";

const userSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  profile: { select: { firstName: true, lastName: true } },
} as const;

interface OAuthUserRecord {
  id: string;
  email: string;
  role: CurrentUserDto["role"];
  status: string;
  profile: { firstName: string; lastName: string } | null;
}

function userIsAllowed(user: OAuthUserRecord): boolean {
  return (
    user.status === "active" &&
    !isDeletedAccount(user.email) &&
    hasAdminAccess(user.role)
  );
}

const invalidGrant = (): OAuthError =>
  new OAuthError("invalid_grant", "The grant is invalid, expired or revoked");

async function revokeGrant(grantId: string, now: Date): Promise<void> {
  await prisma.mcpOAuthGrant.updateMany({
    where: { id: grantId, revokedAt: null },
    data: { revokedAt: now },
  });
}

function tokenResponse(
  access: string,
  refresh: string,
  scopes: readonly McpTokenScopeValue[],
  accessExpiresAt: Date,
  now: Date,
): OAuthTokenResponse {
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: Math.max(
      1,
      Math.floor((accessExpiresAt.getTime() - now.getTime()) / 1000),
    ),
    refresh_token: refresh,
    scope: scopeString(scopes),
  };
}

export interface CodeExchangeInput {
  client: OAuthClientRecord;
  code: string | null;
  redirectUri: string | null;
  codeVerifier: string | null;
  resource: string | null;
  /** Canonical MCP resource of this server. */
  canonicalResource: string;
}

/**
 * authorization_code grant. The code is verified (client, redirect URI, PKCE,
 * resource) and then consumed atomically; presenting a consumed code again
 * revokes the grant it produced.
 */
export async function exchangeAuthorizationCode(
  input: CodeExchangeInput,
  now: Date = new Date(),
): Promise<OAuthTokenResponse> {
  const { client, code, redirectUri, codeVerifier } = input;
  if (!code || !redirectUri || !codeVerifier)
    throw new OAuthError(
      "invalid_request",
      "code, redirect_uri and code_verifier are required",
    );
  if (!isAuthorizationCodeShape(code)) throw invalidGrant();
  const record = await prisma.mcpOAuthCode.findUnique({
    where: { codeHash: hashSecret(code) },
    select: {
      id: true,
      clientRowId: true,
      userId: true,
      scopes: true,
      redirectUri: true,
      resource: true,
      codeChallenge: true,
      expiresAt: true,
      usedAt: true,
      grantId: true,
      user: { select: userSelect },
    },
  });
  if (!record || record.clientRowId !== client.id) throw invalidGrant();
  if (record.usedAt) {
    if (record.grantId) await revokeGrant(record.grantId, now);
    throw invalidGrant();
  }
  if (record.expiresAt.getTime() <= now.getTime()) throw invalidGrant();
  if (record.redirectUri !== redirectUri) throw invalidGrant();
  if (!verifyPkce(codeVerifier, record.codeChallenge)) throw invalidGrant();
  if (input.resource !== null) {
    if (
      !resourceMatches(input.resource, record.resource) ||
      !resourceMatches(input.resource, input.canonicalResource)
    )
      throw new OAuthError("invalid_target", "Unknown resource");
  }
  if (!userIsAllowed(record.user)) throw invalidGrant();

  const claimed = await prisma.mcpOAuthCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) throw invalidGrant();

  const access = generateAccessToken();
  const refresh = generateRefreshToken();
  const grantExpiresAt = new Date(now.getTime() + OAUTH_GRANT_TTL_MS);
  const accessExpiresAt = new Date(
    Math.min(
      now.getTime() + OAUTH_ACCESS_TOKEN_TTL_MS,
      grantExpiresAt.getTime(),
    ),
  );
  const grant = await prisma.mcpOAuthGrant.create({
    data: {
      userId: record.userId,
      clientRowId: client.id,
      scopes: record.scopes,
      resource: record.resource,
      expiresAt: grantExpiresAt,
      tokens: {
        create: [
          {
            kind: "access",
            tokenHash: hashSecret(access),
            expiresAt: accessExpiresAt,
          },
          {
            kind: "refresh",
            tokenHash: hashSecret(refresh),
            expiresAt: grantExpiresAt,
          },
        ],
      },
    },
    select: { id: true },
  });
  await prisma.mcpOAuthCode.update({
    where: { id: record.id },
    data: { grantId: grant.id },
  });
  return tokenResponse(access, refresh, record.scopes, accessExpiresAt, now);
}

export interface RefreshInput {
  client: OAuthClientRecord;
  refreshToken: string | null;
  scope: string | null;
  resource: string | null;
}

/**
 * refresh_token grant with rotation. Every use consumes the presented refresh
 * token atomically and issues a new pair; presenting an already rotated token
 * is treated as theft and revokes the whole grant.
 */
export async function refreshAccessToken(
  input: RefreshInput,
  now: Date = new Date(),
): Promise<OAuthTokenResponse> {
  const { client, refreshToken } = input;
  if (!refreshToken)
    throw new OAuthError("invalid_request", "refresh_token is required");
  if (!isRefreshTokenShape(refreshToken)) throw invalidGrant();
  const record = await prisma.mcpOAuthToken.findUnique({
    where: { tokenHash: hashSecret(refreshToken) },
    select: {
      id: true,
      kind: true,
      expiresAt: true,
      usedAt: true,
      grant: {
        select: {
          id: true,
          clientRowId: true,
          scopes: true,
          resource: true,
          expiresAt: true,
          revokedAt: true,
          user: { select: userSelect },
        },
      },
    },
  });
  if (!record || record.kind !== "refresh") throw invalidGrant();
  const { grant } = record;
  if (grant.clientRowId !== client.id) throw invalidGrant();
  if (record.usedAt) {
    await revokeGrant(grant.id, now);
    throw invalidGrant();
  }
  if (
    grant.revokedAt ||
    grant.expiresAt.getTime() <= now.getTime() ||
    record.expiresAt.getTime() <= now.getTime()
  )
    throw invalidGrant();
  if (input.scope !== null) {
    const requested = input.scope.split(/\s+/).filter(Boolean);
    if (!requested.every((scope) => (grant.scopes as string[]).includes(scope)))
      throw new OAuthError("invalid_scope", "Scope exceeds the grant");
  }
  if (
    input.resource !== null &&
    !resourceMatches(input.resource, grant.resource)
  )
    throw new OAuthError("invalid_target", "Unknown resource");
  if (!userIsAllowed(grant.user)) throw invalidGrant();

  const claimed = await prisma.mcpOAuthToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) {
    await revokeGrant(grant.id, now);
    throw invalidGrant();
  }

  const access = generateAccessToken();
  const refresh = generateRefreshToken();
  const accessExpiresAt = new Date(
    Math.min(
      now.getTime() + OAUTH_ACCESS_TOKEN_TTL_MS,
      grant.expiresAt.getTime(),
    ),
  );
  await prisma.mcpOAuthToken.createMany({
    data: [
      {
        grantId: grant.id,
        kind: "access",
        tokenHash: hashSecret(access),
        expiresAt: accessExpiresAt,
      },
      {
        grantId: grant.id,
        kind: "refresh",
        tokenHash: hashSecret(refresh),
        expiresAt: grant.expiresAt,
      },
    ],
  });
  await pruneGrantTokens(grant.id, now);
  return tokenResponse(access, refresh, grant.scopes, accessExpiresAt, now);
}

/**
 * Drops lapsed access tokens. Rotated (used) refresh tokens are deliberately
 * kept until the grant itself is purged: presenting any of them again must
 * still revoke the grant, however old it is (reuse detection, OAuth 2.1).
 */
async function pruneGrantTokens(grantId: string, now: Date): Promise<void> {
  try {
    await prisma.mcpOAuthToken.deleteMany({
      where: { grantId, kind: "access", expiresAt: { lt: now } },
    });
  } catch {
    console.error("mcp_oauth_token_prune_failed");
  }
}

/**
 * RFC 7009 revocation. Revoking either token of a grant revokes the grant
 * (access and refresh). Unknown tokens and other clients' tokens are ignored.
 */
export async function revokeOAuthToken(
  client: OAuthClientRecord,
  token: string,
  now: Date = new Date(),
): Promise<void> {
  if (!isAccessTokenShape(token) && !isRefreshTokenShape(token)) return;
  const record = await prisma.mcpOAuthToken.findUnique({
    where: { tokenHash: hashSecret(token) },
    select: { grant: { select: { id: true, clientRowId: true } } },
  });
  if (!record || record.grant.clientRowId !== client.id) return;
  await revokeGrant(record.grant.id, now);
}

export type OAuthAccessResult =
  | {
      ok: true;
      grantId: string;
      scopes: McpTokenScopeValue[];
      /** Expiry of the connection (grant), not of the 1 h access token. */
      expiresAt: Date;
      lastUsedAt: Date | null;
      user: OAuthUserRecord;
    }
  | { ok: false; code: "invalid_token" | "revoked_token" | "expired_token" };

/**
 * Resolves an OAuth access token for the MCP resource. The token must belong
 * to a live, unrevoked grant issued for exactly this resource (audience); the
 * owner is returned so the caller rechecks role and status on every request.
 */
export async function resolveOAuthAccessToken(
  secret: string,
  canonicalResource: string,
  now: Date = new Date(),
): Promise<OAuthAccessResult> {
  if (!isAccessTokenShape(secret)) return { ok: false, code: "invalid_token" };
  const record = await prisma.mcpOAuthToken.findUnique({
    where: { tokenHash: hashSecret(secret) },
    select: {
      kind: true,
      expiresAt: true,
      grant: {
        select: {
          id: true,
          scopes: true,
          resource: true,
          expiresAt: true,
          revokedAt: true,
          lastUsedAt: true,
          user: { select: userSelect },
        },
      },
    },
  });
  if (!record || record.kind !== "access")
    return { ok: false, code: "invalid_token" };
  const { grant } = record;
  if (grant.revokedAt) return { ok: false, code: "revoked_token" };
  if (
    record.expiresAt.getTime() <= now.getTime() ||
    grant.expiresAt.getTime() <= now.getTime()
  )
    return { ok: false, code: "expired_token" };
  if (grant.resource !== canonicalResource)
    return { ok: false, code: "invalid_token" };
  return {
    ok: true,
    grantId: grant.id,
    lastUsedAt: grant.lastUsedAt,
    scopes: grant.scopes,
    expiresAt: grant.expiresAt,
    user: grant.user,
  };
}

/** Throttled usage bookkeeping; call after the owner checks passed. */
export async function touchOAuthGrant(
  grantId: string,
  lastUsedAt: Date | null,
  now: Date,
): Promise<void> {
  if (
    lastUsedAt &&
    now.getTime() - lastUsedAt.getTime() < OAUTH_LAST_USED_WINDOW_MS
  )
    return;
  try {
    await prisma.mcpOAuthGrant.update({
      where: { id: grantId },
      data: { lastUsedAt: now },
    });
  } catch {
    console.error("mcp_oauth_touch_failed");
  }
}
