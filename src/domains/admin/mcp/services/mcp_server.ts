import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpActor } from "./mcp_auth";
import { MCP_SERVER_INSTRUCTIONS } from "./mcp_instructions";
import { getMcpPrompt, listMcpPrompts } from "./mcp_prompts";
import {
  findMcpTool,
  toolInputJsonSchema,
  toolsForActor,
} from "./mcp_registry";
import { executeMcpTool } from "./mcp_tool_runner";

export const MCP_SERVER_NAME = "silentium-admin";
export const MCP_SERVER_VERSION = "1.1.0";

/**
 * Builds a request-scoped MCP server bound to the authenticated actor. The
 * deployment is stateless, so one instance serves exactly one HTTP request.
 */
export function createMcpServer(actor: McpActor): Server {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      capabilities: { tools: {}, prompts: {} },
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

  server.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: listMcpPrompts(actor),
  }));

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const prompt = getMcpPrompt(
      actor,
      request.params.name,
      request.params.arguments,
    );
    if (!prompt) throw new McpError(ErrorCode.InvalidParams, "Unknown prompt");
    return prompt;
  });

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
