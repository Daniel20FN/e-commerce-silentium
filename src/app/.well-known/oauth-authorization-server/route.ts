import {
  metadataResponse,
  oauthPreflight,
} from "@/domains/admin/mcp_oauth/services/oauth_http";
import { authorizationServerMetadata } from "@/domains/admin/mcp_oauth/services/oauth_metadata";
import { oauthContext } from "@/domains/admin/mcp_oauth/services/oauth_origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const context = oauthContext(request.url);
  return metadataResponse(
    authorizationServerMetadata(context),
    !context.localDevelopment,
  );
}

export function OPTIONS(): Response {
  return oauthPreflight("GET");
}
