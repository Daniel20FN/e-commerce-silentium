import {
  AUTH_ROUTE_PREFIXES,
  buildAuthenticatedRedirect,
  buildLoginRedirect,
  isProtectedAppRoute,
  sanitizeReturnTo,
} from "./auth_routes";

describe("auth route helpers", () => {
  it("accepts protected and public internal returnTo values", () => {
    expect(sanitizeReturnTo("/account/orders")).toBe("/account/orders");
    expect(sanitizeReturnTo("/productos")).toBe("/productos");
  });

  it("rejects auth, api and external returnTo values", () => {
    expect(sanitizeReturnTo("https://example.com")).toBeNull();
    expect(sanitizeReturnTo("/login")).toBeNull();
    expect(sanitizeReturnTo("/api/admin/users")).toBeNull();
  });

  it("builds redirect helpers safely", () => {
    expect(buildLoginRedirect("/checkout")).toBe("/login?returnTo=%2Fcheckout");
    expect(buildLoginRedirect("/login")).toBe(AUTH_ROUTE_PREFIXES.login);
    expect(buildAuthenticatedRedirect("/account")).toBe("/account");
    expect(buildAuthenticatedRedirect("//evil")).toBe("/");
  });

  it("detects configured protected routes", () => {
    expect(isProtectedAppRoute("/checkout/shipping")).toBe(true);
    expect(isProtectedAppRoute("/admin")).toBe(true);
    expect(isProtectedAppRoute("/productos")).toBe(false);
  });
});
