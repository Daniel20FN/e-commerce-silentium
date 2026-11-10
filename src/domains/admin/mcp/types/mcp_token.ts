export const MCP_TOKEN_SCOPE = {
  read: "read",
  write: "write",
} as const;

export type McpTokenScopeValue =
  (typeof MCP_TOKEN_SCOPE)[keyof typeof MCP_TOKEN_SCOPE];

/** Access level chosen when creating a token. Writing always includes reading. */
export const MCP_TOKEN_ACCESS = {
  read: "read",
  readWrite: "read_write",
} as const;

export type McpTokenAccess =
  (typeof MCP_TOKEN_ACCESS)[keyof typeof MCP_TOKEN_ACCESS];

export const MCP_TOKEN_ACCESS_VALUES = [
  MCP_TOKEN_ACCESS.read,
  MCP_TOKEN_ACCESS.readWrite,
] as const;

/** Allowed lifetimes in days; the last entry is the hard maximum. */
export const MCP_TOKEN_EXPIRY_DAYS_VALUES = [30, 90] as const;

export type McpTokenExpiryDays = (typeof MCP_TOKEN_EXPIRY_DAYS_VALUES)[number];

export type McpTokenState = "active" | "expired" | "revoked";

/** Client-safe projection of a token: never contains the secret or its hash. */
export interface McpTokenDto {
  id: string;
  name: string;
  prefix: string;
  scopes: McpTokenScopeValue[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  state: McpTokenState;
}
