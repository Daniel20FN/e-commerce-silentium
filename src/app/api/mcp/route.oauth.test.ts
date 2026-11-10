/** @jest-environment node */

import {
  issueAuthorizationCode,
  validateAuthorizationRequest,
} from "@/domains/admin/mcp_oauth/services/oauth_authorization_service";
import { challengeForVerifier } from "@/domains/admin/mcp_oauth/services/oauth_rules";
import { exchangeAuthorizationCode } from "@/domains/admin/mcp_oauth/services/oauth_token_service";
import { fakeOAuthDb as db } from "@/domains/admin/mcp_oauth/testing/fake_db";
import type { OAuthClientRecord } from "@/domains/admin/mcp_oauth/types/oauth_types";
import { OPTIONS, POST } from "./route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    ...jest.requireActual<
      typeof import("@/domains/admin/mcp_oauth/testing/fake_db")
    >("@/domains/admin/mcp_oauth/testing/fake_db").fakeOAuthDb.prisma,
    mcpAccessToken: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

const ORIGIN = "http://localhost:3124";
const RESOURCE = `${ORIGIN}/api/mcp`;
const REDIRECT = "http://127.0.0.1:53000/callback";
const VERIFIER = "v".repeat(43);

function rpc(secret: string | null, body: unknown): Request {
  return new Request(RESOURCE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0.0" },
  },
};
const listTools = { jsonrpc: "2.0", id: 2, method: "tools/list" };

/** Runs the real authorize + code exchange to mint an OAuth access token. */
async function mintToken(
  access: "read" | "read_write",
): Promise<{ accessToken: string; refreshToken: string }> {
  const row = db.clients.insert({
    clientId: `slcid_${db.clients.rows.length}`,
    source: "dynamic",
    name: "Agente",
    clientUri: null,
    redirectUris: [REDIRECT],
    authMethod: "none",
    secretHash: null,
    metadataExpiresAt: null,
  });
  const client: OAuthClientRecord = {
    id: row.id,
    clientId: String(row.clientId),
    source: "dynamic",
    name: "Agente",
    clientUri: null,
    redirectUris: [REDIRECT],
    authMethod: "none",
    secretHash: null,
    metadataExpiresAt: null,
  };
  const validation = await validateAuthorizationRequest(
    {
      response_type: "code",
      client_id: client.clientId,
      redirect_uri: REDIRECT,
      code_challenge: challengeForVerifier(VERIFIER),
      code_challenge_method: "S256",
      resource: RESOURCE,
    },
    { resource: RESOURCE },
  );
  if (!validation.ok) throw new Error("invalid authorization request");
  const code = await issueAuthorizationCode(
    "user_1",
    validation.request,
    access,
  );
  const tokens = await exchangeAuthorizationCode({
    client,
    code,
    redirectUri: REDIRECT,
    codeVerifier: VERIFIER,
    resource: RESOURCE,
    canonicalResource: RESOURCE,
  });
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
}

async function toolNames(secret: string): Promise<string[]> {
  const response = await POST(rpc(secret, listTools));
  expect(response.status).toBe(200);
  return (await response.json()).result.tools.map(
    (tool: { name: string }) => tool.name,
  );
}

describe("/api/mcp with OAuth access tokens (D1, D5)", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.reset();
    db.users.set("user_1", {
      id: "user_1",
      email: "admin@example.com",
      role: "admin",
      status: "active",
      profile: { firstName: "Ana", lastName: "Gómez" },
    });
  });

  it("points unauthenticated clients to the protected resource metadata", async () => {
    for (const secret of [null, "no-es-un-token"]) {
      const response = await POST(rpc(secret, initialize));
      expect(response.status).toBe(401);
      const challenge = response.headers.get("WWW-Authenticate") ?? "";
      expect(challenge).toMatch(/^Bearer /);
      expect(challenge).toContain(
        `resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/api/mcp"`,
      );
      expect(challenge).toContain('scope="read"');
      expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
        "WWW-Authenticate",
      );
    }
  });

  it("answers browser preflights before authentication", async () => {
    const response = await OPTIONS(
      new Request(RESOURCE, { method: "OPTIONS" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
  });

  it("serves initialize, tools/list and a read tool call with a read-only grant", async () => {
    const { accessToken } = await mintToken("read");
    const init = await POST(rpc(accessToken, initialize));
    expect(init.status).toBe(200);
    const names = await toolNames(accessToken);
    expect(names).toContain("catalog_get_product");
    expect(names).not.toContain("catalog_create_product");
    const call = await POST(
      rpc(accessToken, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "guide_search", arguments: {} },
      }),
    );
    const body = await call.json();
    expect(call.status).toBe(200);
    expect(body.result.isError).not.toBe(true);
  });

  it("exposes write tools only when the user granted write, and enforces scope on calls", async () => {
    const writer = await mintToken("read_write");
    expect(await toolNames(writer.accessToken)).toContain(
      "catalog_create_product",
    );
    const reader = await mintToken("read");
    const call = await POST(
      rpc(reader.accessToken, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "catalog_create_product",
          arguments: {
            product: {
              name: "Mesa",
              slug: "mesa",
              categoryIds: ["c1"],
              primaryCategoryId: "c1",
            },
          },
        },
      }),
    );
    const body = await call.json();
    expect(body.result.isError).toBe(true);
    expect(JSON.parse(body.result.content[0].text)).toMatchObject({
      error: { code: "insufficient_scope" },
    });
  });

  it("rejects access tokens issued for another resource (audience)", async () => {
    const { accessToken } = await mintToken("read");
    db.grants.rows[0]!.resource = "https://other.example/api/mcp";
    const response = await POST(rpc(accessToken, initialize));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("invalid_token");
  });

  it("rejects expired access tokens and expired grants", async () => {
    const { accessToken } = await mintToken("read");
    const token = db.tokens.rows.find((row) => row.kind === "access")!;
    token.expiresAt = new Date(Date.now() - 1_000);
    expect((await POST(rpc(accessToken, initialize))).status).toBe(401);
    token.expiresAt = new Date(Date.now() + 60_000);
    db.grants.rows[0]!.expiresAt = new Date(Date.now() - 1_000);
    expect((await POST(rpc(accessToken, initialize))).status).toBe(401);
  });

  it("stops working the moment the grant is revoked", async () => {
    const { accessToken } = await mintToken("read");
    expect((await POST(rpc(accessToken, initialize))).status).toBe(200);
    db.grants.rows[0]!.revokedAt = new Date();
    expect((await POST(rpc(accessToken, initialize))).status).toBe(401);
  });

  it("rechecks the owner's role and status on every request", async () => {
    const { accessToken } = await mintToken("read_write");
    expect((await POST(rpc(accessToken, initialize))).status).toBe(200);
    db.users.set("user_1", { ...db.users.get("user_1")!, role: "support" });
    expect((await POST(rpc(accessToken, initialize))).status).toBe(403);
    db.users.set("user_1", {
      ...db.users.get("user_1")!,
      role: "admin",
      status: "blocked",
    });
    expect((await POST(rpc(accessToken, initialize))).status).toBe(403);
    db.users.set("user_1", {
      ...db.users.get("user_1")!,
      status: "active",
      email: "borrado@deleted.invalid",
    });
    expect((await POST(rpc(accessToken, initialize))).status).toBe(403);
  });

  it("does not accept a refresh token or an unknown access token", async () => {
    const { refreshToken } = await mintToken("read");
    expect((await POST(rpc(refreshToken, initialize))).status).toBe(401);
    expect((await POST(rpc(`sla_${"A".repeat(43)}`, initialize))).status).toBe(
      401,
    );
  });
});
