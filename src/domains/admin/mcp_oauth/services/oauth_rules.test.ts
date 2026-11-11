/** @jest-environment node */

import { isPublicIpAddress, ttlFromCacheControl } from "./oauth_cimd";
import {
  challengeForVerifier,
  clientMetadataDocumentSchema,
  dynamicRegistrationSchema,
  generateAccessToken,
  generateAuthorizationCode,
  generateRefreshToken,
  hashSecret,
  isAcceptableMetadataDocumentUrl,
  isAccessTokenShape,
  isRefreshTokenShape,
  parseRedirectUri,
  redirectUriMatches,
  resourceMatches,
  verifyPkce,
} from "./oauth_rules";

describe("secrets", () => {
  it("generates distinct 256-bit secrets with typed prefixes and SHA-256 hashes", () => {
    const access = generateAccessToken();
    const refresh = generateRefreshToken();
    expect(access).toMatch(/^sla_[A-Za-z0-9_-]{43}$/);
    expect(refresh).toMatch(/^slr_[A-Za-z0-9_-]{43}$/);
    expect(generateAuthorizationCode()).toMatch(/^slc_[A-Za-z0-9_-]{43}$/);
    expect(generateAccessToken()).not.toBe(access);
    expect(hashSecret(access)).toMatch(/^[0-9a-f]{64}$/);
    expect(isAccessTokenShape(refresh)).toBe(false);
    expect(isRefreshTokenShape(access)).toBe(false);
  });
});

describe("PKCE", () => {
  it("verifies S256 and rejects other verifiers or malformed ones", () => {
    const verifier = "abcdefghijklmnopqrstuvwxyz0123456789-._~ABCDE";
    const challenge = challengeForVerifier(verifier);
    expect(verifyPkce(verifier, challenge)).toBe(true);
    expect(verifyPkce(`${verifier}x`, challenge)).toBe(false);
    expect(verifyPkce("corto", challenge)).toBe(false);
    expect(verifyPkce(`${verifier}!`, challenge)).toBe(false);
    // RFC 7636 appendix B test vector.
    expect(
      challengeForVerifier("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("redirect URIs", () => {
  it.each([
    "https://example.com/cb",
    "http://localhost:8080/cb",
    "http://127.0.0.1/cb",
    "http://[::1]:9/cb",
  ])("accepts %s", (uri) => expect(parseRedirectUri(uri)).not.toBeNull());

  it.each([
    "http://example.com/cb",
    "http://localhost.evil.com/cb",
    "ftp://example.com/cb",
    "myapp://callback",
    "https://example.com/cb#x",
    "https://u:p@example.com/cb",
    "",
  ])("rejects %s", (uri) => expect(parseRedirectUri(uri)).toBeNull());

  it("matches exactly, except the port of loopback http URIs", () => {
    const a = ["https://a.com/cb"];
    expect(redirectUriMatches(a, "https://a.com/cb")).toBe(true);
    expect(redirectUriMatches(a, "https://a.com/cb/")).toBe(false);
    expect(redirectUriMatches(a, "https://a.com:444/cb")).toBe(false);
    expect(redirectUriMatches(a, "https://a.com/cb?x=1")).toBe(false);
    expect(redirectUriMatches(a, "http://a.com/cb")).toBe(false);
    const loop = ["http://127.0.0.1/cb"];
    expect(redirectUriMatches(loop, "http://127.0.0.1:5000/cb")).toBe(true);
    expect(redirectUriMatches(loop, "http://localhost:5000/cb")).toBe(false);
  });
});

describe("resource indicators", () => {
  const canonical = "https://www.silentium-hogar.com/api/mcp";
  it("accepts the canonical resource and the bare origin of the same server", () => {
    expect(resourceMatches(canonical, canonical)).toBe(true);
    expect(resourceMatches(`${canonical}/`, canonical)).toBe(true);
    expect(
      resourceMatches("https://WWW.silentium-hogar.com/api/mcp", canonical),
    ).toBe(true);
    expect(resourceMatches("https://www.silentium-hogar.com", canonical)).toBe(
      true,
    );
  });
  it("rejects other hosts, paths, queries and fragments", () => {
    for (const other of [
      "https://other.example/api/mcp",
      "http://www.silentium-hogar.com/api/mcp",
      "https://www.silentium-hogar.com/api/other",
      "https://www.silentium-hogar.com/api/mcp?x=1",
      "https://www.silentium-hogar.com/api/mcp#f",
      "not a url",
    ])
      expect(resourceMatches(other, canonical)).toBe(false);
  });
});

describe("Client ID Metadata Document URLs and SSRF guard", () => {
  it("accepts only plain https URLs with a path and a DNS host", () => {
    expect(
      isAcceptableMetadataDocumentUrl("https://app.example.com/client.json"),
    ).toBe(true);
    for (const bad of [
      "http://app.example.com/client.json",
      "https://app.example.com/",
      "https://app.example.com:8443/c.json",
      "https://192.168.0.1/c.json",
      "https://[::1]/c.json",
      "https://intranet/c.json",
    ])
      expect(isAcceptableMetadataDocumentUrl(bad)).toBe(false);
  });

  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "not-an-ip",
  ])("blocks %s", (address) => expect(isPublicIpAddress(address)).toBe(false));

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"])(
    "allows %s",
    (address) => expect(isPublicIpAddress(address)).toBe(true),
  );

  it("clamps the document cache lifetime", () => {
    expect(ttlFromCacheControl(undefined)).toBe(3600);
    expect(ttlFromCacheControl("max-age=5")).toBe(300);
    expect(ttlFromCacheControl("public, max-age=999999")).toBe(86400);
    expect(ttlFromCacheControl("max-age=1200")).toBe(1200);
  });
});

describe("client metadata leniency", () => {
  // Real ChatGPT Client ID Metadata Document (https://chatgpt.com/oauth/client.json).
  const chatGptDocument = {
    client_id: "https://chatgpt.com/oauth/client.json",
    client_uri: "https://chatgpt.com/",
    redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
    grant_types: [
      "authorization_code",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
    ],
    response_types: ["code"],
    client_name: "ChatGPT",
    logo_uri: "https://persistent.oaistatic.com/sonic/misc/openai-logo.png",
    token_endpoint_auth_signing_alg: "RS256",
    jwks_uri: "https://chatgpt.com/oauth/jwks.json",
  };

  it("accepts the ChatGPT document as a public client", () => {
    expect(
      clientMetadataDocumentSchema.safeParse(chatGptDocument).success,
    ).toBe(true);
  });

  it("rejects documents that cannot authenticate as a public client", () => {
    expect(
      clientMetadataDocumentSchema.safeParse({
        ...chatGptDocument,
        token_endpoint_auth_methods_supported: ["private_key_jwt"],
      }).success,
    ).toBe(false);
    expect(
      clientMetadataDocumentSchema.safeParse({
        ...chatGptDocument,
        token_endpoint_auth_method: "private_key_jwt",
        token_endpoint_auth_methods_supported: undefined,
      }).success,
    ).toBe(false);
  });

  it("ignores extra grant/response types but requires the ones used here", () => {
    const base = {
      redirect_uris: ["https://agent.example.com/callback"],
      client_name: "Agente",
    };
    expect(
      dynamicRegistrationSchema.safeParse({
        ...base,
        grant_types: [
          "authorization_code",
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        ],
      }).success,
    ).toBe(true);
    expect(
      dynamicRegistrationSchema.safeParse({
        ...base,
        grant_types: ["client_credentials"],
      }).success,
    ).toBe(false);
    expect(
      dynamicRegistrationSchema.safeParse({
        ...base,
        response_types: ["token"],
      }).success,
    ).toBe(false);
  });
});
