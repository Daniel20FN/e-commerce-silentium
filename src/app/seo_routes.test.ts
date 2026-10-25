/** @jest-environment node */
import { buildPublicSitemap } from "@/domains/storefront/services/sitemap_service";
import { unstable_cache } from "next/cache";
import robots from "./robots";
import sitemap, { dynamic } from "./sitemap";

jest.mock("@/domains/storefront/services/sitemap_service", () => ({
  buildPublicSitemap: jest.fn(),
}));
jest.mock("next/cache", () => ({
  unstable_cache: jest.fn((read: () => Promise<object[]>) => read),
}));
afterEach(() => jest.restoreAllMocks());
it("caches only sitemap URL projection for 300 seconds, not the authenticated request", () => {
  expect(dynamic).toBe("force-dynamic");
  expect(unstable_cache).toHaveBeenCalledWith(
    buildPublicSitemap,
    ["public-sitemap-v1"],
    { revalidate: 300 },
  );
});
it("serves production sitemap and a robots policy that leaves noindex pages crawlable", async () => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    VERCEL_ENV: "production",
  });
  jest
    .mocked(buildPublicSitemap)
    .mockResolvedValue([{ url: "https://www.silentium-hogar.com/" }]);
  expect(await sitemap()).toHaveLength(1);
  expect(robots()).toEqual({
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: "https://www.silentium-hogar.com/sitemap.xml",
  });
});
it.each(["preview", "development", undefined])(
  "does not expose a sitemap or indexable robots policy for %s",
  async (environment) => {
    jest.replaceProperty(process, "env", {
      ...process.env,
      VERCEL_ENV: environment,
    });
    jest.mocked(buildPublicSitemap).mockClear();
    expect(await sitemap()).toEqual([]);
    expect(buildPublicSitemap).not.toHaveBeenCalled();
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  },
);
