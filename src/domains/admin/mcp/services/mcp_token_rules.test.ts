/** @jest-environment node */

import {
  MCP_TOKEN_PREFIX,
  displayPrefix,
  expiryFrom,
  extractBearerSecret,
  generateTokenSecret,
  hashTokenSecret,
  isTokenSecretShape,
  resolveTokenState,
  scopesForAccess,
  toMcpTokenDto,
} from "./mcp_token_rules";

describe("MCP token rules", () => {
  it("generates recognizable secrets with at least 256 bits of entropy", () => {
    const secret = generateTokenSecret();
    expect(secret.startsWith(MCP_TOKEN_PREFIX)).toBe(true);
    expect(isTokenSecretShape(secret)).toBe(true);
    // 43 base64url characters carry 32 random bytes = 256 bits.
    const body = secret.slice(MCP_TOKEN_PREFIX.length);
    expect(Buffer.from(body, "base64url")).toHaveLength(32);
  });

  it("never repeats a secret", () => {
    const secrets = new Set(
      Array.from({ length: 200 }, () => generateTokenSecret()),
    );
    expect(secrets.size).toBe(200);
  });

  it("hashes with SHA-256 hex and never leaks the plaintext", () => {
    const secret = generateTokenSecret();
    const hash = hashTokenSecret(secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashTokenSecret(secret));
    expect(hash).not.toContain(secret.slice(4, 12));
    expect(hashTokenSecret("slm_other")).not.toBe(hash);
  });

  it("keeps only a short non-secret prefix for display", () => {
    const secret = generateTokenSecret();
    const prefix = displayPrefix(secret);
    expect(secret.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(secret.length / 3);
  });

  it.each([
    [null, null],
    ["", null],
    ["Basic abc", null],
    ["Bearer", null],
    ["Bearer short", null],
    ["Bearer slm_" + "a".repeat(42), null],
    ["Bearer slm_" + "a".repeat(44), null],
    ["Bearer xyz_" + "a".repeat(43), null],
  ])("rejects malformed authorization header %p", (header, expected) => {
    expect(extractBearerSecret(header)).toBe(expected);
  });

  it("extracts a well-formed bearer secret", () => {
    const secret = generateTokenSecret();
    expect(extractBearerSecret(`Bearer ${secret}`)).toBe(secret);
    expect(extractBearerSecret(`bearer ${secret}`)).toBe(secret);
  });

  it("maps access levels to scopes, write implying read", () => {
    expect(scopesForAccess("read")).toEqual(["read"]);
    expect(scopesForAccess("read_write")).toEqual(["read", "write"]);
  });

  it("resolves token state from revocation and expiry", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const future = new Date("2026-12-01T00:00:00Z");
    const past = new Date("2026-11-01T00:00:00Z");
    expect(resolveTokenState({ revokedAt: null, expiresAt: future }, now)).toBe(
      "active",
    );
    expect(resolveTokenState({ revokedAt: null, expiresAt: past }, now)).toBe(
      "expired",
    );
    expect(resolveTokenState({ revokedAt: past, expiresAt: future }, now)).toBe(
      "revoked",
    );
    expect(expiryFrom(now, 30).toISOString()).toBe("2026-12-10T12:00:00.000Z");
  });

  it("projects a client-safe DTO without secret material", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const dto = toMcpTokenDto(
      {
        id: "t1",
        name: "Codex",
        prefix: "slm_abcdef",
        scopes: ["read"],
        createdAt: now,
        lastUsedAt: null,
        expiresAt: expiryFrom(now, 30),
        revokedAt: null,
      },
      now,
    );
    expect(dto).toEqual({
      id: "t1",
      name: "Codex",
      prefix: "slm_abcdef",
      scopes: ["read"],
      createdAt: now.toISOString(),
      lastUsedAt: null,
      expiresAt: "2026-12-10T12:00:00.000Z",
      revokedAt: null,
      state: "active",
    });
    expect(Object.keys(dto)).not.toContain("tokenHash");
  });
});
