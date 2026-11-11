/** @jest-environment node */

import {
  normalizeSourceNetwork,
  registrantHashFromHeaders,
} from "./oauth_registrant";

const SECRET = "test-secret";
const hashFor = (headers: Record<string, string>, secret = SECRET) =>
  registrantHashFromHeaders(new Headers(headers), secret);

describe("registrant source hashing", () => {
  it("is a stable keyed hash that never contains the IP", () => {
    const hash = hashFor({ "x-forwarded-for": "203.0.113.9" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashFor({ "x-forwarded-for": "203.0.113.9" }));
    expect(hash).not.toContain("203");
    expect(hash).not.toBe(hashFor({ "x-forwarded-for": "203.0.113.10" }));
    expect(hash).not.toBe(
      hashFor({ "x-forwarded-for": "203.0.113.9" }, "other-secret"),
    );
  });

  it("uses the first forwarded hop, preferring x-real-ip", () => {
    expect(hashFor({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })).toBe(
      hashFor({ "x-forwarded-for": "203.0.113.9" }),
    );
    expect(
      hashFor({
        "x-real-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.1",
      }),
    ).toBe(hashFor({ "x-forwarded-for": "203.0.113.9" }));
  });

  it("groups IPv6 addresses by /64 and unwraps IPv4-mapped ones", () => {
    const base = hashFor({ "x-forwarded-for": "2001:db8:1:2::1" });
    expect(hashFor({ "x-forwarded-for": "2001:db8:1:2:ffff::9" })).toBe(base);
    expect(hashFor({ "x-forwarded-for": "2001:db8:1:3::1" })).not.toBe(base);
    expect(hashFor({ "x-forwarded-for": "::ffff:203.0.113.9" })).toBe(
      hashFor({ "x-forwarded-for": "203.0.113.9" }),
    );
    expect(normalizeSourceNetwork("2001:DB8::1")).toBe(
      "2001:0db8:0000:0000::/64",
    );
  });

  it("returns null without a secret, address or with garbage", () => {
    expect(hashFor({ "x-forwarded-for": "203.0.113.9" }, "")).toBeNull();
    expect(registrantHashFromHeaders(new Headers(), SECRET)).toBeNull();
    expect(hashFor({ "x-forwarded-for": "not-an-ip" })).toBeNull();
    expect(normalizeSourceNetwork("nope")).toBeNull();
  });
});
