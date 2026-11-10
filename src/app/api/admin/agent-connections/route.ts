import { agentTokenRoute } from "@/domains/admin/mcp/services/agent_token_route";
import { listOAuthGrants } from "@/domains/admin/mcp_oauth/services/oauth_grant_service";
import type { McpOAuthGrantsListApiResponse } from "@/domains/admin/mcp_oauth/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(
  request: NextRequest,
): Promise<NextResponse<McpOAuthGrantsListApiResponse>> {
  return agentTokenRoute(request, async (user) => ({
    grants: await listOAuthGrants(user.id),
  }));
}
