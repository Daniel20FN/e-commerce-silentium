import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpActor } from "./mcp_auth";
import {
  findMcpTool,
  toolInputJsonSchema,
  toolsForActor,
} from "./mcp_registry";
import { executeMcpTool } from "./mcp_tool_runner";

export const MCP_SERVER_NAME = "silentium-admin";
export const MCP_SERVER_VERSION = "1.0.0";
const MCP_SERVER_INSTRUCTIONS =
  "Administration tools for the Silentium Hogar store. Every call acts as the token owner, applies the same rules as the admin panel and records them as the actor. Read a record first and send back its revision (updatedAt, revision or expectedRevision) on writes; a conflict error means someone else changed it.";

/**
 * Builds a request-scoped MCP server bound to the authenticated actor. The
 * deployment is stateless, so one instance serves exactly one HTTP request.
 */
export function createMcpServer(actor: McpActor): Server {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions: MCP_SERVER_INSTRUCTIONS,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: toolsForActor(actor).map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: { ...toolInputJsonSchema(tool), type: "object" },
      annotations: tool.annotations,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = findMcpTool(request.params.name);
    if (!tool)
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: {
                type: "not_found",
                code: "unknown_tool",
                hint: "Use tools/list to see the available tools.",
              },
            }),
          },
        ],
      };
    return executeMcpTool(tool, request.params.arguments, actor);
  });

  return server;
}
