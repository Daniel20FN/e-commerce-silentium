import type { OAuthContext } from "./oauth_origin";
import { OAUTH_SCOPES_SUPPORTED } from "./oauth_rules";

/** RFC 9728 Protected Resource Metadata of the MCP endpoint. */
export function protectedResourceMetadata(
  context: OAuthContext,
): Record<string, unknown> {
  return {
    resource: context.resource,
    authorization_servers: [context.issuer],
    scopes_supported: [...OAUTH_SCOPES_SUPPORTED],
    bearer_methods_supported: ["header"],
    resource_name: "Silentium Hogar - administración",
  };
}

/** RFC 8414 Authorization Server Metadata (also served as OIDC-style alias). */
export function authorizationServerMetadata(
  context: OAuthContext,
): Record<string, unknown> {
  return {
    issuer: context.issuer,
    authorization_endpoint: context.authorizationEndpoint,
    token_endpoint: context.tokenEndpoint,
    registration_endpoint: context.registrationEndpoint,
    revocation_endpoint: context.revocationEndpoint,
    scopes_supported: [...OAUTH_SCOPES_SUPPORTED],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    revocation_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    code_challenge_methods_supported: ["S256"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
  };
}
