import {
  OAUTH_CORS_HEADERS,
  oauthPreflight,
} from "@/domains/admin/mcp_oauth/services/oauth_http";
import { oauthContext } from "@/domains/admin/mcp_oauth/services/oauth_origin";
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
  // Bearer-only endpoint: no cookies, so cross-origin (browser) clients are safe.
  "Access-Control-Allow-Origin":
    OAUTH_CORS_HEADERS["Access-Control-Allow-Origin"],
  "Access-Control-Expose-Headers":
    OAUTH_CORS_HEADERS["Access-Control-Expose-Headers"],
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

function authFailure(
  request: Request,
  status: 401 | 403,
  code: McpAuthFailureCode,
): Response {
  // RFC 9728 section 5.1 / MCP authorization: point clients at the metadata.
  const metadata = oauthContext(request.url).protectedResourceMetadataPathUrl;
  const challenge =
    code === "missing_token"
      ? `Bearer realm="silentium-admin", resource_metadata="${metadata}", scope="read"`
      : `Bearer realm="silentium-admin", error="invalid_token", resource_metadata="${metadata}", scope="read"`;
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
  if (request.method === "OPTIONS") return oauthPreflight("POST, GET, DELETE");
  let auth: Awaited<ReturnType<typeof authenticateMcpRequest>>;
  try {
    auth = await authenticateMcpRequest(request);
  } catch {
    console.error("mcp_auth_failed");
    return privateJson(503, { error: "service_unavailable" });
  }
  if (!auth.ok) return authFailure(request, auth.status, auth.code);

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
