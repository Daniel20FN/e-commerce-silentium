import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcpRequest, type McpAuthFailureCode } from "./mcp_auth";
import { createMcpServer } from "./mcp_server";

/** Below Vercel's 4.5 MB function body limit. */
export const MCP_MAX_REQUEST_BYTES = 4_000_000;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

function privateJson(
  status: number,
  body: Record<string, string>,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { ...PRIVATE_HEADERS, ...headers },
  });
}

function authFailure(status: 401 | 403, code: McpAuthFailureCode): Response {
  const challenge =
    code === "missing_token"
      ? 'Bearer realm="silentium-admin"'
      : `Bearer realm="silentium-admin", error="invalid_token"`;
  return privateJson(
    status,
    { error: code },
    status === 401 ? { "WWW-Authenticate": challenge } : {},
  );
}

function withPrivateHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS))
    headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Stateless Streamable HTTP endpoint. Authentication runs before anything
 * else reads the body; cookies are never consulted.
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  let auth: Awaited<ReturnType<typeof authenticateMcpRequest>>;
  try {
    auth = await authenticateMcpRequest(request);
  } catch {
    console.error("mcp_auth_failed");
    return privateJson(503, { error: "service_unavailable" });
  }
  if (!auth.ok) return authFailure(auth.status, auth.code);

  if (request.method !== "POST")
    return privateJson(405, { error: "method_not_allowed" }, { Allow: "POST" });

  const server = createMcpServer(auth.actor);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: MCP_MAX_REQUEST_BYTES,
  });
  try {
    await server.connect(transport);
    return withPrivateHeaders(await transport.handleRequest(request));
  } catch {
    console.error("mcp_request_failed");
    return privateJson(500, { error: "internal_error" });
  } finally {
    await server.close().catch(() => undefined);
  }
}
