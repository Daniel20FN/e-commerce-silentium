/** @jest-environment node */
import {
  canonicalMetadata,
  listingMetadata,
  NO_INDEX,
  searchIndexingEnabled,
  seoPrivatePath,
  STOREFRONT_ORIGIN,
} from "./seo_rules";

beforeEach(() =>
  jest.replaceProperty(process, "env", {
    ...process.env,
    VERCEL_ENV: "production",
  }),
);
afterEach(() => jest.restoreAllMocks());

it.each(["preview", "development", undefined])(
  "does not index environment %s",
  (environment) => {
    process.env.VERCEL_ENV = environment;
    expect(searchIndexingEnabled()).toBe(false);
    expect(canonicalMetadata("/").robots).toEqual(NO_INDEX);
  },
);
it("uses the trusted origin and does not inherit a homepage canonical", () => {
  expect(canonicalMetadata("/productos/linen")).toEqual({
    alternates: { canonical: `${STOREFRONT_ORIGIN}/productos/linen` },
  });
});
it.each([
  {},
  { utm_source: "instagram" },
  { orden: "recommended" },
  { page: "1" },
])("canonicalizes neutral query %j to the clean listing", (query) => {
  const result = listingMetadata("/productos", query, 1);
  expect(result.alternates?.canonical).toBe(`${STOREFRONT_ORIGIN}/productos`);
  expect(result.robots).toBeUndefined();
});
it("keeps valid pagination self-canonical and uses the actual clamped page", () => {
  expect(
    listingMetadata("/productos", { page: "2", utm_source: "test" }, 2)
      .alternates?.canonical,
  ).toBe(`${STOREFRONT_ORIGIN}/productos?page=2`);
  expect(
    listingMetadata("/productos", { page: "999" }, 3).alternates?.canonical,
  ).toBe(`${STOREFRONT_ORIGIN}/productos?page=3`);
});
it.each([
  { q: "lino" },
  { categoria: "toallas" },
  { min: "10" },
  { max: "20" },
  { disponibles: "1" },
  { ofertas: "1" },
  { orden: "price_asc" },
])(
  "noindexes filter %j without pretending it duplicates the unfiltered page",
  (query) => {
    const result = listingMetadata("/productos", query, 1);
    expect(result.robots).toEqual({ index: false, follow: true });
    expect(result.alternates?.canonical).not.toBe(
      `${STOREFRONT_ORIGIN}/productos`,
    );
  },
);
it("does not include arbitrary query parameters or raw markup in canonical URLs", () => {
  const result = listingMetadata(
    "/categorias/cama",
    { q: '<script>"', returnTo: "https://evil.example", orden: "price_desc" },
    2,
  );
  expect(String(result.alternates?.canonical)).not.toContain("<");
  expect(String(result.alternates?.canonical)).not.toContain("evil.example");
  expect(String(result.alternates?.canonical)).toContain("page=2");
});
it.each([
  "/admin",
  "/admin/productos/1",
  "/account",
  "/carrito",
  "/login",
  "/register",
  "/auth/confirm",
  "/api/cart/resolve",
  "/checkout",
])("marks %s private for search", (path) =>
  expect(seoPrivatePath(path)).toBe(true),
);
it.each([
  "/",
  "/productos",
  "/categorias/cama",
  "/administrator",
  "/accounting",
])("does not match unrelated path %s", (path) =>
  expect(seoPrivatePath(path)).toBe(false),
);
