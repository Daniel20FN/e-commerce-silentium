import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const REGISTRANT_CONTEXT = "silentium:mcp-oauth:registrant:v1";

/** First hop of the forwarding headers the platform overwrites (Vercel). */
function sourceAddress(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = real || forwarded;
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

/** Expands an IPv6 address to its eight 16-bit groups, or null if malformed. */
function ipv6Groups(address: string): string[] | null {
  const [head = "", tail, extra] = address.toLowerCase().split("::");
  if (extra !== undefined) return null;
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const missing = 8 - left.length - right.length;
  if (tail === undefined ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array<string>(missing).fill("0"), ...right];
  return groups.every((group) => /^[0-9a-f]{1,4}$/.test(group)) ? groups : null;
}

/**
 * Network identity used for per-source limits: the IPv4 address, or the /64 of
 * an IPv6 address (a single subscriber usually owns a whole /64, so per-address
 * limits would be trivial to evade).
 */
export function normalizeSourceNetwork(address: string): string | null {
  const family = isIP(address);
  if (family === 4) return address;
  if (family !== 6) return null;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped?.[1]) return mapped[1];
  const groups = ipv6Groups(address);
  return groups
    ? `${groups
        .slice(0, 4)
        .map((group) => group.padStart(4, "0"))
        .join(":")}::/64`
    : null;
}

/**
 * Keyed, non-reversible identifier of the registering network. The key is
 * derived (domain-separated HMAC) from a server-only secret already required by
 * the app, so no raw IP is stored and the value is useless outside this
 * deployment. Returns null when no address or secret is available, in which
 * case only the global limits apply.
 */
export function registrantHashFromHeaders(
  headers: Headers,
  secret: string | undefined = process.env.SUPABASE_SECRET_KEY,
): string | null {
  if (!secret) return null;
  const address = sourceAddress(headers);
  const network = address ? normalizeSourceNetwork(address) : null;
  if (!network) return null;
  const key = createHmac("sha256", secret).update(REGISTRANT_CONTEXT).digest();
  return createHmac("sha256", key).update(network).digest("hex");
}
