/** @jest-environment node */

import { challengeForVerifier } from "@/domains/admin/mcp_oauth/services/oauth_rules";
import { fakeOAuthDb as db } from "@/domains/admin/mcp_oauth/testing/fake_db";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { NextRequest } from "next/server";
import { POST } from "./route";

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

const ORIGIN = "http://localhost:3124";
const REDIRECT = "http://127.0.0.1:53000/callback";
const admin: CurrentUserDto = {
  id: "user_1",
  authUserId: "auth_1",
  email: "admin@example.com",
  role: "admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: "Gómez" },
};

function authorization(clientId: string, override: object = {}) {
  return {
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: challengeForVerifier("v".repeat(43)),
    code_challenge_method: "S256",
    state: "estado & raro",
    scope: "read",
    resource: `${ORIGIN}/api/mcp`,
    ...override,
  };
}

function decision(
  body: unknown,
  headers: Record<string, string> = {},
  contentType = "application/json",
): NextRequest {
  return new NextRequest(`${ORIGIN}/api/oauth/authorize`, {
    method: "POST",
    headers: {
      "content-type": contentType,
      origin: ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

let clientId: string;

describe("POST /api/oauth/authorize (consent decision, D3 D6)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.reset();
    mockResolveCurrentUser.mockResolvedValue(admin);
    clientId = String(
      db.clients.insert({
        clientId: "slcid_consent",
        source: "dynamic",
        name: "Agente",
        redirectUris: [REDIRECT],
        authMethod: "none",
        secretHash: null,
      }).clientId,
    );
  });

  it("issues a single-use code bound to the user's choice and echoes state and issuer", async () => {
    const response = await POST(
      decision({
        authorization: authorization(clientId),
        decision: "approve",
        access: "read_write",
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const target = new URL(data.redirectTo);
    expect(target.origin + target.pathname).toBe(REDIRECT);
    expect(target.searchParams.get("state")).toBe("estado & raro");
    expect(target.searchParams.get("iss")).toBe(ORIGIN);
    const code = target.searchParams.get("code") ?? "";
    expect(code).toMatch(/^slc_/);
    expect(db.codes.rows).toHaveLength(1);
    expect(JSON.stringify(db.codes.rows)).not.toContain(code);
    expect(db.codes.rows[0]).toMatchObject({
      userId: "user_1",
      scopes: ["read", "write"],
      redirectUri: REDIRECT,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("grants read-only when chosen, even if the client asked for write", async () => {
    await POST(
      decision({
        authorization: authorization(clientId, { scope: "read write" }),
        decision: "approve",
        access: "read",
      }),
    );
    expect(db.codes.rows[0]?.scopes).toEqual(["read"]);
  });

  it("redirects denials with access_denied and creates no code", async () => {
    const response = await POST(
      decision({
        authorization: authorization(clientId),
        decision: "deny",
        access: "read",
      }),
    );
    const target = new URL((await response.json()).data.redirectTo);
    expect(target.searchParams.get("error")).toBe("access_denied");
    expect(target.searchParams.get("state")).toBe("estado & raro");
    expect(db.codes.rows).toHaveLength(0);
  });

  it("revalidates the request: unknown client or redirect URI never redirects", async () => {
    for (const override of [
      { client_id: "slcid_nope" },
      { redirect_uri: "https://evil.example/cb" },
    ]) {
      const response = await POST(
        decision({
          authorization: authorization(clientId, override),
          decision: "approve",
          access: "read",
        }),
      );
      expect(response.status).toBe(400);
    }
    expect(db.codes.rows).toHaveLength(0);
  });

  it("reports request errors to the registered redirect URI", async () => {
    const response = await POST(
      decision({
        authorization: authorization(clientId, {
          code_challenge_method: "plain",
        }),
        decision: "approve",
        access: "read",
      }),
    );
    const target = new URL((await response.json()).data.redirectTo);
    expect(target.searchParams.get("error")).toBe("invalid_request");
    expect(db.codes.rows).toHaveLength(0);
  });

  describe("CSRF and access control", () => {
    const body = () => ({
      authorization: authorization(clientId),
      decision: "approve",
      access: "read",
    });

    it("rejects cross-origin, missing-origin and cross-site requests", async () => {
      const attempts: Record<string, string>[] = [
        { origin: "https://evil.example" },
        { origin: "" },
        { "sec-fetch-site": "cross-site" },
      ];
      for (const headers of attempts) {
        const response = await POST(decision(body(), headers));
        expect(response.status).toBe(403);
      }
      expect(db.codes.rows).toHaveLength(0);
    });

    it("rejects non-JSON bodies that a cross-site form could send", async () => {
      const response = await POST(
        decision(body(), {}, "application/x-www-form-urlencoded"),
      );
      expect(response.status).toBe(403);
    });

    it("requires a signed-in administrator", async () => {
      mockResolveCurrentUser.mockResolvedValueOnce(null);
      expect((await POST(decision(body()))).status).toBe(401);
      for (const override of [
        { role: "customer" },
        { role: "support" },
        { status: "blocked" },
      ]) {
        mockResolveCurrentUser.mockResolvedValueOnce({ ...admin, ...override });
        expect((await POST(decision(body()))).status).toBe(403);
      }
      expect(db.codes.rows).toHaveLength(0);
    });

    it("rejects malformed bodies and unknown fields", async () => {
      expect((await POST(decision({ ...body(), access: "root" }))).status).toBe(
        400,
      );
      expect((await POST(decision({ ...body(), extra: true }))).status).toBe(
        400,
      );
      expect((await POST(decision({}))).status).toBe(400);
    });

    it("stops issuing codes beyond the active grant limit", async () => {
      for (let i = 0; i < 25; i += 1)
        db.grants.insert({
          userId: "user_1",
          clientRowId: "x",
          scopes: ["read"],
          resource: `${ORIGIN}/api/mcp`,
          expiresAt: new Date(Date.now() + 86_400_000),
        });
      const response = await POST(decision(body()));
      expect(response.status).toBe(409);
      expect((await response.json()).message).toBe("oauth_grant_limit");
    });
  });
});
