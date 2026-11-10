/** @jest-environment node */

import { authenticateMcpRequest } from "./mcp_auth";
import { generateTokenSecret, hashTokenSecret } from "./mcp_token_rules";

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mcpAccessToken: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const db = { findUnique: mockFindUnique, update: mockUpdate };
const now = new Date("2026-11-10T12:00:00Z");

type Role = "super_admin" | "admin" | "support" | "customer";
type Status = "active" | "inactive" | "blocked" | "pending_profile";

function tokenRecord(
  overrides: {
    role?: Role;
    status?: Status;
    email?: string;
    revokedAt?: Date | null;
    expiresAt?: Date;
    lastUsedAt?: Date | null;
    scopes?: ("read" | "write")[];
  } = {},
) {
  return {
    id: "tok_1",
    scopes: overrides.scopes ?? ["read" as const],
    expiresAt: overrides.expiresAt ?? new Date("2026-12-10T00:00:00Z"),
    revokedAt: overrides.revokedAt ?? null,
    lastUsedAt:
      overrides.lastUsedAt === undefined
        ? new Date("2026-11-10T11:59:30Z")
        : overrides.lastUsedAt,
    user: {
      id: "user_1",
      email: overrides.email ?? "admin@example.com",
      role: overrides.role ?? ("admin" as const),
      status: overrides.status ?? ("active" as const),
      profile: { firstName: "Ana", lastName: "Gómez" },
    },
  };
}

function request(headers: Record<string, string>): Request {
  return new Request("https://www.silentium-hogar.com/api/mcp", {
    method: "POST",
    headers,
  });
}

describe("authenticateMcpRequest", () => {
  const secret = generateTokenSecret();
  const bearer = { authorization: `Bearer ${secret}` };

  beforeEach(() => jest.resetAllMocks());

  it("authenticates by hash and builds the audit actor", async () => {
    db.findUnique.mockResolvedValue(tokenRecord());
    const result = await authenticateMcpRequest(request(bearer), now);
    expect(db.findUnique.mock.calls[0]?.[0]?.where).toEqual({
      tokenHash: hashTokenSecret(secret),
    });
    expect(db.findUnique.mock.calls[0]?.[0]?.select).not.toHaveProperty(
      "tokenHash",
    );
    expect(result).toEqual({
      ok: true,
      actor: {
        id: "user_1",
        label: "Ana Gómez",
        tokenId: "tok_1",
        scopes: ["read"],
      },
    });
  });

  it.each([
    ["missing header", {}],
    ["non-bearer scheme", { authorization: `Basic ${secret}` }],
    ["malformed secret", { authorization: "Bearer slm_short" }],
    ["unknown prefix", { authorization: `Bearer abc_${"a".repeat(43)}` }],
  ])(
    "denies %s with 401 and never queries the database",
    async (_name, headers) => {
      const result = await authenticateMcpRequest(request(headers), now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(401);
      expect(db.findUnique).not.toHaveBeenCalled();
    },
  );

  it("ignores session cookies: a cookie-only request is denied", async () => {
    const result = await authenticateMcpRequest(
      request({ cookie: "sb-access-token=abc; sb-refresh-token=def" }),
      now,
    );
    expect(result).toEqual({ ok: false, status: 401, code: "missing_token" });
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it("denies unknown tokens", async () => {
    db.findUnique.mockResolvedValue(null);
    expect(await authenticateMcpRequest(request(bearer), now)).toEqual({
      ok: false,
      status: 401,
      code: "invalid_token",
    });
  });

  it("denies revoked tokens", async () => {
    db.findUnique.mockResolvedValue(tokenRecord({ revokedAt: now }));
    expect(await authenticateMcpRequest(request(bearer), now)).toEqual({
      ok: false,
      status: 401,
      code: "revoked_token",
    });
  });

  it("denies expired tokens, including the exact expiry instant", async () => {
    db.findUnique.mockResolvedValue(tokenRecord({ expiresAt: now }));
    expect(await authenticateMcpRequest(request(bearer), now)).toEqual({
      ok: false,
      status: 401,
      code: "expired_token",
    });
  });

  it.each<[string, Status]>([
    ["inactive", "inactive"],
    ["blocked", "blocked"],
    ["pending profile", "pending_profile"],
  ])("denies owners that are %s with 403", async (_name, status) => {
    db.findUnique.mockResolvedValue(tokenRecord({ status }));
    expect(await authenticateMcpRequest(request(bearer), now)).toEqual({
      ok: false,
      status: 403,
      code: "user_unavailable",
    });
  });

  it("denies deleted accounts even if role and status look valid", async () => {
    db.findUnique.mockResolvedValue(
      tokenRecord({ email: "deleted-1@deleted.invalid" }),
    );
    expect(await authenticateMcpRequest(request(bearer), now)).toEqual({
      ok: false,
      status: 403,
      code: "user_unavailable",
    });
  });

  it.each<Role>(["support", "customer"])(
    "denies the %s role with 403",
    async (role) => {
      db.findUnique.mockResolvedValue(tokenRecord({ role }));
      expect(await authenticateMcpRequest(request(bearer), now)).toEqual({
        ok: false,
        status: 403,
        code: "forbidden_role",
      });
    },
  );

  it("accepts super admins", async () => {
    db.findUnique.mockResolvedValue(tokenRecord({ role: "super_admin" }));
    expect((await authenticateMcpRequest(request(bearer), now)).ok).toBe(true);
  });

  it("re-reads the owner on every call, so demotion cuts access at once", async () => {
    db.findUnique.mockResolvedValueOnce(tokenRecord({ role: "admin" }));
    db.findUnique.mockResolvedValueOnce(tokenRecord({ role: "customer" }));
    const first = await authenticateMcpRequest(request(bearer), now);
    const second = await authenticateMcpRequest(request(bearer), now);
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, status: 403, code: "forbidden_role" });
    expect(db.findUnique).toHaveBeenCalledTimes(2);
  });

  it("re-reads the owner status on every call, so blocking cuts access at once", async () => {
    db.findUnique.mockResolvedValueOnce(tokenRecord({ status: "active" }));
    db.findUnique.mockResolvedValueOnce(tokenRecord({ status: "blocked" }));
    expect((await authenticateMcpRequest(request(bearer), now)).ok).toBe(true);
    expect((await authenticateMcpRequest(request(bearer), now)).ok).toBe(false);
  });

  it("throttles lastUsedAt writes and tolerates their failure", async () => {
    db.findUnique.mockResolvedValue(tokenRecord());
    await authenticateMcpRequest(request(bearer), now);
    expect(db.update).not.toHaveBeenCalled();

    db.findUnique.mockResolvedValue(
      tokenRecord({ lastUsedAt: new Date("2026-11-10T11:00:00Z") }),
    );
    db.update.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await authenticateMcpRequest(request(bearer), now);
    expect(result.ok).toBe(true);
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "tok_1" },
      data: { lastUsedAt: now },
    });
  });
});
