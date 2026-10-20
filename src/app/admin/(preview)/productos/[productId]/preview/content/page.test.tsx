import {
  previewRecord,
  publicationCategory,
} from "@/domains/admin/products/__fixtures__/publication";
import { getProductPreview } from "@/domains/admin/products/services/publication_service";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import { projectStorefrontProduct } from "@/domains/storefront/services/catalog_service";
import Page, { dynamic, metadata, revalidate } from "./page";
jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireAdminUser: jest.fn(),
}));
jest.mock("@/domains/admin/products/services/publication_service", () => ({
  getProductPreview: jest.fn(),
}));
jest.mock("@/domains/storefront/components/product_detail", () => ({
  ProductDetail: () => null,
}));
// Only the pure projector is needed; its query module is not evaluated here.
jest.mock("@/domains/storefront/services/catalog_service", () => ({
  projectStorefrontProduct: jest.fn(() => ({ id: "qa", name: "QA" })),
}));
const access = jest.mocked(requireAdminUser),
  preview = jest.mocked(getProductPreview);
beforeEach(() => jest.clearAllMocks());
it("checks admin access before reading any draft", async () => {
  access.mockRejectedValue(new Error("forbidden"));
  await expect(
    Page({ params: Promise.resolve({ productId: "qa" }) }),
  ).rejects.toThrow("forbidden");
  expect(preview).not.toHaveBeenCalled();
});
it("is dynamic, non-indexable, and marks the shared product renderer as preview", async () => {
  access.mockResolvedValue({
    id: "admin",
    authUserId: "admin",
    email: "qa@example.com",
    role: "super_admin",
    status: "active",
    emailVerified: true,
    profile: { firstName: "QA", lastName: null },
  });
  preview.mockResolvedValue(
    projectStorefrontProduct(previewRecord, [publicationCategory]),
  );
  const page = await Page({ params: Promise.resolve({ productId: "qa" }) });
  expect(page.props.children[1].props.preview).toBe(true);
  expect(dynamic).toBe("force-dynamic");
  expect(revalidate).toBe(0);
  expect(metadata.robots).toMatchObject({
    index: false,
    follow: false,
    noarchive: true,
  });
});
