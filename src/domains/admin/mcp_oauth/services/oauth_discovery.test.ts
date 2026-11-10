/** @jest-environment node */

import {
  GET as getAs,
  OPTIONS as optionsAs,
} from "@/app/.well-known/oauth-authorization-server/route";
import { GET as getPrmPath } from "@/app/.well-known/oauth-protected-resource/api/mcp/route";
import { GET as getPrm } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as getOidc } from "@/app/.well-known/openid-configuration/route";
import { STOREFRONT_ORIGIN } from "@/domains/storefront/services/seo_rules";
import { oauthContext, trustedOAuthOrigin } from "./oauth_origin";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const local = "http://localhost:3124";

describe("trusted origin", () => {
  it("honours loopback request origins in development only", () => {
    expect(trustedOAuthOrigin(`${local}/x`, {})).toEqual({
      origin: local,
      localDevelopment: true,
    });
    expect(trustedOAuthOrigin("http://127.0.0.1:3000/x", {})).toMatchObject({
      origin: "http://127.0.0.1:3000",
    });
  });

  it("never trusts the Host header in production", () => {
    const env = { VERCEL_ENV: "production" };
    expect(trustedOAuthOrigin(`${local}/x`, env).origin).toBe(
      STOREFRONT_ORIGIN,
    );
    expect(trustedOAuthOrigin("https://evil.example/x", env).origin).toBe(
      STOREFRONT_ORIGIN,
    );
    expect(
      trustedOAuthOrigin("https://evil.example/x", {
        ...env,
        APP_PUBLIC_URL: "https://www.silentium-hogar.com",
      }).origin,
    ).toBe("https://www.silentium-hogar.com");
  });

  it("ignores untrusted Host headers outside production too", () => {
    expect(trustedOAuthOrigin("https://evil.example/x", {}).origin).toBe(
      STOREFRONT_ORIGIN,
    );
  });

  it("uses a valid https APP_PUBLIC_URL, rejecting insecure or path-bearing values", () => {
    const at = (value: string) =>
      trustedOAuthOrigin("https://evil.example/", { APP_PUBLIC_URL: value })
        .origin;
    expect(at("https://tienda.example")).toBe("https://tienda.example");
    expect(at("http://tienda.example")).toBe(STOREFRONT_ORIGIN);
    expect(at("https://tienda.example/path")).toBe(STOREFRONT_ORIGIN);
    expect(at("https://localhost")).toBe(STOREFRONT_ORIGIN);
  });

  it("derives every endpoint from the same origin with no trailing slash", () => {
    const context = oauthContext(`${local}/api/mcp`, {});
    expect(context).toMatchObject({
      issuer: local,
      resource: `${local}/api/mcp`,
      protectedResourceMetadataPathUrl: `${local}/.well-known/oauth-protected-resource/api/mcp`,
      authorizationEndpoint: `${local}/oauth/authorize`,
      tokenEndpoint: `${local}/api/oauth/token`,
      registrationEndpoint: `${local}/api/oauth/register`,
    });
  });
});

describe("discovery documents (D1)", () => {
  const request = (path: string) => new Request(`${local}${path}`);

  it("serves protected resource metadata at the root and path-suffixed URLs", async () => {
    for (const handler of [getPrm, getPrmPath]) {
      const response = handler(
        request("/.well-known/oauth-protected-resource"),
      );
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(await response.json()).toEqual({
        resource: `${local}/api/mcp`,
        authorization_servers: [local],
        scopes_supported: ["read", "write"],
        bearer_methods_supported: ["header"],
        resource_name: expect.any(String),
      });
    }
  });

  it("serves authorization server metadata, with an OpenID-style alias", async () => {
    const metadata = await getAs(
      request("/.well-known/oauth-authorization-server"),
    ).json();
    expect(metadata).toMatchObject({
      issuer: local,
      authorization_endpoint: `${local}/oauth/authorize`,
      token_endpoint: `${local}/api/oauth/token`,
      registration_endpoint: `${local}/api/oauth/register`,
      revocation_endpoint: `${local}/api/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["read", "write"],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    });
    expect(metadata.token_endpoint_auth_methods_supported).toContain("none");
    expect(metadata.grant_types_supported).not.toContain("implicit");
    expect(metadata.grant_types_supported).not.toContain("password");
    expect(
      await getOidc(request("/.well-known/openid-configuration")).json(),
    ).toEqual(metadata);
  });

  it("never caches metadata derived from a local request", () => {
    expect(getAs(request("/x")).headers.get("cache-control")).toBe("no-store");
  });

  it("answers CORS preflights without a body", () => {
    const response = optionsAs();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "GET",
    );
  });
});
