export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      key: "Content-Security-Policy",
      value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
    },
  ];
}
