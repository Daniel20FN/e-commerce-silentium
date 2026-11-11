/** @jest-environment node */

import { fakeOAuthDb as db } from "../testing/fake_db";
import type { OAuthClientRecord } from "../types/oauth_types";
import {
  buildAuthorizationRedirect,
  issueAuthorizationCode,
  validateAuthorizationRequest,
} from "./oauth_authorization_service";
import {
  authenticateOAuthClient,
  resolveClientForAuthorization,
} from "./oauth_client_service";
import {
  handleRegistration,
  handleRevocation,
  handleToken,
} from "./oauth_endpoints";
import {
  OAUTH_ACCESS_TOKEN_TTL_MS,
  OAUTH_CODE_TTL_MS,
  OAUTH_GRANT_TTL_MS,
  challengeForVerifier,
} from "./oauth_rules";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
  resolveOAuthAccessToken,
} from "./oauth_token_service";

jest.mock("@/lib/prisma", () => ({
  prisma:
    jest.requireActual<typeof import("../testing/fake_db")>(
      "../testing/fake_db",
    ).fakeOAuthDb.prisma,
}));

const RESOURCE = "http://localhost:3124/api/mcp";
const ISSUER = "http://localhost:3124";
const REDIRECT = "http://127.0.0.1:53000/callback";
const t0 = new Date("2026-11-11T12:00:00Z");
const VERIFIER = "v".repeat(43);
const CHALLENGE = challengeForVerifier(VERIFIER);

function jsonRequest(body: unknown, raw?: string): Request {
  return new Request("http://localhost:3124/api/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

function formRequest(
  fields: Record<string, string>,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost:3124/api/oauth/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

async function registerPublicClient(
  extra: Record<string, unknown> = {},
): Promise<{ clientId: string; record: OAuthClientRecord }> {
  const response = await handleRegistration(
    jsonRequest({
      client_name: "Agente de prueba",
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: "none",
      ...extra,
    }),
  );
  const body = (await response.json()) as { client_id: string };
  const record = await authenticateOAuthClient(
    new Headers(),
    new URLSearchParams({ client_id: body.client_id }),
  );
  return { clientId: body.client_id, record };
}

async function issueCode(
  client: OAuthClientRecord,
  access: "read" | "read_write" = "read",
  overrides: Partial<{ now: Date; scope: string }> = {},
): Promise<string> {
  const validation = await validateAuthorizationRequest(
    {
      response_type: "code",
      client_id: client.clientId,
      redirect_uri: REDIRECT,
      code_challenge: CHALLENGE,
      code_challenge_method: "S256",
      state: "estado-1",
      scope: overrides.scope ?? "read",
      resource: RESOURCE,
    },
    { resource: RESOURCE, now: overrides.now },
  );
  if (!validation.ok) throw new Error("validation failed");
  return issueAuthorizationCode(
    "user_1",
    validation.request,
    access,
    overrides.now ?? t0,
  );
}

function exchange(
  client: OAuthClientRecord,
  code: string,
  overrides: Partial<{
    redirectUri: string;
    codeVerifier: string;
    resource: string | null;
    now: Date;
  }> = {},
) {
  return exchangeAuthorizationCode(
    {
      client,
      code,
      redirectUri: overrides.redirectUri ?? REDIRECT,
      codeVerifier: overrides.codeVerifier ?? VERIFIER,
      resource:
        overrides.resource === undefined ? RESOURCE : overrides.resource,
      canonicalResource: RESOURCE,
    },
    overrides.now ?? t0,
  );
}

const later = (ms: number): Date => new Date(t0.getTime() + ms);

beforeEach(() => {
  jest.restoreAllMocks();
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

describe("dynamic client registration (D2)", () => {
  it("registers a public client without issuing a secret", async () => {
    const response = await handleRegistration(
      jsonRequest({
        client_name: "Cliente MCP",
        redirect_uris: [REDIRECT, "https://app.example.com/cb"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        application_type: "native",
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(body.client_id).toEqual(expect.stringMatching(/^slcid_/));
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body).not.toHaveProperty("client_secret");
    expect(db.clients.rows).toHaveLength(1);
    expect(db.clients.rows[0]?.secretHash).toBeNull();
  });

  it("defaults the auth method to none when omitted and names the client after its redirect host", async () => {
    const response = await handleRegistration(
      jsonRequest({ redirect_uris: ["https://claude.ai/api/mcp/callback"] }),
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body.client_name).toBe("claude.ai");
  });

  it.each([
    ["plain http on a public host", "http://example.com/cb"],
    ["custom scheme", "cursor://anysphere.cursor-retrieval/oauth/callback"],
    ["fragment", "https://example.com/cb#frag"],
    ["javascript scheme", "javascript:alert(1)"],
    ["credentials", "https://user:pw@example.com/cb"],
    ["oversize", `https://example.com/${"a".repeat(600)}`],
    ["not a URL", "no-es-url"],
  ])("rejects a %s redirect URI", async (_name, uri) => {
    const response = await handleRegistration(
      jsonRequest({ redirect_uris: [uri] }),
    );
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_redirect_uri");
    expect(db.clients.rows).toHaveLength(0);
  });

  it.each([
    ["no redirect URIs", { redirect_uris: [] }],
    [
      "too many redirect URIs",
      {
        redirect_uris: Array.from(
          { length: 6 },
          (_, i) => `https://e.com/${i}`,
        ),
      },
    ],
  ])("rejects %s", async (_name, body) => {
    const response = await handleRegistration(jsonRequest(body));
    expect(response.status).toBe(400);
  });

  it.each([
    ["implicit grant", { grant_types: ["implicit"] }],
    ["password grant", { grant_types: ["password"] }],
    ["token response type", { response_types: ["token"] }],
    ["unknown auth method", { token_endpoint_auth_method: "private_key_jwt" }],
    ["oversize name", { client_name: "x".repeat(101) }],
    ["http client_uri", { client_uri: "http://example.com" }],
    ["refresh-only grant", { grant_types: ["refresh_token"] }],
  ])("rejects %s", async (_name, extra) => {
    const response = await handleRegistration(
      jsonRequest({ redirect_uris: ["https://example.com/cb"], ...extra }),
    );
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_client_metadata");
  });

  it("rejects oversized bodies, non-JSON bodies and wrong content types", async () => {
    const big = await handleRegistration(
      jsonRequest(
        null,
        JSON.stringify({ redirect_uris: [REDIRECT], pad: "x".repeat(20_000) }),
      ),
    );
    expect(big.status).toBe(413);
    const malformed = await handleRegistration(jsonRequest(null, "{nope"));
    expect(malformed.status).toBe(400);
    const wrongType = await handleRegistration(
      new Request("http://localhost/api/oauth/register", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "{}",
      }),
    );
    expect(wrongType.status).toBe(400);
  });

  it("issues a confidential secret once and stores only its hash", async () => {
    const response = await handleRegistration(
      jsonRequest({
        redirect_uris: ["https://example.com/cb"],
        token_endpoint_auth_method: "client_secret_basic",
      }),
    );
    const body = (await response.json()) as {
      client_id: string;
      client_secret: string;
    };
    expect(body.client_secret).toMatch(/^slcs_/);
    expect(JSON.stringify(db.clients.rows)).not.toContain(body.client_secret);
    expect(db.clients.rows[0]?.secretHash).toMatch(/^[0-9a-f]{64}$/);

    const basic = (secret: string) =>
      `Basic ${Buffer.from(`${body.client_id}:${secret}`).toString("base64")}`;
    await expect(
      authenticateOAuthClient(
        new Headers({ authorization: basic(body.client_secret) }),
        new URLSearchParams(),
      ),
    ).resolves.toMatchObject({ clientId: body.client_id });
    await expect(
      authenticateOAuthClient(
        new Headers({ authorization: basic("slcs_wrong") }),
        new URLSearchParams(),
      ),
    ).rejects.toMatchObject({ error: "invalid_client", status: 401 });
    await expect(
      authenticateOAuthClient(
        new Headers(),
        new URLSearchParams({ client_id: body.client_id }),
      ),
    ).rejects.toMatchObject({ error: "invalid_client" });
  });

  it("caps unused registrations and purges abandoned ones", async () => {
    for (let i = 0; i < 200; i += 1)
      db.clients.insert({
        clientId: `slcid_${i}`,
        source: "dynamic",
        name: "x",
        redirectUris: [REDIRECT],
        authMethod: "none",
        secretHash: null,
      });
    const blocked = await handleRegistration(
      jsonRequest({ redirect_uris: [REDIRECT] }),
    );
    expect(blocked.status).toBe(503);
    // Clients abandoned for over 24 h are purged before the cap is checked.
    db.clients.rows.forEach((row) => {
      row.createdAt = new Date(Date.now() - 25 * 3600 * 1000);
    });
    const allowed = await handleRegistration(
      jsonRequest({ redirect_uris: [REDIRECT] }),
    );
    expect(allowed.status).toBe(201);
    expect(db.clients.rows).toHaveLength(1);
  });
});

describe("Client ID Metadata Documents (D2)", () => {
  const url = "https://app.example.com/oauth/client.json";
  const document = {
    client_id: url,
    client_name: "Cliente CIMD",
    client_uri: "https://app.example.com",
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: "none" as const,
  };

  it("stores a fetched document, reuses it until its cache expires and then refreshes it", async () => {
    const fetchDocument = jest
      .fn()
      .mockResolvedValue({ document, ttlSeconds: 600 });
    const first = await resolveClientForAuthorization(url, {
      now: t0,
      fetchDocument,
    });
    expect(first).toMatchObject({
      clientId: url,
      source: "metadata_document",
      name: "Cliente CIMD",
      authMethod: "none",
    });
    await resolveClientForAuthorization(url, {
      now: later(60_000),
      fetchDocument,
    });
    expect(fetchDocument).toHaveBeenCalledTimes(1);
    await resolveClientForAuthorization(url, {
      now: later(601_000),
      fetchDocument,
    });
    expect(fetchDocument).toHaveBeenCalledTimes(2);
  });

  it("never fetches when fetching is disabled and keeps the stored copy on refresh errors", async () => {
    const fetchDocument = jest.fn().mockRejectedValue(new Error("down"));
    await expect(
      resolveClientForAuthorization(url, {
        now: t0,
        fetchDocument,
        allowFetch: false,
      }),
    ).resolves.toBeNull();
    expect(fetchDocument).not.toHaveBeenCalled();
    await expect(
      resolveClientForAuthorization(url, { now: t0, fetchDocument }),
    ).resolves.toBeNull();
    db.clients.insert({
      clientId: url,
      source: "metadata_document",
      name: "Guardado",
      redirectUris: [REDIRECT],
      authMethod: "none",
      secretHash: null,
      metadataExpiresAt: new Date(t0.getTime() - 1),
    });
    await expect(
      resolveClientForAuthorization(url, { now: t0, fetchDocument }),
    ).resolves.toMatchObject({ name: "Guardado" });
  });

  it.each([
    "http://app.example.com/client.json",
    "https://app.example.com",
    "https://app.example.com:8443/client.json",
    "https://127.0.0.1/client.json",
    "https://localhost/client.json",
    "https://user@app.example.com/client.json",
    "https://app.example.com/client.json#frag",
  ])("does not fetch unacceptable client_id %s", async (clientId) => {
    const fetchDocument = jest.fn();
    await expect(
      resolveClientForAuthorization(clientId, { now: t0, fetchDocument }),
    ).resolves.toBeNull();
    expect(fetchDocument).not.toHaveBeenCalled();
  });
});

describe("authorization request validation (D3)", () => {
  const base = (client: OAuthClientRecord) => ({
    response_type: "code",
    client_id: client.clientId,
    redirect_uri: REDIRECT,
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: "xyz",
    resource: RESOURCE,
  });

  it("accepts a valid request and ignores the scope the client asked for", async () => {
    const { record } = await registerPublicClient();
    const result = await validateAuthorizationRequest(
      { ...base(record), scope: "read write offline_access" },
      { resource: RESOURCE },
    );
    expect(result).toMatchObject({
      ok: true,
      request: {
        state: "xyz",
        resource: RESOURCE,
        requestedScopes: ["read", "write"],
      },
    });
  });

  it("never redirects for unknown clients or unregistered redirect URIs", async () => {
    const { record } = await registerPublicClient();
    await expect(
      validateAuthorizationRequest(
        { ...base(record), client_id: "slcid_nope" },
        { resource: RESOURCE },
      ),
    ).resolves.toEqual({ ok: false, kind: "page", code: "invalid_client" });
    await expect(
      validateAuthorizationRequest(
        { ...base(record), redirect_uri: "https://evil.example/cb" },
        { resource: RESOURCE },
      ),
    ).resolves.toEqual({
      ok: false,
      kind: "page",
      code: "invalid_redirect_uri",
    });
    await expect(
      validateAuthorizationRequest(
        { ...base(record), redirect_uri: undefined },
        { resource: RESOURCE },
      ),
    ).resolves.toMatchObject({ kind: "page" });
  });

  it("allows only the port of a loopback redirect URI to differ", async () => {
    const { record } = await registerPublicClient();
    await expect(
      validateAuthorizationRequest(
        { ...base(record), redirect_uri: "http://127.0.0.1:61234/callback" },
        { resource: RESOURCE },
      ),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      validateAuthorizationRequest(
        { ...base(record), redirect_uri: "http://127.0.0.1:61234/other" },
        { resource: RESOURCE },
      ),
    ).resolves.toMatchObject({ kind: "page" });
    await expect(
      validateAuthorizationRequest(
        { ...base(record), redirect_uri: "http://localhost:53000/callback" },
        { resource: RESOURCE },
      ),
    ).resolves.toMatchObject({ kind: "page" });
  });

  it.each([
    ["missing PKCE", { code_challenge: undefined }, "invalid_request"],
    ["plain PKCE", { code_challenge_method: "plain" }, "invalid_request"],
    ["malformed challenge", { code_challenge: "corto" }, "invalid_request"],
    ["implicit flow", { response_type: "token" }, "unsupported_response_type"],
    [
      "another resource",
      { resource: "https://other.example/api/mcp" },
      "invalid_target",
    ],
    ["oversize state", { state: "s".repeat(2000) }, "invalid_request"],
  ])(
    "reports %s to the registered redirect URI",
    async (_name, override, error) => {
      const { record } = await registerPublicClient();
      const result = await validateAuthorizationRequest(
        { ...base(record), ...override },
        { resource: RESOURCE },
      );
      expect(result).toMatchObject({
        ok: false,
        kind: "redirect",
        redirectUri: REDIRECT,
        error,
      });
    },
  );

  it("accepts the bare origin as the same resource and echoes state and issuer in redirects", async () => {
    const { record } = await registerPublicClient();
    await expect(
      validateAuthorizationRequest(
        { ...base(record), resource: `${ISSUER}/` },
        { resource: RESOURCE },
      ),
    ).resolves.toMatchObject({ ok: true, request: { resource: RESOURCE } });
    const url = new URL(
      buildAuthorizationRedirect(
        REDIRECT,
        { code: "abc" },
        "es tado&x=1",
        ISSUER,
      ),
    );
    expect(url.searchParams.get("state")).toBe("es tado&x=1");
    expect(url.searchParams.get("iss")).toBe(ISSUER);
    expect(url.searchParams.get("code")).toBe("abc");
    const denied = new URL(
      buildAuthorizationRedirect(
        REDIRECT,
        { error: "access_denied" },
        null,
        ISSUER,
      ),
    );
    expect(denied.searchParams.get("error")).toBe("access_denied");
    expect(denied.searchParams.has("state")).toBe(false);
  });

  it("refuses to issue codes beyond the active grant limit", async () => {
    const { record } = await registerPublicClient();
    for (let i = 0; i < 25; i += 1)
      db.grants.insert({
        userId: "user_1",
        clientRowId: record.id,
        scopes: ["read"],
        resource: RESOURCE,
        expiresAt: later(OAUTH_GRANT_TTL_MS),
      });
    await expect(issueCode(record)).rejects.toMatchObject({
      code: "oauth_grant_limit",
    });
  });
});

describe("authorization code exchange (D3)", () => {
  it("exchanges a code for tokens whose scope is the user's choice, storing only hashes", async () => {
    const { record } = await registerPublicClient();
    const code = await issueCode(record, "read_write", { scope: "read" });
    const tokens = await exchange(record, code);
    expect(tokens).toMatchObject({
      token_type: "Bearer",
      expires_in: 3600,
      scope: "read write",
    });
    expect(tokens.access_token).toMatch(/^sla_/);
    expect(tokens.refresh_token).toMatch(/^slr_/);
    const stored = JSON.stringify([
      db.codes.rows,
      db.grants.rows,
      db.tokens.rows,
    ]);
    for (const secret of [code, tokens.access_token, tokens.refresh_token])
      expect(stored).not.toContain(secret);
    expect(db.grants.rows[0]?.expiresAt).toEqual(later(OAUTH_GRANT_TTL_MS));
    expect(db.codes.rows[0]?.grantId).toBe(db.grants.rows[0]?.id);
  });

  it("grants read only when the user chose read-only, whatever the client requested", async () => {
    const { record } = await registerPublicClient();
    const code = await issueCode(record, "read", { scope: "read write" });
    await expect(exchange(record, code)).resolves.toMatchObject({
      scope: "read",
    });
  });

  it("rejects a wrong PKCE verifier without consuming the code", async () => {
    const { record } = await registerPublicClient();
    const code = await issueCode(record);
    await expect(
      exchange(record, code, { codeVerifier: "x".repeat(43) }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    await expect(
      exchange(record, code, { codeVerifier: "corto" }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    await expect(exchange(record, code)).resolves.toBeDefined();
  });

  it("rejects mismatched redirect URI, client and resource", async () => {
    const { record } = await registerPublicClient();
    const { record: other } = await registerPublicClient();
    const code = await issueCode(record);
    await expect(
      exchange(record, code, { redirectUri: "http://127.0.0.1:53000/otra" }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    await expect(exchange(other, code)).rejects.toMatchObject({
      error: "invalid_grant",
    });
    await expect(
      exchange(record, code, { resource: "https://other.example/api/mcp" }),
    ).rejects.toMatchObject({ error: "invalid_target" });
    await expect(exchange(record, code)).resolves.toBeDefined();
  });

  it("expires codes after ten minutes", async () => {
    const { record } = await registerPublicClient();
    const code = await issueCode(record);
    await expect(
      exchange(record, code, { now: later(OAUTH_CODE_TTL_MS + 1) }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    const fresh = await issueCode(record);
    await expect(
      exchange(record, fresh, { now: later(OAUTH_CODE_TTL_MS - 1) }),
    ).resolves.toBeDefined();
  });

  it("is single use: replaying a code fails and revokes the grant it created", async () => {
    const { record } = await registerPublicClient();
    const code = await issueCode(record);
    const first = await exchange(record, code);
    await expect(exchange(record, code)).rejects.toMatchObject({
      error: "invalid_grant",
    });
    expect(db.grants.rows[0]?.revokedAt).toBeInstanceOf(Date);
    await expect(
      resolveOAuthAccessToken(first.access_token, RESOURCE, t0),
    ).resolves.toEqual({ ok: false, code: "revoked_token" });
    await expect(
      refreshAccessToken(
        {
          client: record,
          refreshToken: first.refresh_token,
          scope: null,
          resource: null,
        },
        t0,
      ),
    ).rejects.toMatchObject({ error: "invalid_grant" });
  });

  it("rejects codes for users that are no longer active administrators", async () => {
    const { record } = await registerPublicClient();
    const code = await issueCode(record);
    db.users.set("user_1", { ...db.users.get("user_1")!, role: "customer" });
    await expect(exchange(record, code)).rejects.toMatchObject({
      error: "invalid_grant",
    });
  });

  it("serves the token endpoint over HTTP with RFC 6749 errors and no-store", async () => {
    const { clientId, record } = await registerPublicClient();
    // handleToken uses the real clock, so the code must be issued "now".
    const code = await issueCode(record, "read_write", { now: new Date() });
    const ok = await handleToken(
      formRequest({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: REDIRECT,
        code_verifier: VERIFIER,
        resource: RESOURCE,
      }),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(ok.headers.get("access-control-allow-origin")).toBe("*");
    const replay = await handleToken(
      formRequest({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: REDIRECT,
        code_verifier: VERIFIER,
      }),
    );
    expect(replay.status).toBe(400);
    expect(await replay.json()).toMatchObject({ error: "invalid_grant" });
    const unsupported = await handleToken(
      formRequest({ grant_type: "password", client_id: clientId }),
    );
    expect(await unsupported.json()).toMatchObject({
      error: "unsupported_grant_type",
    });
    const unknown = await handleToken(
      formRequest({ grant_type: "authorization_code", client_id: "slcid_x" }),
    );
    expect(unknown.status).toBe(401);
    const json = await handleToken(
      new Request("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(await json.json()).toMatchObject({ error: "invalid_request" });
  });
});

describe("refresh tokens (D4)", () => {
  async function connect(access: "read" | "read_write" = "read_write") {
    const { record } = await registerPublicClient();
    const tokens = await exchange(record, await issueCode(record, access));
    return { record, tokens };
  }
  const refresh = (
    record: OAuthClientRecord,
    refreshToken: string,
    now: Date,
    extra: Partial<{ scope: string; resource: string }> = {},
  ) =>
    refreshAccessToken(
      {
        client: record,
        refreshToken,
        scope: extra.scope ?? null,
        resource: extra.resource ?? null,
      },
      now,
    );

  it("limits access tokens to one hour", async () => {
    const { tokens } = await connect();
    await expect(
      resolveOAuthAccessToken(
        tokens.access_token,
        RESOURCE,
        later(OAUTH_ACCESS_TOKEN_TTL_MS - 1),
      ),
    ).resolves.toMatchObject({ ok: true, scopes: ["read", "write"] });
    await expect(
      resolveOAuthAccessToken(
        tokens.access_token,
        RESOURCE,
        later(OAUTH_ACCESS_TOKEN_TTL_MS),
      ),
    ).resolves.toEqual({ ok: false, code: "expired_token" });
  });

  it("rotates refresh tokens and keeps the original scope", async () => {
    const { record, tokens } = await connect();
    const at = later(OAUTH_ACCESS_TOKEN_TTL_MS + 5_000);
    const next = await refresh(record, tokens.refresh_token, at);
    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    expect(next.access_token).not.toBe(tokens.access_token);
    expect(next).toMatchObject({ scope: "read write", expires_in: 3600 });
    await expect(
      resolveOAuthAccessToken(next.access_token, RESOURCE, at),
    ).resolves.toMatchObject({ ok: true });
    const third = await refresh(
      record,
      next.refresh_token,
      later(2 * OAUTH_ACCESS_TOKEN_TTL_MS),
    );
    expect(third.refresh_token).not.toBe(next.refresh_token);
  });

  it("revokes the whole grant when a rotated refresh token is presented again", async () => {
    const { record, tokens } = await connect();
    const next = await refresh(record, tokens.refresh_token, later(1_000));
    await expect(
      refresh(record, tokens.refresh_token, later(2_000)),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    expect(db.grants.rows[0]?.revokedAt).toEqual(later(2_000));
    // The legitimate (newest) refresh token and access token are dead too.
    await expect(
      refresh(record, next.refresh_token, later(3_000)),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    await expect(
      resolveOAuthAccessToken(next.access_token, RESOURCE, later(3_000)),
    ).resolves.toEqual({ ok: false, code: "revoked_token" });
  });

  it("ends the grant after 90 days and caps the last access token at the grant expiry", async () => {
    const { record, tokens } = await connect();
    const nearEnd = later(OAUTH_GRANT_TTL_MS - 10 * 60 * 1000);
    const last = await refresh(record, tokens.refresh_token, nearEnd);
    expect(last.expires_in).toBe(600);
    await expect(
      resolveOAuthAccessToken(
        last.access_token,
        RESOURCE,
        later(OAUTH_GRANT_TTL_MS),
      ),
    ).resolves.toEqual({ ok: false, code: "expired_token" });
    await expect(
      refresh(record, last.refresh_token, later(OAUTH_GRANT_TTL_MS)),
    ).rejects.toMatchObject({ error: "invalid_grant" });
  });

  it("checks scope, resource, client and the owner on refresh", async () => {
    const { record, tokens } = await connect("read");
    const { record: other } = await registerPublicClient();
    await expect(
      refresh(record, tokens.refresh_token, later(1_000), {
        scope: "read write",
      }),
    ).rejects.toMatchObject({ error: "invalid_scope" });
    await expect(
      refresh(record, tokens.refresh_token, later(1_000), {
        resource: "https://x.example/api/mcp",
      }),
    ).rejects.toMatchObject({ error: "invalid_target" });
    await expect(
      refresh(other, tokens.refresh_token, later(1_000)),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    db.users.set("user_1", { ...db.users.get("user_1")!, status: "blocked" });
    await expect(
      refresh(record, tokens.refresh_token, later(1_000)),
    ).rejects.toMatchObject({ error: "invalid_grant" });
  });

  it("does not accept an access token as refresh token or the reverse", async () => {
    const { record, tokens } = await connect();
    await expect(
      refresh(record, tokens.access_token, later(1_000)),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    await expect(
      resolveOAuthAccessToken(tokens.refresh_token, RESOURCE, later(1_000)),
    ).resolves.toEqual({ ok: false, code: "invalid_token" });
  });

  it("prunes rotated refresh tokens beyond the few kept for reuse detection", async () => {
    const { record, tokens } = await connect();
    let current = tokens.refresh_token;
    for (let i = 1; i <= 6; i += 1)
      current = (await refresh(record, current, later(i * 1_000)))
        .refresh_token;
    const used = db.tokens.rows.filter(
      (row) => row.kind === "refresh" && row.usedAt,
    );
    expect(used.length).toBeLessThanOrEqual(3);
  });

  it("serves refresh and revocation over HTTP", async () => {
    const { clientId, record } = await registerPublicClient();
    // handleToken uses the real clock: issue and exchange "now", never at the
    // fixed t0, or this test would break once the 90-day grant lapses.
    const now = new Date();
    const tokens = await exchange(
      record,
      await issueCode(record, "read", { now }),
      {
        now,
      },
    );
    const refreshed = await handleToken(
      formRequest({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: tokens.refresh_token,
      }),
    );
    expect(refreshed.status).toBe(200);
    const body = (await refreshed.json()) as { access_token: string };
    const revoked = await handleRevocation(
      formRequest({ client_id: clientId, token: body.access_token }),
    );
    expect(revoked.status).toBe(200);
    expect(db.grants.rows[0]?.revokedAt).toBeInstanceOf(Date);
    const { clientId: otherId } = await registerPublicClient();
    const ignored = await handleRevocation(
      formRequest({ client_id: otherId, token: "slr_x" }),
    );
    expect(ignored.status).toBe(200);
  });

  it("does not let another client revoke someone else's token", async () => {
    const { record, tokens } = await connect();
    const { record: other } = await registerPublicClient();
    const response = await handleRevocation(
      formRequest({ client_id: other.clientId, token: tokens.refresh_token }),
    );
    expect(response.status).toBe(200);
    expect(db.grants.rows[0]?.revokedAt).toBeNull();
    expect(record.id).not.toBe(other.id);
  });
});
