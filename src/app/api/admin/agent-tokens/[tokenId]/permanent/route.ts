import {
  agentTokenRoute,
  AgentTokenRouteError,
} from "@/domains/admin/mcp/services/agent_token_route";
import { mcpTokenIdSchema } from "@/domains/admin/mcp/services/mcp_token_schemas";
import { deleteRevokedMcpToken } from "@/domains/admin/mcp/services/mcp_token_service";
import type { McpTokenDeleteApiResponse } from "@/domains/admin/mcp/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Permanently removes one of the caller's own tokens. Unlike the sibling
 * revoke endpoint this only works on tokens that are already revoked.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
): Promise<NextResponse<McpTokenDeleteApiResponse>> {
  const { tokenId } = await params;
  return agentTokenRoute(request, async (user) => {
    const id = mcpTokenIdSchema.safeParse(tokenId);
    if (!id.success) throw new AgentTokenRouteError("validation_error", 400);
    return deleteRevokedMcpToken(user.id, id.data);
  });
}
