import {
  AgentTokenRouteError,
  agentTokenRoute,
} from "@/domains/admin/mcp/services/agent_token_route";
import { mcpTokenIdSchema } from "@/domains/admin/mcp/services/mcp_token_schemas";
import { deleteRevokedOAuthGrant } from "@/domains/admin/mcp_oauth/services/oauth_grant_service";
import type { McpOAuthGrantDeleteApiResponse } from "@/domains/admin/mcp_oauth/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> },
): Promise<NextResponse<McpOAuthGrantDeleteApiResponse>> {
  const { grantId } = await params;
  return agentTokenRoute(request, async (user) => {
    const id = mcpTokenIdSchema.safeParse(grantId);
    if (!id.success) throw new AgentTokenRouteError("validation_error", 400);
    return deleteRevokedOAuthGrant(user.id, id.data);
  });
}
