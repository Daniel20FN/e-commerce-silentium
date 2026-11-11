import { STOREFRONT_ORIGIN } from "@/domains/storefront/services/seo_rules";

/** The single protected resource of this authorization server. */
export const OAUTH_RESOURCE_PATH = "/api/mcp";
export const OAUTH_PRM_PATH = "/.well-known/oauth-protected-resource";
export const OAUTH_AS_METADATA_PATH = "/.well-known/oauth-authorization-server";
export const OAUTH_AUTHORIZE_PATH = "/oauth/authorize";
export const OAUTH_TOKEN_PATH = "/api/oauth/token";
export const OAUTH_REGISTER_PATH = "/api/oauth/register";
export const OAUTH_REVOKE_PATH = "/api/oauth/revoke";

type OAuthEnv = Readonly<Record<string, string | undefined>>;

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"] as const;

export function isLoopbackHostname(hostname: string): boolean {
  return (LOOPBACK_HOSTS as readonly string[]).includes(hostname);
}

function cleanHttpsOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      isLoopbackHostname(url.hostname)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export interface OAuthContext {
  issuer: string;
  resource: string;
  protectedResourceMetadataUrl: string;
  protectedResourceMetadataPathUrl: string;
  authorizationServerMetadataUrl: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint: string;
  revocationEndpoint: string;
  /** True when the origin comes from the request (local development only). */
  localDevelopment: boolean;
}

/**
 * Resolves the origin all OAuth URLs derive from. Production never trusts the
 * Host header: it uses APP_PUBLIC_URL, Vercel's production URL or the canonical
 * storefront origin. The request origin is honoured only in explicit local
 * development (`NODE_ENV=development`, i.e. `next dev`) and only for loopback
 * hosts, so local servers can be tested end to end. Any other mode (`next
 * start`, previews, tests, unset NODE_ENV) requires the configured origin.
 */
export function trustedOAuthOrigin(
  requestUrl: string,
  env: OAuthEnv = process.env,
): { origin: string; localDevelopment: boolean } {
  if (env.NODE_ENV === "development" && env.VERCEL_ENV !== "production") {
    try {
      const url = new URL(requestUrl);
      if (
        isLoopbackHostname(url.hostname) &&
        (url.protocol === "http:" || url.protocol === "https:")
      )
        return { origin: url.origin, localDevelopment: true };
    } catch {
      // Fall through to the configured origin.
    }
  }
  const configured =
    cleanHttpsOrigin(env.APP_PUBLIC_URL) ??
    cleanHttpsOrigin(
      env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
    );
  return {
    origin: configured ?? STOREFRONT_ORIGIN,
    localDevelopment: false,
  };
}

export function oauthContext(
  requestUrl: string,
  env: OAuthEnv = process.env,
): OAuthContext {
  const { origin, localDevelopment } = trustedOAuthOrigin(requestUrl, env);
  return {
    issuer: origin,
    resource: `${origin}${OAUTH_RESOURCE_PATH}`,
    protectedResourceMetadataUrl: `${origin}${OAUTH_PRM_PATH}`,
    protectedResourceMetadataPathUrl: `${origin}${OAUTH_PRM_PATH}${OAUTH_RESOURCE_PATH}`,
    authorizationServerMetadataUrl: `${origin}${OAUTH_AS_METADATA_PATH}`,
    authorizationEndpoint: `${origin}${OAUTH_AUTHORIZE_PATH}`,
    tokenEndpoint: `${origin}${OAUTH_TOKEN_PATH}`,
    registrationEndpoint: `${origin}${OAUTH_REGISTER_PATH}`,
    revocationEndpoint: `${origin}${OAUTH_REVOKE_PATH}`,
    localDevelopment,
  };
}
