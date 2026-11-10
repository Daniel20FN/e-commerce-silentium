import { withVerifiedPassword } from "@/domains/account/services/account_service";
import {
  AgentTokenRouteError,
  agentTokenRoute,
} from "@/domains/admin/mcp/services/agent_token_route";
import { mcpTokenCreateSchema } from "@/domains/admin/mcp/services/mcp_token_schemas";
import {
  createMcpToken,
  listMcpTokens,
} from "@/domains/admin/mcp/services/mcp_token_service";
import type {
  McpTokenCreateApiResponse,
  McpTokensListApiResponse,
} from "@/domains/admin/mcp/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(
  request: NextRequest,
): Promise<NextResponse<McpTokensListApiResponse>> {
  return agentTokenRoute(request, async (user) => ({
    tokens: await listMcpTokens(user.id),
  }));
}

export function POST(
  request: NextRequest,
): Promise<NextResponse<McpTokenCreateApiResponse>> {
  return agentTokenRoute(
    request,
    async (user) => {
      const input = mcpTokenCreateSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!input.success)
        throw new AgentTokenRouteError("validation_error", 400);
      const { currentPassword, ...tokenInput } = input.data;
      return withVerifiedPassword(user, currentPassword, () =>
        createMcpToken(user.id, tokenInput),
      );
    },
    { jsonBody: true, successStatus: 201 },
  );
}
