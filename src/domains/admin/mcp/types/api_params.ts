import type { McpTokenAccess, McpTokenExpiryDays } from "./mcp_token";

export interface McpTokenCreateParams {
  name: string;
  access: McpTokenAccess;
  expiresInDays: McpTokenExpiryDays;
  currentPassword: string;
}
