/** @jest-environment node */
import { STOREFRONT_ORIGIN } from "./seo_rules";
import { buildPublicSitemap } from "./sitemap_service";

const mockCategories = jest.fn();
const mockProducts = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: (args: object) => mockCategories(args) },
    product: { findMany: (args: object) => mockProducts(args) },
  },
}));
const category = {
  id: "root",
  slug: "cama",
  parentId: null,
  isActive: true,
  deletedAt: null,
};
beforeEach(() => {
  jest.clearAllMocks();
  mockCategories.mockResolvedValue([category]);
  mockProducts.mockResolvedValue([{ slug: "linen" }]);
});
it("projects only public URLs, never stock, costs, personal data or invented modification dates", async () => {
  const sitemap = await buildPublicSitemap();
  expect(sitemap).toEqual(
    [
      "/",
      "/productos",
      "/categorias",
      "/legal/terminos",
      "/legal/privacidad",
      "/legal/cookies",
      "/legal/reembolsos",
      "/categorias/cama",
      "/productos/linen",
    ].map((path) => ({ url: `${STOREFRONT_ORIGIN}${path}` })),
  );
  expect(mockProducts).toHaveBeenCalledWith({
    where: {
      status: "active",
      deletedAt: null,
      archivedAt: null,
      categories: { some: { categoryId: { in: ["root"] } } },
      variants: { some: { isActive: true, deletedAt: null } },
    },
    select: { slug: true },
    orderBy: { id: "asc" },
    take: 49993,
  });
  expect(JSON.stringify(sitemap)).not.toMatch(
    /lastModified|lastmod|carrito|account|admin|ofertas|colecciones/,
  );
});
it("excludes inactive/deleted/orphaned/cyclic category branches just like the public catalog", async () => {
  mockCategories.mockResolvedValue([
    category,
    { ...category, id: "hidden", slug: "hidden", isActive: false },
    { ...category, id: "child", slug: "child", parentId: "hidden" },
    { ...category, id: "deleted", slug: "deleted", deletedAt: new Date() },
    { ...category, id: "orphan", slug: "orphan", parentId: "missing" },
    { ...category, id: "cycle", slug: "cycle", parentId: "cycle" },
  ]);
  expect(
    (await buildPublicSitemap()).filter((entry) =>
      entry.url.includes("/categorias/"),
    ),
  ).toEqual([{ url: `${STOREFRONT_ORIGIN}/categorias/cama` }]);
  expect(
    mockProducts.mock.calls[0][0].where.categories.some.categoryId.in,
  ).toEqual(["root"]);
});
it("regenerates current slug projections instead of keeping an in-memory catalog snapshot", async () => {
  expect((await buildPublicSitemap()).at(-1)?.url).toContain("/linen");
  mockProducts.mockResolvedValue([{ slug: "new-slug" }]);
  expect((await buildPublicSitemap()).at(-1)?.url).toContain("/new-slug");
  mockProducts.mockResolvedValue([]);
  expect(
    (await buildPublicSitemap()).some((entry) =>
      entry.url.includes("/productos/"),
    ),
  ).toBe(false);
});
it("does not turn database failures into successful empty sitemaps", async () => {
  mockProducts.mockRejectedValue(new Error("database_unavailable"));
  await expect(buildPublicSitemap()).rejects.toThrow("database_unavailable");
});
it("fails explicitly rather than silently truncating beyond the XML URL limit", async () => {
  mockProducts.mockResolvedValue(
    Array.from({ length: 49997 }, (_, i) => ({ slug: `p${i}` })),
  );
  await expect(buildPublicSitemap()).rejects.toThrow(
    "sitemap_requires_partitioning",
  );
});
