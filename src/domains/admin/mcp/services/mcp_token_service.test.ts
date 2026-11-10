/** @jest-environment node */

import {
  MCP_TOKEN_MAX_ACTIVE_PER_USER,
  hashTokenSecret,
} from "./mcp_token_rules";
import {
  McpTokenError,
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
} from "./mcp_token_service";

const db = {
  count: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  updateMany: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mcpAccessToken: {
      count: (...args: unknown[]) => db.count(...args),
      create: (...args: unknown[]) => db.create(...args),
      findMany: (...args: unknown[]) => db.findMany(...args),
      findFirst: (...args: unknown[]) => db.findFirst(...args),
      updateMany: (...args: unknown[]) => db.updateMany(...args),
    },
  },
}));
const now = new Date("2026-11-10T12:00:00Z");

function record(overrides: { revokedAt?: Date | null } = {}) {
  return {
    id: "tok_1",
    name: "Codex",
    prefix: "slm_abcdef",
    scopes: ["read" as const],
    createdAt: now,
    lastUsedAt: null,
    expiresAt: new Date("2026-12-10T12:00:00Z"),
    revokedAt: overrides.revokedAt ?? null,
  };
}

describe("MCP token service", () => {
  beforeEach(() => jest.resetAllMocks());

  it("stores only the SHA-256 hash and returns the plaintext once", async () => {
    db.count.mockResolvedValue(0);
    db.create.mockResolvedValue(record());

    const result = await createMcpToken(
      "user_1",
      { name: "Codex", access: "read", expiresInDays: 30 },
      now,
    );

    const args = db.create.mock.calls[0]?.[0];
    expect(args?.data.tokenHash).toBe(hashTokenSecret(result.secret));
    expect(JSON.stringify(args?.data)).not.toContain(result.secret);
    expect(args?.data.scopes).toEqual(["read"]);
    expect(args?.data.expiresAt).toEqual(new Date("2026-12-10T12:00:00Z"));
    expect(args?.data.userId).toBe("user_1");
    expect(result.secret).toMatch(/^slm_/);
    expect(JSON.stringify(result.token)).not.toContain(result.secret);
    expect(result.token).not.toHaveProperty("tokenHash");
    expect(args?.select).not.toHaveProperty("tokenHash");
  });

  it("grants read and write for the read_write access level", async () => {
    db.count.mockResolvedValue(0);
    db.create.mockResolvedValue(record());
    await createMcpToken(
      "user_1",
      { name: "Codex", access: "read_write", expiresInDays: 90 },
      now,
    );
    const data = db.create.mock.calls[0]?.[0].data;
    expect(data?.scopes).toEqual(["read", "write"]);
    expect(data?.expiresAt).toEqual(new Date("2027-02-08T12:00:00Z"));
  });

  it("refuses to exceed the active token limit", async () => {
    db.count.mockResolvedValue(MCP_TOKEN_MAX_ACTIVE_PER_USER);
    await expect(
      createMcpToken(
        "user_1",
        { name: "x", access: "read", expiresInDays: 30 },
        now,
      ),
    ).rejects.toMatchObject({ code: "mcp_token_limit", status: 409 });
    expect(db.create).not.toHaveBeenCalled();
  });

  it("lists only the caller tokens without hash material", async () => {
    db.findMany.mockResolvedValue([record()]);
    const tokens = await listMcpTokens("user_1", now);
    expect(db.findMany.mock.calls[0]?.[0]?.where).toEqual({ userId: "user_1" });
    expect(db.findMany.mock.calls[0]?.[0]?.select).not.toHaveProperty(
      "tokenHash",
    );
    expect(tokens[0]).not.toHaveProperty("tokenHash");
  });

  it("revokes only tokens owned by the caller", async () => {
    db.updateMany.mockResolvedValue({ count: 1 });
    db.findFirst.mockResolvedValue(record({ revokedAt: now }));
    const token = await revokeMcpToken("user_1", "tok_1", now);
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: "tok_1", userId: "user_1", revokedAt: null },
      data: { revokedAt: now },
    });
    expect(token.state).toBe("revoked");
  });

  it("treats tokens of other users as missing", async () => {
    db.updateMany.mockResolvedValue({ count: 0 });
    db.findFirst.mockResolvedValue(null);
    await expect(revokeMcpToken("user_2", "tok_1", now)).rejects.toBeInstanceOf(
      McpTokenError,
    );
  });
});
