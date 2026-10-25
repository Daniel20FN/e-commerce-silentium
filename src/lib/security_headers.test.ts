/** @jest-environment node */
import { securityHeaders } from "./security_headers";

it("sets effective baseline protection without blocking required scripts, styles or same-origin previews", () => {
  const headers = Object.fromEntries(
    securityHeaders().map(({ key, value }) => [key, value]),
  );
  expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
  expect(headers["Content-Security-Policy"]).toBe(
    "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  );
  expect(headers["Content-Security-Policy"]).not.toMatch(
    /script-src|style-src|frame-src/,
  );
  expect(headers).not.toHaveProperty("Strict-Transport-Security");
  expect(headers).not.toHaveProperty("Cache-Control");
  expect(headers).not.toHaveProperty("X-Robots-Tag");
});
