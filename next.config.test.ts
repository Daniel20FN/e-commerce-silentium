/** @jest-environment node */
jest.mock("next-pwa", () => () => (config: object) => config);
describe("catalog image optimization allowlist", () => {
  it("allows only the configured Supabase origin and public bucket path", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalBucket = process.env.SUPABASE_STORAGE_CATALOG_BUCKET;
    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://catalog-test.supabase.co";
      process.env.SUPABASE_STORAGE_CATALOG_BUCKET = "catalog-public-images";
      jest.isolateModules(() => {
        const config: typeof import("./next.config").default =
          jest.requireActual<typeof import("./next.config")>(
            "./next.config",
          ).default;
        expect(config.images?.remotePatterns).toContainEqual(
          new URL(
            "https://catalog-test.supabase.co/storage/v1/object/public/catalog-public-images/**",
          ),
        );
      });
    } finally {
      if (originalUrl === undefined)
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalBucket === undefined)
        delete process.env.SUPABASE_STORAGE_CATALOG_BUCKET;
      else process.env.SUPABASE_STORAGE_CATALOG_BUCKET = originalBucket;
    }
  });
});
