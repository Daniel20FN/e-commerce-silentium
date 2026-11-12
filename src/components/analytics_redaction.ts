import type { BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Private route prefixes whose query string or fragment can carry one-time
 * credentials (Supabase `code`/`token_hash`, OAuth `state`/`code_challenge`,
 * invitation links) or account details. Their page views are still counted,
 * but only by pathname.
 */
const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/account",
  "/auth",
  "/oauth",
  "/login",
  "/register",
] as const;

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Drops query string and fragment from private-route events before they are
 * sent to Vercel Web Analytics. Public catalog URLs keep their filters.
 */
export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  if (!isPrivatePath(url.pathname)) return event;
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}
