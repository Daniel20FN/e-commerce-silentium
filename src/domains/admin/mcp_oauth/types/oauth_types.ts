import type { McpTokenScopeValue } from "@/domains/admin/mcp/types/mcp_token";

export type OAuthClientSource = "dynamic" | "metadata_document";
export type OAuthClientAuthMethod =
  | "none"
  | "client_secret_basic"
  | "client_secret_post";

/** Access level the person grants on the consent screen. */
export const OAUTH_ACCESS = {
  read: "read",
  readWrite: "read_write",
} as const;
export type OAuthAccess = (typeof OAUTH_ACCESS)[keyof typeof OAUTH_ACCESS];
export const OAUTH_ACCESS_VALUES = [
  OAUTH_ACCESS.read,
  OAUTH_ACCESS.readWrite,
] as const;

/** Raw authorization request parameters as received (all optional strings). */
export interface OAuthAuthorizeParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  scope?: string;
  resource?: string;
}

export interface OAuthClientRecord {
  id: string;
  clientId: string;
  source: OAuthClientSource;
  name: string;
  clientUri: string | null;
  redirectUris: string[];
  authMethod: OAuthClientAuthMethod;
  secretHash: string | null;
  metadataExpiresAt: Date | null;
}

export interface OAuthValidatedAuthorization {
  client: OAuthClientRecord;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  state: string | null;
  requestedScopes: McpTokenScopeValue[];
}

export type OAuthGrantState = "active" | "expired" | "revoked";

/** Client-safe projection of a grant: never contains tokens or hashes. */
export interface McpOAuthGrantDto {
  id: string;
  clientName: string;
  clientUri: string | null;
  clientSource: OAuthClientSource;
  redirectHost: string;
  scopes: McpTokenScopeValue[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  state: OAuthGrantState;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}
