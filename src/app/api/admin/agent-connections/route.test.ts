/** @jest-environment node */

import { fakeOAuthDb as db } from "@/domains/admin/mcp_oauth/testing/fake_db";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { NextRequest } from "next/server";
import { DELETE as purge } from "./[grantId]/permanent/route";
import { DELETE as revoke } from "./[grantId]/route";
import { GET } from "./route";

const mockResolveCurrentUser = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: jest.requireActual<
    typeof import("@/domains/admin/mcp_oauth/testing/fake_db")
  >("@/domains/admin/mcp_oauth/testing/fake_db").fakeOAuthDb.prisma,
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: () => ({}),
  copySupabaseResponseCookies: (_source: unknown, target: unknown) => target,
}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: (...args: unknown[]) => mockResolveCurrentUser(...args),
}));

const ORIGIN = "http://localhost";
const BASE = `${ORIGIN}/api/admin/agent-connections`;
const admin: CurrentUserDto = {
  id: "user_1",
  authUserId: "auth_1",
  email: "admin@example.com",
  role: "admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: "Gómez" },
};

function call(method: string, path = "", headers: Record<string, string> = {}) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: method === "GET" ? headers : { origin: ORIGIN, ...headers },
  });
}
const params = (grantId: string) => ({ params: Promise.resolve({ grantId }) });

function addGrant(userId: string, override: object = {}) {
  return db.grants.insert({
    userId,
    clientRowId: clientRow.id,
    scopes: ["read", "write"],
    resource: `${ORIGIN}/api/mcp`,
    expiresAt: new Date(Date.now() + 86_400_000),
    ...override,
  });
}

let clientRow: { id: string };

describe("OAuth connections API (D7)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.reset();
    mockResolveCurrentUser.mockResolvedValue(admin);
    clientRow = db.clients.insert({
      clientId: "slcid_a",
      source: "metadata_document",
      name: "Codex",
      clientUri: "https://codex.example",
      redirectUris: ["https://codex.example/callback"],
      authMethod: "none",
      secretHash: null,
    });
  });

  it("lists only the caller's grants without tokens, hashes or secrets", async () => {
    addGrant("user_1");
    addGrant("user_2");
    db.tokens.insert({
      grantId: "grant_1",
      kind: "access",
      tokenHash: "h".repeat(64),
      expiresAt: new Date(),
    });
    const response = await GET(call("GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.grants).toHaveLength(1);
    expect(body.data.grants[0]).toMatchObject({
      clientName: "Codex",
      clientUri: "https://codex.example",
      redirectHost: "codex.example",
      scopes: ["read", "write"],
      state: "active",
    });
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/tokenHash|secretHash|codeHash|[0-9a-f]{64}/);
  });

  it("revokes a grant at once and reports the revoked state", async () => {
    const grant = addGrant("user_1");
    const response = await revoke(
      call("DELETE", `/${grant.id}`),
      params(grant.id),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.grant.state).toBe("revoked");
    expect(db.grants.rows[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it("hides other users' grants as not found", async () => {
    const grant = addGrant("user_2");
    expect(
      (await revoke(call("DELETE", `/${grant.id}`), params(grant.id))).status,
    ).toBe(404);
    expect(
      (await purge(call("DELETE", `/${grant.id}/permanent`), params(grant.id)))
        .status,
    ).toBe(404);
    expect(db.grants.rows).toHaveLength(1);
  });

  it("deletes only revoked grants and removes their tokens with them", async () => {
    const grant = addGrant("user_1");
    const active = await purge(
      call("DELETE", `/${grant.id}/permanent`),
      params(grant.id),
    );
    expect(active.status).toBe(409);
    expect((await active.json()).message).toBe("mcp_oauth_grant_not_revoked");
    await revoke(call("DELETE", `/${grant.id}`), params(grant.id));
    const done = await purge(
      call("DELETE", `/${grant.id}/permanent`),
      params(grant.id),
    );
    expect(done.status).toBe(200);
    expect(db.grants.rows).toHaveLength(0);
  });

  it("does not delete a grant that only expired", async () => {
    const grant = addGrant("user_1", {
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(
      (await purge(call("DELETE", `/${grant.id}/permanent`), params(grant.id)))
        .status,
    ).toBe(409);
  });

  it("requires a same-origin administrator session", async () => {
    const grant = addGrant("user_1");
    expect(
      (
        await revoke(
          call("DELETE", `/${grant.id}`, { origin: "https://evil.example" }),
          params(grant.id),
        )
      ).status,
    ).toBe(403);
    mockResolveCurrentUser.mockResolvedValueOnce(null);
    expect((await GET(call("GET"))).status).toBe(401);
    mockResolveCurrentUser.mockResolvedValueOnce({
      ...admin,
      role: "customer",
    });
    expect((await GET(call("GET"))).status).toBe(403);
    expect(db.grants.rows[0]?.revokedAt).toBeNull();
  });
});
