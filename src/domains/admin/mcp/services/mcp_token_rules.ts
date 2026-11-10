import { createHash, randomBytes } from "node:crypto";
import type {
  McpTokenAccess,
  McpTokenDto,
  McpTokenScopeValue,
  McpTokenState,
} from "../types/mcp_token";
import { MCP_TOKEN_ACCESS, MCP_TOKEN_SCOPE } from "../types/mcp_token";

export const MCP_TOKEN_PREFIX = "slm_";
/** 32 random bytes = 256 bits of CSPRNG entropy, base64url encoded (43 chars). */
export const MCP_TOKEN_SECRET_BYTES = 32;
const MCP_TOKEN_SECRET_PATTERN = /^slm_[A-Za-z0-9_-]{43}$/;
/** Characters of the secret kept (after the recognizable prefix) for display. */
const MCP_TOKEN_DISPLAY_CHARS = 6;
export const MCP_TOKEN_MAX_ACTIVE_PER_USER = 10;
export const MCP_TOKEN_NAME_MAX_LENGTH = 80;
/** lastUsedAt is refreshed at most once per window to avoid a write per call. */
export const MCP_TOKEN_LAST_USED_WINDOW_MS = 60_000;

export function generateTokenSecret(): string {
  return `${MCP_TOKEN_PREFIX}${randomBytes(MCP_TOKEN_SECRET_BYTES).toString("base64url")}`;
}

export function hashTokenSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function isTokenSecretShape(value: string): boolean {
  return MCP_TOKEN_SECRET_PATTERN.test(value);
}

export function displayPrefix(secret: string): string {
  return secret.slice(0, MCP_TOKEN_PREFIX.length + MCP_TOKEN_DISPLAY_CHARS);
}

export function scopesForAccess(access: McpTokenAccess): McpTokenScopeValue[] {
  return access === MCP_TOKEN_ACCESS.readWrite
    ? [MCP_TOKEN_SCOPE.read, MCP_TOKEN_SCOPE.write]
    : [MCP_TOKEN_SCOPE.read];
}

export function expiryFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function resolveTokenState(
  token: { revokedAt: Date | null; expiresAt: Date },
  now: Date,
): McpTokenState {
  if (token.revokedAt) return "revoked";
  return token.expiresAt.getTime() <= now.getTime() ? "expired" : "active";
}

export interface McpTokenRecordProjection {
  id: string;
  name: string;
  prefix: string;
  scopes: McpTokenScopeValue[];
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

export function toMcpTokenDto(
  token: McpTokenRecordProjection,
  now: Date,
): McpTokenDto {
  return {
    id: token.id,
    name: token.name,
    prefix: token.prefix,
    scopes: token.scopes,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    expiresAt: token.expiresAt.toISOString(),
    revokedAt: token.revokedAt?.toISOString() ?? null,
    state: resolveTokenState(token, now),
  };
}

export function extractBearerSecret(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer ([^\s]+)$/i.exec(header.trim());
  const secret = match?.[1];
  return secret && isTokenSecretShape(secret) ? secret : null;
}
