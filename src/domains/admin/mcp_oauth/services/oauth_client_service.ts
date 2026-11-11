import { prisma } from "@/lib/prisma";
import "server-only";
import type {
  OAuthClientAuthMethod,
  OAuthClientRecord,
} from "../types/oauth_types";
import type { ClientDocumentFetcher } from "./oauth_cimd";
import { fetchClientMetadataDocument } from "./oauth_cimd";
import { OAuthError } from "./oauth_http";
import type {
  ClientMetadataDocument,
  DynamicRegistrationInput,
} from "./oauth_rules";
import {
  OAUTH_MAX_METADATA_CLIENTS,
  OAUTH_MAX_UNUSED_DYNAMIC_CLIENTS,
  OAUTH_MAX_UNUSED_PER_SOURCE,
  OAUTH_SOURCE_WINDOW_MS,
  OAUTH_UNUSED_CLIENT_RETENTION_MS,
  fallbackClientName,
  generateClientId,
  generateClientSecret,
  hashSecret,
  hashesEqual,
  isAcceptableMetadataDocumentUrl,
  isMetadataDocumentClientId,
  resolveAuthMethod,
} from "./oauth_rules";

export const clientSelect = {
  id: true,
  clientId: true,
  source: true,
  name: true,
  clientUri: true,
  redirectUris: true,
  authMethod: true,
  secretHash: true,
  metadataExpiresAt: true,
} as const;

/** Best-effort removal of abandoned clients; bounded by indexes, never throws. */
export async function purgeAbandonedClients(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - OAUTH_UNUSED_CLIENT_RETENTION_MS);
  try {
    await prisma.mcpOAuthClient.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        grants: { none: {} },
        codes: { none: {} },
      },
    });
  } catch {
    console.error("mcp_oauth_client_purge_failed");
  }
}

/** Evicts the oldest never-authorized dynamic clients beyond `keep`. */
async function evictOldestUnusedClients(keep: number): Promise<void> {
  const unusedWhere = {
    source: "dynamic",
    grants: { none: {} },
    codes: { none: {} },
  } as const;
  const excess = await prisma.mcpOAuthClient.findMany({
    where: unusedWhere,
    orderBy: { createdAt: "desc" },
    skip: keep,
    select: { id: true },
  });
  if (excess.length > 0)
    await prisma.mcpOAuthClient.deleteMany({
      where: { ...unusedWhere, id: { in: excess.map((client) => client.id) } },
    });
}

export interface RegisteredClient {
  client: OAuthClientRecord;
  /** Plaintext secret, returned exactly once for confidential clients. */
  secret: string | null;
  issuedAt: Date;
}

/**
 * RFC 7591 registration. Open endpoint, so it is bounded without ever letting
 * anonymous callers block legitimate ones: clients nobody authorized are purged
 * after a couple of hours, each network may leave only a few unused
 * registrations per hour (429, keyed by a hashed source, see
 * oauth_registrant.ts) and the global ceiling of unused registrations evicts
 * the oldest ones instead of refusing new clients.
 */
export async function registerDynamicClient(
  input: DynamicRegistrationInput,
  now: Date = new Date(),
  registrantHash: string | null = null,
): Promise<RegisteredClient> {
  await purgeAbandonedClients(now);
  if (registrantHash) {
    const fromSource = await prisma.mcpOAuthClient.count({
      where: {
        source: "dynamic",
        registrantHash,
        grants: { none: {} },
        createdAt: { gt: new Date(now.getTime() - OAUTH_SOURCE_WINDOW_MS) },
      },
    });
    if (fromSource >= OAUTH_MAX_UNUSED_PER_SOURCE)
      throw new OAuthError(
        "temporarily_unavailable",
        "Too many registrations from this network; try again later",
        429,
      );
  }
  await evictOldestUnusedClients(OAUTH_MAX_UNUSED_DYNAMIC_CLIENTS - 1);
  const authMethod = resolveAuthMethod(input.token_endpoint_auth_method);
  const secret = authMethod === "none" ? null : generateClientSecret();
  const client = await prisma.mcpOAuthClient.create({
    data: {
      clientId: generateClientId(),
      source: "dynamic",
      name: input.client_name ?? fallbackClientName(input.redirect_uris),
      clientUri: input.client_uri ?? null,
      redirectUris: input.redirect_uris,
      authMethod,
      secretHash: secret ? hashSecret(secret) : null,
      registrantHash,
    },
    select: clientSelect,
  });
  return { client, secret, issuedAt: now };
}

export function dynamicRegistrationResponse(
  registered: RegisteredClient,
): Record<string, unknown> {
  const { client, secret, issuedAt } = registered;
  return {
    client_id: client.clientId,
    client_id_issued_at: Math.floor(issuedAt.getTime() / 1000),
    client_name: client.name,
    ...(client.clientUri ? { client_uri: client.clientUri } : {}),
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: client.authMethod,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: "read write",
    ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
  };
}

function metadataClientData(
  document: ClientMetadataDocument,
  ttlSeconds: number,
  now: Date,
) {
  return {
    name: document.client_name,
    clientUri: document.client_uri ?? null,
    redirectUris: document.redirect_uris,
    metadataExpiresAt: new Date(now.getTime() + ttlSeconds * 1000),
  };
}

export interface ResolveClientOptions {
  now?: Date;
  /** When false (consent submission) only stored clients are used. */
  allowFetch?: boolean;
  fetchDocument?: ClientDocumentFetcher;
}

/**
 * Finds the client for an authorization request. URL client_ids are resolved
 * through Client ID Metadata Documents: stored copies are reused until their
 * cache expiry, then refreshed. Returns null for unknown or invalid clients.
 */
export async function resolveClientForAuthorization(
  clientId: string,
  options: ResolveClientOptions = {},
): Promise<OAuthClientRecord | null> {
  const now = options.now ?? new Date();
  const stored = await prisma.mcpOAuthClient.findUnique({
    where: { clientId },
    select: clientSelect,
  });
  if (!isMetadataDocumentClientId(clientId)) return stored;
  if (!isAcceptableMetadataDocumentUrl(clientId)) return null;
  const fresh =
    stored?.metadataExpiresAt &&
    stored.metadataExpiresAt.getTime() > now.getTime();
  if (stored && (fresh || options.allowFetch === false)) return stored;
  if (options.allowFetch === false) return null;
  try {
    const fetched = await (
      options.fetchDocument ?? fetchClientMetadataDocument
    )(clientId);
    if (!stored) {
      const count = await prisma.mcpOAuthClient.count({
        where: { source: "metadata_document" },
      });
      if (count >= OAUTH_MAX_METADATA_CLIENTS) {
        await purgeAbandonedClients(now);
        const remaining = await prisma.mcpOAuthClient.count({
          where: { source: "metadata_document" },
        });
        if (remaining >= OAUTH_MAX_METADATA_CLIENTS) return null;
      }
    }
    const data = metadataClientData(fetched.document, fetched.ttlSeconds, now);
    return await prisma.mcpOAuthClient.upsert({
      where: { clientId },
      create: {
        clientId,
        source: "metadata_document",
        authMethod: "none",
        ...data,
      },
      update: data,
      select: clientSelect,
    });
  } catch {
    // A refresh failure keeps working with the last validated document.
    console.error("mcp_oauth_client_metadata_failed");
    return stored;
  }
}

function decodeBasic(header: string): { id: string; secret: string } | null {
  const match = /^Basic ([A-Za-z0-9+/=]+)$/.exec(header.trim());
  if (!match?.[1]) return null;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const index = decoded.indexOf(":");
  if (index < 0) return null;
  try {
    return {
      id: decodeURIComponent(decoded.slice(0, index).replace(/\+/g, " ")),
      secret: decodeURIComponent(decoded.slice(index + 1).replace(/\+/g, " ")),
    };
  } catch {
    return null;
  }
}

/** Authenticates the client of a token or revocation request (RFC 6749 2.3). */
export async function authenticateOAuthClient(
  headers: Headers,
  params: URLSearchParams,
): Promise<OAuthClientRecord> {
  const authorization = headers.get("authorization");
  const basic = authorization ? decodeBasic(authorization) : null;
  const bodyId = params.get("client_id");
  const bodySecret = params.get("client_secret");
  if (basic && bodySecret)
    throw new OAuthError(
      "invalid_request",
      "Use a single client authentication method",
    );
  const clientId = basic?.id ?? bodyId;
  const secret = basic?.secret ?? bodySecret ?? null;
  if (!clientId || clientId.length > 2048)
    throw new OAuthError(
      "invalid_client",
      "Unknown client",
      401,
      Boolean(basic),
    );
  if (basic && bodyId && bodyId !== basic.id)
    throw new OAuthError("invalid_request", "client_id mismatch");
  const client = await prisma.mcpOAuthClient.findUnique({
    where: { clientId },
    select: clientSelect,
  });
  if (!client)
    throw new OAuthError(
      "invalid_client",
      "Unknown client",
      401,
      Boolean(basic),
    );
  const method: OAuthClientAuthMethod = client.authMethod;
  if (method !== "none") {
    if (
      !secret ||
      !client.secretHash ||
      !hashesEqual(hashSecret(secret), client.secretHash)
    )
      throw new OAuthError(
        "invalid_client",
        "Client authentication failed",
        401,
        Boolean(basic),
      );
  }
  return client;
}
