import { oauthContext } from "@/domains/admin/mcp_oauth/services/oauth_origin";
import {
  isAccessTokenShape,
  readBearerValue,
} from "@/domains/admin/mcp_oauth/services/oauth_rules";
import {
  resolveOAuthAccessToken,
  touchOAuthGrant,
} from "@/domains/admin/mcp_oauth/services/oauth_token_service";
import { hasAdminAccess } from "@/domains/admin/services/admin_roles";
import { isDeletedAccount } from "@/domains/auth/services/deleted_account";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { prisma } from "@/lib/prisma";
import "server-only";
import type { McpTokenScopeValue } from "../types/mcp_token";
import {
  MCP_TOKEN_LAST_USED_WINDOW_MS,
  extractBearerSecret,
  hashTokenSecret,
} from "./mcp_token_rules";

export interface McpActor {
  /** Business user id, recorded as the actor of every mutation. */
  id: string;
  label: string;
  /** Owner's current administrative role, re-read on every request. */
  role: CurrentUserDto["role"];
  tokenId: string;
  scopes: readonly McpTokenScopeValue[];
  expiresAt: Date;
}

export type McpAuthFailureCode =
  | "missing_token"
  | "invalid_token"
  | "revoked_token"
  | "expired_token"
  | "user_unavailable"
  | "forbidden_role";

export type McpAuthResult =
  | { ok: true; actor: McpActor }
  | { ok: false; status: 401 | 403; code: McpAuthFailureCode };

function reject(status: 401 | 403, code: McpAuthFailureCode): McpAuthResult {
  return { ok: false, status, code };
}

/**
 * Authenticates an MCP request. Only the `Authorization: Bearer` header is
 * read: cookies and Supabase sessions are never an accepted credential. The
 * owner's role and status are re-read from the database on every call, so
 * demoting, blocking or deleting a user cuts agent access immediately.
 */
export async function authenticateMcpRequest(
  request: Request,
  now: Date = new Date(),
): Promise<McpAuthResult> {
  const header = request.headers.get("authorization");
  if (!header) return reject(401, "missing_token");
  const bearer = readBearerValue(header);
  if (bearer && isAccessTokenShape(bearer))
    return authenticateOAuthBearer(bearer, request, now);
  const secret = extractBearerSecret(header);
  if (!secret) return reject(401, "invalid_token");

  const token = await prisma.mcpAccessToken.findUnique({
    where: { tokenHash: hashTokenSecret(secret) },
    select: {
      id: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!token) return reject(401, "invalid_token");
  if (token.revokedAt) return reject(401, "revoked_token");
  if (token.expiresAt.getTime() <= now.getTime())
    return reject(401, "expired_token");

  const { user } = token;
  if (user.status !== "active" || isDeletedAccount(user.email))
    return reject(403, "user_unavailable");
  if (!hasAdminAccess(user.role)) return reject(403, "forbidden_role");

  await touchLastUsed(token.id, token.lastUsedAt, now);
  return {
    ok: true,
    actor: {
      id: user.id,
      label:
        [user.profile?.firstName, user.profile?.lastName]
          .filter(Boolean)
          .join(" ") || user.email,
      role: user.role,
      tokenId: token.id,
      scopes: token.scopes,
      expiresAt: token.expiresAt,
    },
  };
}

async function touchLastUsed(
  tokenId: string,
  lastUsedAt: Date | null,
  now: Date,
): Promise<void> {
  if (
    lastUsedAt &&
    now.getTime() - lastUsedAt.getTime() < MCP_TOKEN_LAST_USED_WINDOW_MS
  )
    return;
  try {
    await prisma.mcpAccessToken.update({
      where: { id: tokenId },
      data: { lastUsedAt: now },
    });
  } catch {
    // Usage bookkeeping must never block an authenticated request.
    console.error("mcp_token_touch_failed");
  }
}

/**
 * OAuth access tokens resolve to the same actor as personal tokens: the grant
 * must be live and issued for this exact resource, and the owner's role and
 * status are re-read on every request.
 */
async function authenticateOAuthBearer(
  secret: string,
  request: Request,
  now: Date,
): Promise<McpAuthResult> {
  const { resource } = oauthContext(request.url);
  const resolved = await resolveOAuthAccessToken(secret, resource, now);
  if (!resolved.ok) return reject(401, resolved.code);
  const { user } = resolved;
  if (user.status !== "active" || isDeletedAccount(user.email))
    return reject(403, "user_unavailable");
  if (!hasAdminAccess(user.role)) return reject(403, "forbidden_role");
  await touchOAuthGrant(resolved.grantId, resolved.lastUsedAt, now);
  return {
    ok: true,
    actor: {
      id: user.id,
      label:
        [user.profile?.firstName, user.profile?.lastName]
          .filter(Boolean)
          .join(" ") || user.email,
      role: user.role,
      tokenId: resolved.grantId,
      scopes: resolved.scopes,
      expiresAt: resolved.expiresAt,
    },
  };
}
