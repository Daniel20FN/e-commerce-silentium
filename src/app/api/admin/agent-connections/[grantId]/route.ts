import {
  AgentTokenRouteError,
  agentTokenRoute,
} from "@/domains/admin/mcp/services/agent_token_route";
import { mcpTokenIdSchema } from "@/domains/admin/mcp/services/mcp_token_schemas";
import { revokeOAuthGrant } from "@/domains/admin/mcp_oauth/services/oauth_grant_service";
import type { McpOAuthGrantRevokeApiResponse } from "@/domains/admin/mcp_oauth/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> },
): Promise<NextResponse<McpOAuthGrantRevokeApiResponse>> {
  const { grantId } = await params;
  return agentTokenRoute(request, async (user) => {
    const id = mcpTokenIdSchema.safeParse(grantId);
    if (!id.success) throw new AgentTokenRouteError("validation_error", 400);
    return { grant: await revokeOAuthGrant(user.id, id.data) };
  });
}
