import { prisma } from "@/lib/prisma";
import "server-only";
import type { McpTokenAccess, McpTokenDto } from "../types/mcp_token";
import {
  MCP_TOKEN_MAX_ACTIVE_PER_USER,
  displayPrefix,
  expiryFrom,
  generateTokenSecret,
  hashTokenSecret,
  scopesForAccess,
  toMcpTokenDto,
} from "./mcp_token_rules";

export class McpTokenError extends Error {
  constructor(
    public readonly code: "mcp_token_limit" | "mcp_token_not_found",
    public readonly status: 404 | 409,
  ) {
    super(code);
  }
}

const tokenSelect = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  createdAt: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
} as const;

export interface McpTokenCreateInput {
  name: string;
  access: McpTokenAccess;
  expiresInDays: number;
}

/**
 * Creates a token for `userId`. The plaintext secret only exists in the return
 * value; the database stores its SHA-256 hash.
 */
export async function createMcpToken(
  userId: string,
  input: McpTokenCreateInput,
  now: Date = new Date(),
): Promise<{ token: McpTokenDto; secret: string }> {
  const active = await prisma.mcpAccessToken.count({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
  });
  if (active >= MCP_TOKEN_MAX_ACTIVE_PER_USER)
    throw new McpTokenError("mcp_token_limit", 409);
  const secret = generateTokenSecret();
  const record = await prisma.mcpAccessToken.create({
    data: {
      userId,
      name: input.name,
      tokenHash: hashTokenSecret(secret),
      prefix: displayPrefix(secret),
      scopes: scopesForAccess(input.access),
      expiresAt: expiryFrom(now, input.expiresInDays),
    },
    select: tokenSelect,
  });
  return { token: toMcpTokenDto(record, now), secret };
}

export async function listMcpTokens(
  userId: string,
  now: Date = new Date(),
): Promise<McpTokenDto[]> {
  const records = await prisma.mcpAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: tokenSelect,
  });
  return records.map((record) => toMcpTokenDto(record, now));
}

/** Revokes one of the caller's own tokens; other users' tokens look missing. */
export async function revokeMcpToken(
  userId: string,
  tokenId: string,
  now: Date = new Date(),
): Promise<McpTokenDto> {
  const result = await prisma.mcpAccessToken.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: now },
  });
  const record = await prisma.mcpAccessToken.findFirst({
    where: { id: tokenId, userId },
    select: tokenSelect,
  });
  if (!record || (result.count === 0 && !record.revokedAt))
    throw new McpTokenError("mcp_token_not_found", 404);
  return toMcpTokenDto(record, now);
}
