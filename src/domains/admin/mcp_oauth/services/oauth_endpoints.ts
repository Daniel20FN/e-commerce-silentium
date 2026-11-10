import "server-only";
import {
  authenticateOAuthClient,
  dynamicRegistrationResponse,
  registerDynamicClient,
} from "./oauth_client_service";
import {
  OAuthError,
  oauthErrorResponse,
  oauthJson,
  readLimitedText,
} from "./oauth_http";
import { oauthContext } from "./oauth_origin";
import {
  OAUTH_REGISTRATION_BODY_MAX_BYTES,
  dynamicRegistrationSchema,
} from "./oauth_rules";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
  revokeOAuthToken,
} from "./oauth_token_service";

function unexpected(scope: string): Response {
  console.error(`mcp_oauth_${scope}_failed`);
  return oauthJson(503, {
    error: "server_error",
    error_description: "Temporarily unavailable",
  });
}

/** POST /api/oauth/register: RFC 7591 dynamic client registration. */
export async function handleRegistration(request: Request): Promise<Response> {
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new OAuthError(
        "invalid_client_metadata",
        "Content-Type must be application/json",
      );
    const text = await readLimitedText(
      request,
      OAUTH_REGISTRATION_BODY_MAX_BYTES,
    );
    if (text === null)
      throw new OAuthError("invalid_client_metadata", "Request too large", 413);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new OAuthError("invalid_client_metadata", "Malformed JSON");
    }
    const parsed = dynamicRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      const redirectIssue = parsed.error.issues.some(
        (issue) => issue.path[0] === "redirect_uris",
      );
      throw new OAuthError(
        redirectIssue ? "invalid_redirect_uri" : "invalid_client_metadata",
        redirectIssue
          ? "redirect_uris must be https URLs or http loopback URLs without fragments"
          : "Invalid client metadata",
      );
    }
    const { grant_types: grantTypes } = parsed.data;
    if (grantTypes && !grantTypes.includes("authorization_code"))
      throw new OAuthError(
        "invalid_client_metadata",
        "authorization_code grant is required",
      );
    const registered = await registerDynamicClient(parsed.data);
    return oauthJson(201, dynamicRegistrationResponse(registered));
  } catch (error) {
    if (error instanceof OAuthError) return oauthErrorResponse(error);
    return unexpected("register");
  }
}

async function readForm(request: Request): Promise<URLSearchParams> {
  if (
    !request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    throw new OAuthError(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded",
    );
  const text = await readLimitedText(request, 16_384);
  if (text === null)
    throw new OAuthError("invalid_request", "Request too large");
  return new URLSearchParams(text);
}

/** POST /api/oauth/token: authorization_code and refresh_token grants. */
export async function handleToken(request: Request): Promise<Response> {
  try {
    const params = await readForm(request);
    const client = await authenticateOAuthClient(request.headers, params);
    const grantType = params.get("grant_type");
    if (grantType === "authorization_code") {
      const result = await exchangeAuthorizationCode({
        client,
        code: params.get("code"),
        redirectUri: params.get("redirect_uri"),
        codeVerifier: params.get("code_verifier"),
        resource: params.get("resource"),
        canonicalResource: oauthContext(request.url).resource,
      });
      return oauthJson(200, result);
    }
    if (grantType === "refresh_token") {
      const result = await refreshAccessToken({
        client,
        refreshToken: params.get("refresh_token"),
        scope: params.get("scope"),
        resource: params.get("resource"),
      });
      return oauthJson(200, result);
    }
    throw new OAuthError(
      "unsupported_grant_type",
      "Supported grants: authorization_code, refresh_token",
    );
  } catch (error) {
    if (error instanceof OAuthError) return oauthErrorResponse(error);
    return unexpected("token");
  }
}

/** POST /api/oauth/revoke: RFC 7009. Always 200 for authenticated clients. */
export async function handleRevocation(request: Request): Promise<Response> {
  try {
    const params = await readForm(request);
    const client = await authenticateOAuthClient(request.headers, params);
    const token = params.get("token");
    if (!token) throw new OAuthError("invalid_request", "token is required");
    await revokeOAuthToken(client, token);
    return oauthJson(200, {});
  } catch (error) {
    if (error instanceof OAuthError) return oauthErrorResponse(error);
    return unexpected("revoke");
  }
}
