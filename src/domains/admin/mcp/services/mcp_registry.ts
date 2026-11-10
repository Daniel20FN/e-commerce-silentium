import { z } from "zod";
import type { McpActor } from "./mcp_auth";
import { actorHasScope } from "./mcp_tool_runner";
import type { McpToolDefinition } from "./mcp_tool_types";
import { analysisTools } from "./tools/analysis_tools";
import { catalogTools } from "./tools/catalog_tools";
import { inventoryTools } from "./tools/inventory_tools";
import { mediaTools } from "./tools/media_tools";
import { orderTools } from "./tools/order_tools";
import { publicationTools } from "./tools/publication_tools";

/**
 * Every tool exposed through MCP. Users, invitations, roles, legal evidence
 * and account self-service are intentionally absent and must stay so.
 */
export const MCP_TOOLS: readonly McpToolDefinition[] = [
  ...catalogTools,
  ...publicationTools,
  ...inventoryTools,
  ...orderTools,
  ...mediaTools,
  ...analysisTools,
];

export function findMcpTool(name: string): McpToolDefinition | undefined {
  return MCP_TOOLS.find((tool) => tool.name === name);
}

/** A token only sees the tools its scopes allow. */
export function toolsForActor(
  actor: Pick<McpActor, "scopes">,
): McpToolDefinition[] {
  return MCP_TOOLS.filter((tool) => actorHasScope(actor, tool));
}

export function toolInputJsonSchema(
  tool: McpToolDefinition,
): Record<string, unknown> {
  return z.toJSONSchema(tool.inputSchema, {
    io: "input",
    unrepresentable: "any",
    target: "draft-7",
  });
}
