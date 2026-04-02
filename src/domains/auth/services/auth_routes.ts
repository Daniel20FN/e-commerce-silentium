export const AUTH_ROUTE_PREFIXES = {
  login: "/login",
  register: "/register",
  confirm: "/auth/confirm",
  authCodeError: "/auth/auth-code-error",
} as const;

export const PROTECTED_ROUTE_PREFIXES = {
  admin: "/admin",
  account: "/account",
  checkout: "/checkout",
} as const;

export const PROTECTED_API_ROUTE_PREFIXES = {
  admin: "/api/admin",
  account: "/api/account",
  checkout: "/api/checkout",
} as const;

export const DEFAULT_AUTH_REDIRECT = "/";

const authRoutePrefixes = Object.values(AUTH_ROUTE_PREFIXES);
const protectedRoutePrefixes = Object.values(PROTECTED_ROUTE_PREFIXES);
const protectedApiRoutePrefixes = Object.values(PROTECTED_API_ROUTE_PREFIXES);

export function matchesPathPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedAppRoute(pathname: string): boolean {
  return matchesPathPrefix(pathname, protectedRoutePrefixes);
}

export function isProtectedApiRoute(pathname: string): boolean {
  return matchesPathPrefix(pathname, protectedApiRoutePrefixes);
}

export function isAuthEntryRoute(pathname: string): boolean {
  return matchesPathPrefix(pathname, [
    AUTH_ROUTE_PREFIXES.login,
    AUTH_ROUTE_PREFIXES.register,
  ]);
}

export function sanitizeReturnTo(rawValue?: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return null;
  }

  if (rawValue.startsWith("/api")) {
    return null;
  }

  if (matchesPathPrefix(rawValue, authRoutePrefixes)) {
    return null;
  }

  return rawValue;
}

export function buildLoginRedirect(returnTo?: string | null): string {
  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (!safeReturnTo) {
    return AUTH_ROUTE_PREFIXES.login;
  }

  return `${AUTH_ROUTE_PREFIXES.login}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function buildAuthenticatedRedirect(returnTo?: string | null): string {
  return sanitizeReturnTo(returnTo) ?? DEFAULT_AUTH_REDIRECT;
}
