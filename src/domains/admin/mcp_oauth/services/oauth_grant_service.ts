import { prisma } from "@/lib/prisma";
import "server-only";
import type { McpOAuthGrantDto, OAuthGrantState } from "../types/oauth_types";
import { redirectHost } from "./oauth_rules";

export class McpOAuthGrantError extends Error {
  constructor(
    public readonly code:
      | "mcp_oauth_grant_not_found"
      | "mcp_oauth_grant_not_revoked",
    public readonly status: 404 | 409,
  ) {
    super(code);
  }
}

const grantSelect = {
  id: true,
  scopes: true,
  createdAt: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  client: {
    select: {
      name: true,
      clientUri: true,
      source: true,
      redirectUris: true,
    },
  },
} as const;

interface GrantRecord {
  id: string;
  scopes: ("read" | "write")[];
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  client: {
    name: string;
    clientUri: string | null;
    source: "dynamic" | "metadata_document";
    redirectUris: string[];
  };
}

export function resolveGrantState(
  grant: { revokedAt: Date | null; expiresAt: Date },
  now: Date,
): OAuthGrantState {
  if (grant.revokedAt) return "revoked";
  return grant.expiresAt.getTime() <= now.getTime() ? "expired" : "active";
}

export function toGrantDto(grant: GrantRecord, now: Date): McpOAuthGrantDto {
  return {
    id: grant.id,
    clientName: grant.client.name,
    clientUri: grant.client.clientUri,
    clientSource: grant.client.source,
    redirectHost: redirectHost(grant.client.redirectUris[0] ?? ""),
    scopes: grant.scopes,
    createdAt: grant.createdAt.toISOString(),
    lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
    expiresAt: grant.expiresAt.toISOString(),
    revokedAt: grant.revokedAt?.toISOString() ?? null,
    state: resolveGrantState(grant, now),
  };
}

export async function listOAuthGrants(
  userId: string,
  now: Date = new Date(),
): Promise<McpOAuthGrantDto[]> {
  const records = await prisma.mcpOAuthGrant.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: grantSelect,
  });
  return records.map((record) => toGrantDto(record, now));
}

/** Revokes one of the caller's own grants: access and refresh die together. */
export async function revokeOAuthGrant(
  userId: string,
  grantId: string,
  now: Date = new Date(),
): Promise<McpOAuthGrantDto> {
  const result = await prisma.mcpOAuthGrant.updateMany({
    where: { id: grantId, userId, revokedAt: null },
    data: { revokedAt: now },
  });
  const record = await prisma.mcpOAuthGrant.findFirst({
    where: { id: grantId, userId },
    select: grantSelect,
  });
  if (!record || (result.count === 0 && !record.revokedAt))
    throw new McpOAuthGrantError("mcp_oauth_grant_not_found", 404);
  return toGrantDto(record, now);
}

/** Deletes a grant only if already revoked; the condition lives in the DELETE. */
export async function deleteRevokedOAuthGrant(
  userId: string,
  grantId: string,
): Promise<{ id: string }> {
  const result = await prisma.mcpOAuthGrant.deleteMany({
    where: { id: grantId, userId, revokedAt: { not: null } },
  });
  if (result.count > 0) return { id: grantId };
  const existing = await prisma.mcpOAuthGrant.findFirst({
    where: { id: grantId, userId },
    select: { id: true },
  });
  if (!existing) throw new McpOAuthGrantError("mcp_oauth_grant_not_found", 404);
  throw new McpOAuthGrantError("mcp_oauth_grant_not_revoked", 409);
}
