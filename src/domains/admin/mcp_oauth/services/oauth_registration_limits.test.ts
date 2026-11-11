/** @jest-environment node */

import { fakeOAuthDb as db } from "../testing/fake_db";
import { enableLocalDevelopmentOrigin } from "../testing/local_development";
import type { OAuthClientRecord } from "../types/oauth_types";
import {
  issueAuthorizationCode,
  validateAuthorizationRequest,
} from "./oauth_authorization_service";
import {
  authenticateOAuthClient,
  registerDynamicClient,
} from "./oauth_client_service";
import { handleRegistration } from "./oauth_endpoints";
import {
  OAUTH_MAX_UNUSED_DYNAMIC_CLIENTS,
  OAUTH_MAX_UNUSED_PER_SOURCE,
  OAUTH_SOURCE_WINDOW_MS,
  OAUTH_UNUSED_CLIENT_RETENTION_MS,
  challengeForVerifier,
} from "./oauth_rules";
import { exchangeAuthorizationCode } from "./oauth_token_service";

jest.mock("@/lib/prisma", () => ({
  prisma:
    jest.requireActual<typeof import("../testing/fake_db")>(
      "../testing/fake_db",
    ).fakeOAuthDb.prisma,
}));

enableLocalDevelopmentOrigin();

const REDIRECT = "http://127.0.0.1:53000/callback";
const RESOURCE = "http://localhost:3124/api/mcp";
const VERIFIER = "v".repeat(43);

function register(ip?: string): Promise<Response> {
  return handleRegistration(
    new Request("http://localhost:3124/api/oauth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(ip ? { "x-forwarded-for": ip } : {}),
      },
      body: JSON.stringify({ redirect_uris: [REDIRECT] }),
    }),
  );
}

function seedUnused(count: number, createdAt: Date): void {
  for (let i = 0; i < count; i += 1)
    db.clients.insert({
      clientId: `slcid_seed_${i}`,
      source: "dynamic",
      name: "x",
      redirectUris: [REDIRECT],
      authMethod: "none",
      secretHash: null,
      registrantHash: null,
      createdAt,
    });
}

let originalSecret: string | undefined;
beforeAll(() => {
  originalSecret = process.env.SUPABASE_SECRET_KEY;
  Reflect.set(process.env, "SUPABASE_SECRET_KEY", "test-secret");
});
afterAll(() => {
  if (originalSecret === undefined)
    Reflect.deleteProperty(process.env, "SUPABASE_SECRET_KEY");
  else Reflect.set(process.env, "SUPABASE_SECRET_KEY", originalSecret);
});
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  db.reset();
});
afterEach(() => jest.restoreAllMocks());

describe("dynamic registration abuse limits (D2)", () => {
  it("limits unused registrations per hashed source with 429 and stores no raw IP", async () => {
    for (let i = 0; i < OAUTH_MAX_UNUSED_PER_SOURCE; i += 1)
      expect((await register("203.0.113.9")).status).toBe(201);
    const blocked = await register("203.0.113.9");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({
      error: "temporarily_unavailable",
    });
    expect(JSON.stringify(db.clients.rows)).not.toContain("203.0.113.9");
    expect(db.clients.rows[0]?.registrantHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not let one source lock out other networks (no global lockout)", async () => {
    for (let i = 0; i <= OAUTH_MAX_UNUSED_PER_SOURCE; i += 1)
      await register("203.0.113.9");
    expect((await register("198.51.100.7")).status).toBe(201);
    expect((await register("2001:db8:5::1")).status).toBe(201);
    // Requests without a resolvable source are still served (global limits only).
    expect((await register()).status).toBe(201);
  });

  it("frees the per-source budget as the window passes", async () => {
    // The fake database stamps rows with the real clock, so anchor on it.
    const start = new Date();
    const body = { redirect_uris: [REDIRECT] };
    const source = "a".repeat(64);
    for (let i = 0; i < OAUTH_MAX_UNUSED_PER_SOURCE; i += 1)
      await registerDynamicClient(body, start, source);
    await expect(
      registerDynamicClient(body, new Date(start.getTime() + 60_000), source),
    ).rejects.toMatchObject({ status: 429 });
    await expect(
      registerDynamicClient(
        body,
        new Date(start.getTime() + OAUTH_SOURCE_WINDOW_MS + 1_000),
        source,
      ),
    ).resolves.toBeDefined();
  });

  it("evicts the OLDEST unused registrations at the global ceiling instead of refusing", async () => {
    seedUnused(OAUTH_MAX_UNUSED_DYNAMIC_CLIENTS, new Date(Date.now() - 60_000));
    const oldest = db.clients.rows[0]?.clientId;
    const response = await register("203.0.113.9");
    expect(response.status).toBe(201);
    expect(db.clients.rows).toHaveLength(OAUTH_MAX_UNUSED_DYNAMIC_CLIENTS);
    expect(db.clients.rows.some((row) => row.clientId === oldest)).toBe(false);
  });

  it("purges never-authorized clients after the short retention but keeps authorized ones and live codes", async () => {
    const stale = new Date(
      Date.now() - OAUTH_UNUSED_CLIENT_RETENTION_MS - 1_000,
    );
    seedUnused(3, stale);
    const [, withGrant, withCode] = db.clients.rows;
    db.grants.insert({ clientRowId: withGrant?.id, userId: "u" });
    db.codes.insert({ clientRowId: withCode?.id, userId: "u" });
    expect((await register("203.0.113.9")).status).toBe(201);
    const remaining = db.clients.rows.map((row) => row.id);
    expect(remaining).toEqual(
      expect.arrayContaining([withGrant?.id, withCode?.id]),
    );
    expect(remaining).toHaveLength(3); // grant + code + the new registration
  });

  it("does not count authorized clients against a source and forgets the hashed source on authorization", async () => {
    db.users.set("user_1", {
      id: "user_1",
      email: "admin@example.com",
      role: "admin",
      status: "active",
      profile: null,
    });
    const response = await register("203.0.113.9");
    const { client_id: clientId } = (await response.json()) as {
      client_id: string;
    };
    expect(db.clients.rows[0]?.registrantHash).toMatch(/^[0-9a-f]{64}$/);
    const record: OAuthClientRecord = await authenticateOAuthClient(
      new Headers(),
      new URLSearchParams({ client_id: clientId }),
    );
    const now = new Date();
    const validation = await validateAuthorizationRequest(
      {
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT,
        code_challenge: challengeForVerifier(VERIFIER),
        code_challenge_method: "S256",
        scope: "read",
        resource: RESOURCE,
      },
      { resource: RESOURCE, now },
    );
    if (!validation.ok) throw new Error("validation failed");
    const code = await issueAuthorizationCode(
      "user_1",
      validation.request,
      "read",
      now,
    );
    await exchangeAuthorizationCode(
      {
        client: record,
        code,
        redirectUri: REDIRECT,
        codeVerifier: VERIFIER,
        resource: RESOURCE,
        canonicalResource: RESOURCE,
      },
      now,
    );
    expect(db.clients.rows[0]?.registrantHash).toBeNull();
    // The authorized client no longer consumes the source budget.
    for (let i = 0; i < OAUTH_MAX_UNUSED_PER_SOURCE; i += 1)
      expect((await register("203.0.113.9")).status).toBe(201);
  });
});
