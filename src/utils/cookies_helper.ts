export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setClientCookie(
  name: string,
  value: string,
  options?: { path?: string; maxAge?: number },
) {
  if (typeof document === "undefined") return;

  let cookie = `${name}=${encodeURIComponent(value)}`;
  cookie += `; path=${options?.path ?? "/"}`;

  if (options?.maxAge) {
    cookie += `; max-age=${options.maxAge}`;
  }

  document.cookie = cookie;
}
