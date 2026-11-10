import { lookup } from "node:dns";
import https from "node:https";
import { isIP } from "node:net";
import type { ClientMetadataDocument } from "./oauth_rules";
import {
  clientMetadataDocumentSchema,
  isAcceptableMetadataDocumentUrl,
} from "./oauth_rules";

export const CIMD_TIMEOUT_MS = 5_000;
export const CIMD_MAX_BYTES = 16_384;
export const CIMD_MIN_TTL_SECONDS = 300;
export const CIMD_MAX_TTL_SECONDS = 24 * 60 * 60;
export const CIMD_DEFAULT_TTL_SECONDS = 60 * 60;

export class CimdError extends Error {}

function parseIpv4(address: string): number[] | null {
  const parts = address.split(".").map(Number);
  return parts.length === 4 &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    ? parts
    : null;
}

/** True only for globally routable unicast addresses (SSRF guard). */
export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parts = parseIpv4(address);
    if (!parts) return false;
    const [a, b, c] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2))))
      return false;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
      return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped?.[1]) return isPublicIpAddress(mapped[1]);
    if (lower === "::" || lower === "::1") return false;
    if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || /^ff/.test(lower))
      return false;
    if (
      lower.startsWith("2001:db8") ||
      lower.startsWith("64:ff9b") ||
      lower.startsWith("::ffff:")
    )
      return false;
    return true;
  }
  return false;
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string,
  family: number,
) => void;

/** DNS lookup used by the connection itself, so the checked IP is the one dialed. */
function guardedLookup(
  hostname: string,
  _options: unknown,
  callback: LookupCallback,
): void {
  lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, "", 4);
    const first = addresses[0];
    if (!first || !addresses.every((entry) => isPublicIpAddress(entry.address)))
      return callback(new Error("cimd_blocked_address"), "", 4);
    return callback(null, first.address, first.family);
  });
}

export function ttlFromCacheControl(header: string | undefined): number {
  const match = /max-age=(\d+)/i.exec(header ?? "");
  const seconds = match?.[1] ? Number(match[1]) : CIMD_DEFAULT_TTL_SECONDS;
  return Math.min(
    Math.max(seconds, CIMD_MIN_TTL_SECONDS),
    CIMD_MAX_TTL_SECONDS,
  );
}

export interface FetchedClientDocument {
  document: ClientMetadataDocument;
  ttlSeconds: number;
}

export type ClientDocumentFetcher = (
  url: string,
) => Promise<FetchedClientDocument>;

/**
 * Fetches and validates a Client ID Metadata Document. Guards: https only, a
 * URL shape that rules out IP literals, ports and fragments, public IPs only
 * (checked on the dialed connection), no redirects, 5 s timeout, 16 KB cap, and
 * the document's client_id must equal the URL exactly.
 */
export const fetchClientMetadataDocument: ClientDocumentFetcher = (url) => {
  if (!isAcceptableMetadataDocumentUrl(url))
    return Promise.reject(new CimdError("cimd_invalid_url"));
  return new Promise<FetchedClientDocument>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        timeout: CIMD_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "silentium-oauth",
        },
        lookup: guardedLookup as never,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const type = String(response.headers["content-type"] ?? "");
        if (status !== 200 || !/^application\/(.+\+)?json/i.test(type)) {
          response.resume();
          return reject(new CimdError("cimd_bad_response"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > CIMD_MAX_BYTES) {
            request.destroy(new CimdError("cimd_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            const parsed = clientMetadataDocumentSchema.parse(
              JSON.parse(Buffer.concat(chunks).toString("utf8")),
            );
            if (parsed.client_id !== url)
              return reject(new CimdError("cimd_client_id_mismatch"));
            resolve({
              document: parsed,
              ttlSeconds: ttlFromCacheControl(
                String(response.headers["cache-control"] ?? ""),
              ),
            });
          } catch {
            reject(new CimdError("cimd_invalid_document"));
          }
        });
        response.on("error", () => reject(new CimdError("cimd_fetch_failed")));
      },
    );
    request.on("timeout", () => request.destroy(new CimdError("cimd_timeout")));
    request.on("error", () => reject(new CimdError("cimd_fetch_failed")));
    request.end();
  });
};
