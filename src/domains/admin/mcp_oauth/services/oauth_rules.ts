import type { McpTokenScopeValue } from "@/domains/admin/mcp/types/mcp_token";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { OAuthAccess, OAuthClientAuthMethod } from "../types/oauth_types";
import { OAUTH_ACCESS } from "../types/oauth_types";
import { OAUTH_RESOURCE_PATH, isLoopbackHostname } from "./oauth_origin";

// Lifetimes (product decision): 1 h access, 90 day grant, 10 min code.
export const OAUTH_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
export const OAUTH_CODE_TTL_MS = 10 * 60 * 1000;
export const OAUTH_GRANT_TTL_DAYS = 90;
export const OAUTH_GRANT_TTL_MS = OAUTH_GRANT_TTL_DAYS * 24 * 60 * 60 * 1000;
export const OAUTH_LAST_USED_WINDOW_MS = 60_000;

// Abuse limits.
export const OAUTH_MAX_ACTIVE_GRANTS_PER_USER = 25;
export const OAUTH_MAX_DYNAMIC_CLIENTS = 1000;
export const OAUTH_MAX_UNUSED_DYNAMIC_CLIENTS = 200;
export const OAUTH_UNUSED_CLIENT_RETENTION_MS = 24 * 60 * 60 * 1000;
export const OAUTH_MAX_METADATA_CLIENTS = 500;
export const OAUTH_REGISTRATION_BODY_MAX_BYTES = 16_384;
export const OAUTH_MAX_REDIRECT_URIS = 5;
export const OAUTH_REDIRECT_URI_MAX_LENGTH = 512;
export const OAUTH_CLIENT_NAME_MAX_LENGTH = 100;
export const OAUTH_STATE_MAX_LENGTH = 1024;
export const OAUTH_CLIENT_ID_MAX_LENGTH = 512;
export const OAUTH_RETIRED_REFRESH_KEPT = 3;
/** Revoked/expired grants are physically removed after this long. */
export const OAUTH_EXPIRED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const OAUTH_SCOPES_SUPPORTED: readonly McpTokenScopeValue[] = [
  "read",
  "write",
];

// Secrets: 32 random bytes (256 bits), base64url, with a recognizable prefix.
export const OAUTH_ACCESS_PREFIX = "sla_";
export const OAUTH_REFRESH_PREFIX = "slr_";
export const OAUTH_CODE_PREFIX = "slc_";
export const OAUTH_CLIENT_ID_PREFIX = "slcid_";
export const OAUTH_CLIENT_SECRET_PREFIX = "slcs_";
const SECRET_BODY = "[A-Za-z0-9_-]{43}";
const ACCESS_PATTERN = new RegExp(`^${OAUTH_ACCESS_PREFIX}${SECRET_BODY}$`);
const REFRESH_PATTERN = new RegExp(`^${OAUTH_REFRESH_PREFIX}${SECRET_BODY}$`);
const CODE_PATTERN = new RegExp(`^${OAUTH_CODE_PREFIX}${SECRET_BODY}$`);

function randomSecret(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}

export const generateAccessToken = (): string =>
  randomSecret(OAUTH_ACCESS_PREFIX);
export const generateRefreshToken = (): string =>
  randomSecret(OAUTH_REFRESH_PREFIX);
export const generateAuthorizationCode = (): string =>
  randomSecret(OAUTH_CODE_PREFIX);
export const generateClientSecret = (): string =>
  randomSecret(OAUTH_CLIENT_SECRET_PREFIX);
export const generateClientId = (): string =>
  `${OAUTH_CLIENT_ID_PREFIX}${randomBytes(16).toString("base64url")}`;

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export const isAccessTokenShape = (value: string): boolean =>
  ACCESS_PATTERN.test(value);
export const isRefreshTokenShape = (value: string): boolean =>
  REFRESH_PATTERN.test(value);
export const isAuthorizationCodeShape = (value: string): boolean =>
  CODE_PATTERN.test(value);

/** Constant-time comparison of two strings of the same alphabet. */
export function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Returns the Bearer value of an Authorization header, without validating it. */
export function readBearerValue(header: string | null): string | null {
  if (!header) return null;
  return /^Bearer ([^\s]+)$/i.exec(header.trim())?.[1] ?? null;
}

// --- PKCE (RFC 7636, S256 only) ---------------------------------------------

const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export const isCodeChallengeShape = (value: string): boolean =>
  CHALLENGE_PATTERN.test(value);
export const isCodeVerifierShape = (value: string): boolean =>
  VERIFIER_PATTERN.test(value);

export function challengeForVerifier(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  return (
    isCodeVerifierShape(verifier) &&
    hashesEqual(challengeForVerifier(verifier), challenge)
  );
}

// --- Redirect URIs ------------------------------------------------------------

/**
 * Parses a redirect URI under the registration rules: https, or http on a
 * loopback host (native clients). No fragments, no credentials, bounded size.
 */
export function parseRedirectUri(raw: string): URL | null {
  if (!raw || raw.length > OAUTH_REDIRECT_URI_MAX_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.hash || raw.includes("#") || url.username || url.password)
    return null;
  if (url.protocol === "https:") return url.hostname ? url : null;
  if (url.protocol === "http:" && isLoopbackHostname(url.hostname)) return url;
  return null;
}

export function isValidRedirectUri(raw: string): boolean {
  return parseRedirectUri(raw) !== null;
}

/**
 * Exact string match against the registered URIs. Loopback http URIs may
 * differ only in their port (RFC 8252 section 7.3): native clients bind an
 * ephemeral one.
 */
export function redirectUriMatches(
  registered: readonly string[],
  requested: string,
): boolean {
  if (registered.includes(requested)) return true;
  const target = parseRedirectUri(requested);
  if (!target || target.protocol !== "http:") return false;
  return registered.some((candidate) => {
    const url = parseRedirectUri(candidate);
    return (
      url !== null &&
      url.protocol === "http:" &&
      url.hostname === target.hostname &&
      url.pathname === target.pathname &&
      url.search === target.search
    );
  });
}

// --- Resource indicators (RFC 8707) -------------------------------------------

/**
 * True when `requested` identifies this MCP server: the canonical resource or,
 * leniently, the bare origin of the same server. Scheme/host case and a
 * trailing slash are ignored; queries and fragments never match.
 */
export function resourceMatches(
  requested: string,
  canonicalResource: string,
): boolean {
  let candidate: URL;
  let canonical: URL;
  try {
    candidate = new URL(requested);
    canonical = new URL(canonicalResource);
  } catch {
    return false;
  }
  if (candidate.search || candidate.hash || requested.includes("#"))
    return false;
  if (candidate.origin !== canonical.origin) return false;
  const path = candidate.pathname.replace(/\/+$/, "");
  return path === "" || path === OAUTH_RESOURCE_PATH;
}

// --- Scopes -------------------------------------------------------------------

export function scopesForOAuthAccess(
  access: OAuthAccess,
): McpTokenScopeValue[] {
  return access === OAUTH_ACCESS.readWrite ? ["read", "write"] : ["read"];
}

/** Scopes the client asked for; only a hint for the consent screen. */
export function parseRequestedScopes(
  raw: string | undefined,
): McpTokenScopeValue[] {
  const found = new Set<McpTokenScopeValue>();
  for (const item of (raw ?? "").slice(0, 200).split(/\s+/)) {
    if (item === "read" || item === "write") found.add(item);
  }
  return [...found];
}

export function scopeString(scopes: readonly McpTokenScopeValue[]): string {
  return scopes.join(" ");
}

// --- Client metadata (DCR body and CIMD document) -----------------------------

const AUTH_METHODS = [
  "none",
  "client_secret_basic",
  "client_secret_post",
] as const;

const redirectUriList = z
  .array(z.string().max(OAUTH_REDIRECT_URI_MAX_LENGTH))
  .min(1)
  .max(OAUTH_MAX_REDIRECT_URIS)
  .refine((uris) => uris.every(isValidRedirectUri));

const httpsUrl = z
  .string()
  .max(OAUTH_REDIRECT_URI_MAX_LENGTH)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  });

const sharedClientFields = {
  redirect_uris: redirectUriList,
  client_name: z
    .string()
    .trim()
    .min(1)
    .max(OAUTH_CLIENT_NAME_MAX_LENGTH)
    .optional(),
  client_uri: httpsUrl.optional(),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .max(2)
    .optional(),
  response_types: z.array(z.literal("code")).max(1).optional(),
  scope: z.string().max(200).optional(),
};

/** RFC 7591 registration request. Unknown members are ignored. */
export const dynamicRegistrationSchema = z.object({
  ...sharedClientFields,
  token_endpoint_auth_method: z.enum(AUTH_METHODS).optional(),
  application_type: z.enum(["native", "web"]).optional(),
});

/** Client ID Metadata Document: public clients only. */
export const clientMetadataDocumentSchema = z.object({
  ...sharedClientFields,
  client_id: z.string().max(OAUTH_CLIENT_ID_MAX_LENGTH),
  token_endpoint_auth_method: z.literal("none").optional(),
});

export type DynamicRegistrationInput = z.infer<
  typeof dynamicRegistrationSchema
>;
export type ClientMetadataDocument = z.infer<
  typeof clientMetadataDocumentSchema
>;

export function resolveAuthMethod(
  requested: OAuthClientAuthMethod | undefined,
): OAuthClientAuthMethod {
  // RFC 7591 defaults to client_secret_basic, but MCP clients are public
  // clients that rely on PKCE; omitting the member means "none" here.
  return requested ?? "none";
}

/** Fallback display name: the host of the first redirect URI. */
export function fallbackClientName(redirectUris: readonly string[]): string {
  const host = parseRedirectUri(redirectUris[0] ?? "")?.host;
  return (host ?? "client").slice(0, OAUTH_CLIENT_NAME_MAX_LENGTH);
}

export function redirectHost(redirectUri: string): string {
  try {
    return new URL(redirectUri).host;
  } catch {
    return "";
  }
}

/** True when every redirect URI is a loopback address (impersonable locally). */
export function onlyLoopbackRedirects(uris: readonly string[]): boolean {
  return uris.every((uri) => {
    try {
      return isLoopbackHostname(new URL(uri).hostname);
    } catch {
      return false;
    }
  });
}

/** client_id values that are https URLs name a Client ID Metadata Document. */
export function isMetadataDocumentClientId(clientId: string): boolean {
  return /^https:\/\//i.test(clientId);
}

/**
 * CIMD client_id rules: https, a path, no fragment/credentials, default port
 * and a DNS name (never an IP literal or single-label host).
 */
export function isAcceptableMetadataDocumentUrl(clientId: string): boolean {
  if (clientId.length > OAUTH_CLIENT_ID_MAX_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.href === clientId &&
    !url.hash &&
    !url.username &&
    !url.password &&
    url.port === "" &&
    url.pathname.length > 1 &&
    url.hostname.includes(".") &&
    !/^[\d.]+$/.test(url.hostname) &&
    !url.hostname.startsWith("[")
  );
}
