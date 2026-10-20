import { getProductPreview } from "@/domains/admin/products/services/publication_service";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import Page, { dynamic, metadata, revalidate } from "./page";

jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireAdminUser: jest.fn(),
}));
jest.mock("@/domains/admin/products/services/publication_service", () => ({
  getProductPreview: jest.fn(),
}));
jest.mock("@/domains/admin/products/components/product_preview_frame", () => ({
  ProductPreviewFrame: () => null,
}));
const access = jest.mocked(requireAdminUser);
const preview = jest.mocked(getProductPreview);
beforeEach(() => jest.resetAllMocks());

it("authorizes before reading the draft", async () => {
  access.mockRejectedValue(new Error("forbidden"));
  await expect(
    Page({
      params: Promise.resolve({ productId: "qa" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("forbidden");
  expect(preview).not.toHaveBeenCalled();
});

it("keeps preview dynamic, noindex and the return link local", async () => {
  preview.mockResolvedValue(null);
  const page = await Page({
    params: Promise.resolve({ productId: "qa" }),
    searchParams: Promise.resolve({ returnTo: "https://evil.example" }),
  });
  expect(page.props.product).toBeNull();
  expect(page.props.backHref).toBe(
    "/admin/productos/qa?section=publication&returnTo=%2Fadmin%2Fproductos",
  );
  expect(dynamic).toBe("force-dynamic");
  expect(revalidate).toBe(0);
  expect(metadata.robots).toMatchObject({
    index: false,
    follow: false,
    noarchive: true,
  });
});
