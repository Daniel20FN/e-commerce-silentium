/** @jest-environment node */
import {
  getStorefrontCategories,
  projectStorefrontProduct,
} from "@/domains/storefront/services/catalog_service";
import {
  previewRecord,
  publicationCategory,
} from "../__fixtures__/publication";
import {
  getProductPreview,
  getProductPublication,
} from "./publication_service";

const findUnique = jest.fn(),
  findFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: (args: object) => findUnique(args),
      findFirst: (args: object) => findFirst(args),
    },
  },
}));
jest.mock("@/domains/storefront/services/catalog_service", () => {
  const actual = jest.requireActual<
    typeof import("@/domains/storefront/services/catalog_service")
  >("@/domains/storefront/services/catalog_service");
  return { ...actual, getStorefrontCategories: jest.fn() };
});
const record = {
  ...previewRecord,
  status: "draft",
  updatedAt: new Date("2026-10-20T00:00:00.000Z"),
  deletedAt: null,
  archivedAt: null,
  _count: { costs: 1 },
  categories: [
    {
      categoryId: "cat",
      isPrimary: true,
      category: {
        id: "cat",
        name: "Dormitorio",
        isActive: true,
        deletedAt: null,
      },
    },
  ],
  variants: previewRecord.variants.map((v) => ({
    ...v,
    isActive: true,
    deletedAt: null,
  })),
};
beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue(record);
  findFirst.mockResolvedValue(null);
  jest.mocked(getStorefrontCategories).mockResolvedValue([publicationCategory]);
});

it("queries the same public predicate and reports a stockless active product visible but not purchasable", async () => {
  findUnique.mockResolvedValue({
    ...record,
    status: "active",
    variants: record.variants.map((v) => ({ ...v, stock: 0 })),
  });
  findFirst.mockResolvedValue({ id: "qa" });
  const report = await getProductPublication("qa");
  expect(report).toMatchObject({
    visible: true,
    purchasable: false,
    publicUrl: "/productos/qa",
    readyVariantCount: 0,
  });
  expect(findFirst).toHaveBeenCalledWith({
    where: {
      id: "qa",
      status: "active",
      deletedAt: null,
      archivedAt: null,
      categories: { some: { categoryId: { in: ["cat"] } } },
      variants: { some: { isActive: true, deletedAt: null } },
    },
    select: { id: true },
  });
});
it("reports inactive/retired variants separately and chooses the public fallback", async () => {
  findUnique.mockResolvedValue({
    ...record,
    variants: [
      { ...record.variants[0], id: "hidden", sku: "HIDDEN", isActive: false },
      { ...record.variants[0], id: "ok", sku: "ALTERNATIVE", isDefault: false },
    ],
  });
  const report = await getProductPublication("qa");
  expect(report).toMatchObject({
    visible: false,
    purchasable: false,
    selectedSku: "ALTERNATIVE",
    readyVariantCount: 1,
  });
  expect(report?.issues).toContainEqual({
    code: "default_unavailable",
    level: "warning",
    section: "variants",
  });
});
it("projects saved drafts through the same whitelist without private fields or paths", async () => {
  const withSecret = {
    ...previewRecord,
    costs: [{ amountCents: 999, name: "INTERNAL_COST_SECRET" }],
    status: "draft",
    deletedAt: null,
    images: previewRecord.images.map((i) => ({
      ...i,
      path: "INTERNAL_STORAGE_PATH",
      bucket: "INTERNAL_BUCKET",
    })),
    options: [
      {
        id: "option",
        name: "Tamaño",
        cost: "INTERNAL_OPTION_COST",
        values: [],
      },
    ],
  };
  findUnique.mockResolvedValue(withSecret);
  const preview = await getProductPreview("qa");
  expect(preview).toEqual(
    projectStorefrontProduct(withSecret, [publicationCategory]),
  );
  expect(JSON.stringify(preview)).not.toMatch(
    /INTERNAL|amountCents|deletedAt|bucket|path|costs/,
  );
  const query = findUnique.mock.calls[0][0];
  expect(query.select).not.toHaveProperty("costs");
  expect(query.select).not.toHaveProperty("_count");
  expect(query.select.variants.where).toEqual({
    isActive: true,
    deletedAt: null,
  });
});
it("supports an empty draft without making it a public product", async () => {
  findUnique.mockResolvedValue({ ...previewRecord, variants: [] });
  expect(await getProductPreview("qa")).toMatchObject({
    variants: [],
    initialVariantId: "",
    available: false,
  });
});
it("handles removed/missing records", async () => {
  findUnique.mockResolvedValue(null);
  expect(await getProductPreview("missing")).toBeNull();
  expect(await getProductPublication("missing")).toBeNull();
});
