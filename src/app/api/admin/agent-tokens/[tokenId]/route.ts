import {
  agentTokenRoute,
  AgentTokenRouteError,
} from "@/domains/admin/mcp/services/agent_token_route";
import { mcpTokenIdSchema } from "@/domains/admin/mcp/services/mcp_token_schemas";
import { revokeMcpToken } from "@/domains/admin/mcp/services/mcp_token_service";
import type { McpTokenRevokeApiResponse } from "@/domains/admin/mcp/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
): Promise<NextResponse<McpTokenRevokeApiResponse>> {
  const { tokenId } = await params;
  return agentTokenRoute(request, async (user) => {
    const id = mcpTokenIdSchema.safeParse(tokenId);
    if (!id.success) throw new AgentTokenRouteError("validation_error", 400);
    return { token: await revokeMcpToken(user.id, id.data) };
  });
}
