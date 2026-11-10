/** @jest-environment node */

import {
  generateTokenSecret,
  hashTokenSecret,
} from "@/domains/admin/mcp/services/mcp_token_rules";
import { DELETE, GET, POST } from "./route";

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreateProduct = jest.fn();
const mockGetProductDetail = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mcpAccessToken: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));
jest.mock("@/domains/admin/products/services/admin_product_service", () => ({
  ...jest.requireActual(
    "@/domains/admin/products/services/admin_product_service",
  ),
  createAdminProduct: (...args: unknown[]) => mockCreateProduct(...args),
  getAdminProductDetail: (...args: unknown[]) => mockGetProductDetail(...args),
}));

interface TokenOptions {
  scopes?: ("read" | "write")[];
  role?: string;
  status?: string;
  revokedAt?: Date | null;
  expiresAt?: Date;
}

function mockToken(options: TokenOptions = {}): string {
  const secret = generateTokenSecret();
  mockFindUnique.mockResolvedValue({
    id: "tok_1",
    scopes: options.scopes ?? ["read"],
    expiresAt: options.expiresAt ?? new Date(Date.now() + 86_400_000),
    revokedAt: options.revokedAt ?? null,
    lastUsedAt: new Date(),
    user: {
      id: "user_1",
      email: "admin@example.com",
      role: options.role ?? "admin",
      status: options.status ?? "active",
      profile: { firstName: "Ana", lastName: "Gómez" },
    },
  });
  return secret;
}

function rpc(
  secret: string | null,
  body: unknown,
  extraHeaders: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request("https://www.silentium-hogar.com/api/mcp", {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      ...extraHeaders,
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

function toolCall(name: string, args: unknown, id = 3) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  };
}

async function toolResult(response: Response) {
  const body = await response.json();
  return {
    isError: body.result.isError === true,
    payload: JSON.parse(body.result.content[0].text),
  };
}

describe("/api/mcp", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  describe("authentication", () => {
    it("rejects unauthenticated calls with 401 and a Bearer challenge", async () => {
      const response = await POST(rpc(null, initialize));
      expect(response.status).toBe(401);
      expect(response.headers.get("WWW-Authenticate")).toMatch(/^Bearer/);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("never accepts session cookies as credentials", async () => {
      const response = await POST(
        rpc(null, initialize, { Cookie: "sb-access-token=abc" }),
      );
      expect(response.status).toBe(401);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("rejects malformed bearer tokens before any lookup", async () => {
      const response = await POST(rpc("not-a-token", initialize));
      expect(response.status).toBe(401);
      expect(response.headers.get("WWW-Authenticate")).toContain(
        'error="invalid_token"',
      );
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("rejects unknown, revoked and expired tokens with 401", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      expect((await POST(rpc(generateTokenSecret(), initialize))).status).toBe(
        401,
      );
      const revoked = mockToken({ revokedAt: new Date() });
      expect((await POST(rpc(revoked, initialize))).status).toBe(401);
      const expired = mockToken({ expiresAt: new Date(Date.now() - 1000) });
      expect((await POST(rpc(expired, initialize))).status).toBe(401);
    });

    it.each([
      ["customer role", { role: "customer" }],
      ["support role", { role: "support" }],
      ["blocked user", { status: "blocked" }],
      ["inactive user", { status: "inactive" }],
    ])(
      "rejects a token whose owner is a %s with 403",
      async (_name, options) => {
        mockCreateProduct.mockResolvedValue({ id: "p1" });
        const secret = mockToken(options);
        const response = await POST(
          rpc(secret, toolCall("catalog_create_product", {})),
        );
        expect(response.status).toBe(403);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(mockCreateProduct).not.toHaveBeenCalled();
      },
    );

    it("answers 503 without leaking details when the database fails", async () => {
      mockFindUnique.mockRejectedValue(new Error("connection string leaked"));
      const response = await POST(rpc(generateTokenSecret(), initialize));
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("leaked");
    });

    it("answers GET and DELETE with 405 after authentication", async () => {
      const secret = mockToken();
      expect((await GET(rpc(secret, null, {}, "GET"))).status).toBe(405);
      expect((await DELETE(rpc(secret, null, {}, "DELETE"))).status).toBe(405);
      expect((await GET(rpc(null, null, {}, "GET"))).status).toBe(401);
    });
  });

  describe("Streamable HTTP", () => {
    it("initializes and lists tools with a valid token", async () => {
      const secret = mockToken({ scopes: ["read", "write"] });
      const init = await POST(rpc(secret, initialize));
      expect(init.status).toBe(200);
      expect(init.headers.get("Cache-Control")).toBe("private, no-store");
      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: hashTokenSecret(secret) },
        }),
      );
      const initBody = await init.json();
      expect(initBody.result.serverInfo.name).toBe("silentium-admin");
      expect(initBody.result.capabilities.tools).toBeDefined();

      const list = await POST(
        rpc(secret, { jsonrpc: "2.0", id: 2, method: "tools/list" }),
      );
      expect(list.status).toBe(200);
      expect(list.headers.get("Cache-Control")).toBe("private, no-store");
      const tools: {
        name: string;
        annotations: object;
        inputSchema: { type: string };
      }[] = (await list.json()).result.tools;
      expect(tools.length).toBeGreaterThan(40);
      expect(tools.every((tool) => tool.inputSchema.type === "object")).toBe(
        true,
      );
      expect(tools.map((tool) => tool.name)).toContain(
        "catalog_create_product",
      );
    });

    it("lists only read tools for a read-scope token", async () => {
      const secret = mockToken({ scopes: ["read"] });
      const list = await POST(
        rpc(secret, { jsonrpc: "2.0", id: 2, method: "tools/list" }),
      );
      const names: string[] = (await list.json()).result.tools.map(
        (tool: { name: string }) => tool.name,
      );
      expect(names).toContain("catalog_get_product");
      expect(names).not.toContain("catalog_create_product");
    });

    it("sends beginner-oriented instructions and advertises prompts on initialize", async () => {
      const secret = mockToken();
      const body = await (await POST(rpc(secret, initialize))).json();
      expect(body.result.capabilities.prompts).toBeDefined();
      expect(body.result.instructions).toContain("store_overview");
      expect(body.result.instructions).toContain("explicit confirmation");
    });

    it("lists the guided prompts and returns their messages with a valid token", async () => {
      const secret = mockToken({ scopes: ["read", "write"] });
      const list = await POST(
        rpc(secret, { jsonrpc: "2.0", id: 5, method: "prompts/list" }),
      );
      expect(list.status).toBe(200);
      expect(list.headers.get("Cache-Control")).toBe("private, no-store");
      const prompts: { name: string; description: string }[] = (
        await list.json()
      ).result.prompts;
      expect(prompts.map((prompt) => prompt.name)).toEqual(
        expect.arrayContaining([
          "primer-producto",
          "revisar-stock-bajo",
          "registrar-pedido",
          "publicar-producto",
        ]),
      );

      const get = await POST(
        rpc(secret, {
          jsonrpc: "2.0",
          id: 6,
          method: "prompts/get",
          params: {
            name: "publicar-producto",
            arguments: { producto: "Mesa Aurora" },
          },
        }),
      );
      const result = (await get.json()).result;
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.text).toContain("publication_publish");
      expect(result.messages[0].content.text).toContain("Mesa Aurora");
    });

    it("only offers read-compatible prompts to read-scope tokens", async () => {
      const secret = mockToken({ scopes: ["read"] });
      const list = await POST(
        rpc(secret, { jsonrpc: "2.0", id: 5, method: "prompts/list" }),
      );
      const names: string[] = (await list.json()).result.prompts.map(
        (prompt: { name: string }) => prompt.name,
      );
      expect(names).toEqual(["revisar-stock-bajo"]);
      const denied = await POST(
        rpc(secret, {
          jsonrpc: "2.0",
          id: 6,
          method: "prompts/get",
          params: { name: "primer-producto" },
        }),
      );
      expect((await denied.json()).error.code).toBe(-32602);
    });

    it("answers an unknown prompt with a JSON-RPC error", async () => {
      const secret = mockToken({ scopes: ["read", "write"] });
      const response = await POST(
        rpc(secret, {
          jsonrpc: "2.0",
          id: 7,
          method: "prompts/get",
          params: { name: "no-existe" },
        }),
      );
      const body = await response.json();
      expect(body.error.code).toBe(-32602);
      expect(body.result).toBeUndefined();
    });

    it("rejects prompts/list without a token", async () => {
      const response = await POST(
        rpc(null, { jsonrpc: "2.0", id: 5, method: "prompts/list" }),
      );
      expect(response.status).toBe(401);
    });

    it("serves the guide and overview tools over HTTP", async () => {
      const secret = mockToken();
      const { isError, payload } = await toolResult(
        await POST(
          rpc(secret, toolCall("guide_get_topic", { topic: "inventario" })),
        ),
      );
      expect(isError).toBe(false);
      expect(payload).toMatchObject({ data: { id: "inventario" } });
    });

    it("runs a read tool and returns JSON content", async () => {
      mockGetProductDetail.mockResolvedValue({ id: "p1", name: "Mesa" });
      const secret = mockToken();
      const { isError, payload } = await toolResult(
        await POST(
          rpc(secret, toolCall("catalog_get_product", { productId: "p1" })),
        ),
      );
      expect(isError).toBe(false);
      expect(payload).toEqual({ data: { id: "p1", name: "Mesa" } });
    });

    it("denies write tools to read-scope tokens without executing them", async () => {
      const secret = mockToken({ scopes: ["read"] });
      const { isError, payload } = await toolResult(
        await POST(
          rpc(
            secret,
            toolCall("catalog_create_product", {
              product: {
                name: "Mesa",
                slug: "mesa",
                categoryIds: ["c1"],
                primaryCategoryId: "c1",
              },
            }),
          ),
        ),
      );
      expect(isError).toBe(true);
      expect(payload).toMatchObject({
        error: { type: "forbidden", code: "insufficient_scope" },
      });
      expect(mockCreateProduct).not.toHaveBeenCalled();
    });

    it("executes write tools for write-scope tokens", async () => {
      mockCreateProduct.mockResolvedValue({ id: "p9" });
      const secret = mockToken({ scopes: ["read", "write"] });
      const { isError } = await toolResult(
        await POST(
          rpc(
            secret,
            toolCall("catalog_create_product", {
              product: {
                name: "Mesa",
                slug: "mesa",
                categoryIds: ["c1"],
                primaryCategoryId: "c1",
              },
            }),
          ),
        ),
      );
      expect(isError).toBe(false);
      expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    });

    it("reports unknown tools as tool errors", async () => {
      const secret = mockToken();
      const { isError, payload } = await toolResult(
        await POST(rpc(secret, toolCall("users_list", {}))),
      );
      expect(isError).toBe(true);
      expect(payload).toMatchObject({ error: { code: "unknown_tool" } });
    });

    it("re-evaluates the owner role between calls with the same token", async () => {
      mockGetProductDetail.mockResolvedValue({ id: "p1" });
      const secret = mockToken({ role: "admin" });
      const call = () =>
        POST(rpc(secret, toolCall("catalog_get_product", { productId: "p1" })));
      expect((await call()).status).toBe(200);
      mockToken({ role: "customer" });
      expect((await call()).status).toBe(403);
    });
  });
});
