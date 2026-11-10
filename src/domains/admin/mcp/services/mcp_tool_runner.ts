import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpActor } from "./mcp_auth";
import {
  McpToolError,
  isUnexpectedToolError,
  toToolErrorPayload,
} from "./mcp_errors";
import type { McpToolDefinition } from "./mcp_tool_types";

export type McpToolCallResult = CallToolResult;

function stringify(value: unknown): string {
  return (
    JSON.stringify(value, (_key, entry: unknown) =>
      typeof entry === "bigint" ? entry.toString() : entry,
    ) ?? "null"
  );
}

export function actorHasScope(
  actor: Pick<McpActor, "scopes">,
  tool: Pick<McpToolDefinition, "scope">,
): boolean {
  return actor.scopes.includes(tool.scope);
}

/**
 * Runs one tool for an authenticated actor. The scope is checked before the
 * input is parsed, so a token without the required scope never reaches a
 * domain service.
 */
export async function executeMcpTool(
  tool: McpToolDefinition,
  rawInput: unknown,
  actor: McpActor,
): Promise<McpToolCallResult> {
  try {
    if (!actorHasScope(actor, tool))
      throw new McpToolError("forbidden", "insufficient_scope");
    const data = await tool.run(rawInput ?? {}, {
      actor: { id: actor.id, label: actor.label },
    });
    return { content: [{ type: "text", text: stringify({ data }) }] };
  } catch (error) {
    const payload = toToolErrorPayload(error);
    if (isUnexpectedToolError(payload))
      console.error("mcp_tool_failed", {
        tool: tool.name,
        error: error instanceof Error ? error.name : "unknown",
      });
    return {
      isError: true,
      content: [{ type: "text", text: stringify({ error: payload }) }],
    };
  }
}
