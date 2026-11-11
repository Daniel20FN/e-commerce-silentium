/** Error carried to the client as an RFC 6749 / RFC 7591 JSON error. */
export class OAuthError extends Error {
  constructor(
    public readonly error: string,
    public readonly description: string,
    public readonly status: number = 400,
    public readonly basicChallenge: boolean = false,
  ) {
    super(error);
  }
}

/**
 * Public OAuth endpoints never use cookies, so a wildcard origin is safe: the
 * only credentials are bearer tokens and client secrets in the request itself.
 */
export const OAUTH_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers":
    "WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export function oauthJson(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { ...OAUTH_CORS_HEADERS, ...NO_STORE_HEADERS, ...headers },
  });
}

export function oauthErrorResponse(error: OAuthError): Response {
  return oauthJson(
    error.status,
    { error: error.error, error_description: error.description },
    error.basicChallenge ? { "WWW-Authenticate": 'Basic realm="oauth"' } : {},
  );
}

export function oauthPreflight(methods: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...OAUTH_CORS_HEADERS,
      "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
    },
  });
}

/** Cacheable public metadata document (never contains secrets). */
export function metadataResponse(body: unknown, cacheable: boolean): Response {
  return Response.json(body, {
    headers: {
      ...OAUTH_CORS_HEADERS,
      "Cache-Control": cacheable ? "public, max-age=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Reads a size-capped request body as text; null when over the limit. */
export async function readLimitedText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
