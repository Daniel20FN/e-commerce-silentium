import { handleToken } from "@/domains/admin/mcp_oauth/services/oauth_endpoints";
import { oauthPreflight } from "@/domains/admin/mcp_oauth/services/oauth_http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleToken(request);
}

export function OPTIONS(): Response {
  return oauthPreflight("POST");
}
