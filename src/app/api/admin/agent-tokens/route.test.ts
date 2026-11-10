/** @jest-environment node */

import { AccountError } from "@/domains/account/services/account_errors";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { NextRequest } from "next/server";
import { DELETE as purge } from "./[tokenId]/permanent/route";
import { DELETE as revoke } from "./[tokenId]/route";
import { GET, POST } from "./route";

const mockResolveCurrentUser = jest.fn();
const mockWithVerifiedPassword = jest.fn();
const mockCreateToken = jest.fn();
const mockListTokens = jest.fn();
const mockRevokeToken = jest.fn();
const mockDeleteToken = jest.fn();

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: () => ({}),
  copySupabaseResponseCookies: (_source: unknown, target: unknown) => target,
}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: (...args: unknown[]) => mockResolveCurrentUser(...args),
}));
jest.mock("@/domains/account/services/account_service", () => ({
  withVerifiedPassword: (...args: unknown[]) =>
    mockWithVerifiedPassword(...args),
}));
jest.mock("@/domains/admin/mcp/services/mcp_token_service", () => ({
  ...jest.requireActual("@/domains/admin/mcp/services/mcp_token_service"),
  createMcpToken: (...args: unknown[]) => mockCreateToken(...args),
  listMcpTokens: (...args: unknown[]) => mockListTokens(...args),
  revokeMcpToken: (...args: unknown[]) => mockRevokeToken(...args),
  deleteRevokedMcpToken: (...args: unknown[]) => mockDeleteToken(...args),
}));

const { McpTokenError } = jest.requireActual<
  typeof import("@/domains/admin/mcp/services/mcp_token_service")
>("@/domains/admin/mcp/services/mcp_token_service");

const ORIGIN = "http://localhost";
const URL_BASE = `${ORIGIN}/api/admin/agent-tokens`;
const user: CurrentUserDto = {
  id: "user_1",
  authUserId: "auth_1",
  email: "admin@example.com",
  role: "admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: "Gómez" },
};
const tokenDto = {
  id: "tok_1",
  name: "Codex",
  prefix: "slm_abcdef",
  scopes: ["read"],
  createdAt: "2026-11-10T12:00:00.000Z",
  lastUsedAt: null,
  expiresAt: "2026-12-10T12:00:00.000Z",
  revokedAt: null,
  state: "active",
};
const createBody = {
  name: "Codex",
  access: "read",
  expiresInDays: 30,
  currentPassword: "correct horse",
};

function request(
  method: string,
  options: { body?: unknown; origin?: string | null; url?: string } = {},
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  return new NextRequest(options.url ?? URL_BASE, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

describe("/api/admin/agent-tokens", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockResolveCurrentUser.mockResolvedValue(user);
    mockWithVerifiedPassword.mockImplementation(
      (_user: unknown, _password: unknown, action: () => unknown) => action(),
    );
  });

  describe("access control", () => {
    it("rejects anonymous visitors", async () => {
      mockResolveCurrentUser.mockResolvedValue(null);
      const response = await GET(request("GET"));
      expect(response.status).toBe(401);
      expect(mockListTokens).not.toHaveBeenCalled();
    });

    it.each(["customer", "support"] as const)(
      "rejects the %s role on every endpoint",
      async (role) => {
        mockResolveCurrentUser.mockResolvedValue({ ...user, role });
        const list = await GET(request("GET"));
        const create = await POST(request("POST", { body: createBody }));
        const del = await revoke(
          request("DELETE", { url: `${URL_BASE}/tok_1` }),
          { params: Promise.resolve({ tokenId: "tok_1" }) },
        );
        expect([list.status, create.status, del.status]).toEqual([
          403, 403, 403,
        ]);
        expect(mockListTokens).not.toHaveBeenCalled();
        expect(mockWithVerifiedPassword).not.toHaveBeenCalled();
        expect(mockRevokeToken).not.toHaveBeenCalled();
      },
    );

    it("rejects blocked administrators", async () => {
      mockResolveCurrentUser.mockResolvedValue({ ...user, status: "blocked" });
      expect((await GET(request("GET"))).status).toBe(403);
    });

    it("rejects cross-origin and missing-origin mutations", async () => {
      const crossOrigin = await POST(
        request("POST", { body: createBody, origin: "https://evil.example" }),
      );
      const noOrigin = await POST(
        request("POST", { body: createBody, origin: null }),
      );
      expect(crossOrigin.status).toBe(403);
      expect(noOrigin.status).toBe(403);
      expect(mockWithVerifiedPassword).not.toHaveBeenCalled();
    });

    it("keeps every response private and uncached", async () => {
      mockListTokens.mockResolvedValue([tokenDto]);
      const response = await GET(request("GET"));
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });
  });

  describe("GET", () => {
    it("lists only the caller tokens, without secrets or hashes", async () => {
      mockListTokens.mockResolvedValue([tokenDto]);
      const response = await GET(request("GET"));
      expect(response.status).toBe(200);
      expect(mockListTokens).toHaveBeenCalledWith("user_1");
      const text = await response.text();
      expect(JSON.parse(text)).toEqual({ data: { tokens: [tokenDto] } });
      expect(text).not.toContain("tokenHash");
      expect(text).not.toContain("secret");
    });
  });

  describe("POST", () => {
    it("rechecks the current password and returns the secret once", async () => {
      mockCreateToken.mockResolvedValue({
        token: tokenDto,
        secret: "slm_plaintext",
      });
      const response = await POST(request("POST", { body: createBody }));
      expect(response.status).toBe(201);
      expect(mockWithVerifiedPassword).toHaveBeenCalledWith(
        user,
        "correct horse",
        expect.any(Function),
      );
      expect(mockCreateToken).toHaveBeenCalledWith("user_1", {
        name: "Codex",
        access: "read",
        expiresInDays: 30,
      });
      expect(await response.json()).toEqual({
        data: { token: tokenDto, secret: "slm_plaintext" },
      });
    });

    it("never creates a token when the password check fails", async () => {
      mockWithVerifiedPassword.mockRejectedValue(
        new AccountError("account_password_invalid", 403),
      );
      const response = await POST(request("POST", { body: createBody }));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        type: "forbidden",
        message: "account_password_invalid",
      });
      expect(mockCreateToken).not.toHaveBeenCalled();
    });

    it.each([
      ["expiry above the 90 day maximum", { expiresInDays: 365 }],
      ["unknown access level", { access: "admin" }],
      ["empty name", { name: "  " }],
      ["missing password", { currentPassword: "" }],
      ["extra fields", { userId: "other" }],
    ])("rejects %s", async (_name, patch) => {
      const response = await POST(
        request("POST", { body: { ...createBody, ...patch } }),
      );
      expect(response.status).toBe(400);
      expect(mockWithVerifiedPassword).not.toHaveBeenCalled();
    });

    it("rejects non-JSON bodies", async () => {
      const bad = new NextRequest(URL_BASE, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "text/plain" },
        body: "x",
      });
      expect((await POST(bad)).status).toBe(403);
    });

    it("reports the active token limit as a conflict", async () => {
      mockCreateToken.mockRejectedValue(
        new McpTokenError("mcp_token_limit", 409),
      );
      const response = await POST(request("POST", { body: createBody }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        type: "conflict",
        message: "mcp_token_limit",
      });
    });

    it("answers unexpected failures generically", async () => {
      mockCreateToken.mockRejectedValue(new Error("db password=hunter2"));
      const response = await POST(request("POST", { body: createBody }));
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("hunter2");
    });
  });

  describe("DELETE", () => {
    const context = { params: Promise.resolve({ tokenId: "tok_1" }) };
    const deleteRequest = () => request("DELETE", { url: `${URL_BASE}/tok_1` });

    it("revokes the caller own token", async () => {
      mockRevokeToken.mockResolvedValue({ ...tokenDto, state: "revoked" });
      const response = await revoke(deleteRequest(), context);
      expect(response.status).toBe(200);
      expect(mockRevokeToken).toHaveBeenCalledWith("user_1", "tok_1");
    });

    it("returns 404 for tokens that belong to someone else", async () => {
      mockRevokeToken.mockRejectedValue(
        new McpTokenError("mcp_token_not_found", 404),
      );
      const response = await revoke(deleteRequest(), context);
      expect(response.status).toBe(404);
    });

    it("requires a same-origin request", async () => {
      const response = await revoke(
        request("DELETE", {
          url: `${URL_BASE}/tok_1`,
          origin: "https://evil.example",
        }),
        context,
      );
      expect(response.status).toBe(403);
      expect(mockRevokeToken).not.toHaveBeenCalled();
    });
  });
});

describe("/api/admin/agent-tokens/[tokenId]/permanent", () => {
  const context = { params: Promise.resolve({ tokenId: "tok_1" }) };
  const purgeRequest = (origin?: string | null) =>
    request("DELETE", { url: `${URL_BASE}/tok_1/permanent`, origin });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockResolveCurrentUser.mockResolvedValue(user);
  });

  it("deletes the caller own revoked token with no-store headers", async () => {
    mockDeleteToken.mockResolvedValue({ id: "tok_1" });
    const response = await purge(purgeRequest(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ data: { id: "tok_1" } });
    expect(mockDeleteToken).toHaveBeenCalledWith("user_1", "tok_1");
    expect(mockRevokeToken).not.toHaveBeenCalled();
  });

  it("rejects anonymous visitors", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);
    const response = await purge(purgeRequest(), context);
    expect(response.status).toBe(401);
    expect(mockDeleteToken).not.toHaveBeenCalled();
  });

  it.each(["customer", "support"] as const)(
    "rejects the %s role",
    async (role) => {
      mockResolveCurrentUser.mockResolvedValue({ ...user, role });
      const response = await purge(purgeRequest(), context);
      expect(response.status).toBe(403);
      expect(mockDeleteToken).not.toHaveBeenCalled();
    },
  );

  it.each([["https://evil.example"], [null]])(
    "rejects cross-origin or missing-origin requests (%s)",
    async (origin) => {
      const response = await purge(purgeRequest(origin), context);
      expect(response.status).toBe(403);
      expect(mockDeleteToken).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed ids", async () => {
    const response = await purge(purgeRequest(), {
      params: Promise.resolve({ tokenId: "x".repeat(129) }),
    });
    expect(response.status).toBe(400);
    expect(mockDeleteToken).not.toHaveBeenCalled();
  });

  it("answers 404 for unknown or foreign tokens", async () => {
    mockDeleteToken.mockRejectedValue(
      new McpTokenError("mcp_token_not_found", 404),
    );
    expect((await purge(purgeRequest(), context)).status).toBe(404);
  });

  it("answers 409 for tokens that are not revoked", async () => {
    mockDeleteToken.mockRejectedValue(
      new McpTokenError("mcp_token_not_revoked", 409),
    );
    const response = await purge(purgeRequest(), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      message: "mcp_token_not_revoked",
    });
  });
});
