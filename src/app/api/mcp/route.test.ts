/** @jest-environment node */

import {
  generateTokenSecret,
  hashTokenSecret,
} from "@/domains/admin/mcp/services/mcp_token_rules";
import { prisma } from "@/lib/prisma";
import { DELETE, GET, POST } from "./route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mcpAccessToken: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

const findToken = jest.mocked(prisma.mcpAccessToken.findUnique);

function mockToken(overrides: { scopes?: ("read" | "write")[] } = {}): string {
  const secret = generateTokenSecret();
  findToken.mockResolvedValue({
    id: "tok_1",
    scopes: overrides.scopes ?? ["read"],
    expiresAt: new Date(Date.now() + 86_400_000),
    revokedAt: null,
    lastUsedAt: new Date(),
    user: {
      id: "user_1",
      email: "admin@example.com",
      role: "admin",
      status: "active",
      profile: { firstName: "Ana", lastName: "Gómez" },
    },
  } as never);
  return secret;
}

function rpc(secret: string | null, body: unknown, method = "POST"): Request {
  return new Request("https://www.silentium-hogar.com/api/mcp", {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
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

describe("/api/mcp", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated calls with 401 and a Bearer challenge", async () => {
    const response = await POST(rpc(null, initialize));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toMatch(/^Bearer/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(findToken).not.toHaveBeenCalled();
  });

  it("initializes and lists tools with a valid token", async () => {
    const secret = mockToken();
    const init = await POST(rpc(secret, initialize));
    expect(init.status).toBe(200);
    expect(init.headers.get("Cache-Control")).toBe("private, no-store");
    expect(findToken).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashTokenSecret(secret) },
      }),
    );
    const initBody = await init.json();
    expect(initBody.result.serverInfo.name).toBe("silentium-admin");

    const list = await POST(
      rpc(secret, { jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(Array.isArray(listBody.result.tools)).toBe(true);
    expect(listBody.result.tools.length).toBeGreaterThan(0);
  });

  it("answers GET and DELETE with 405 after authentication", async () => {
    const secret = mockToken();
    expect((await GET(rpc(secret, null, "GET"))).status).toBe(405);
    expect((await DELETE(rpc(secret, null, "DELETE"))).status).toBe(405);
  });
});
