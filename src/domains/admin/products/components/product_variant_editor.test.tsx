import spanish from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AdminProductVariantDto } from "../types/product_dto";
import { ProductVariantEditor } from "./product_variant_editor";

const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockFeedback = jest.fn();
const mockContext = { cancellableApi: { post: mockPost, patch: mockPatch } };
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => mockContext,
}));
jest.mock("notistack", () => ({
  enqueueSnackbar: (...args: unknown[]) => mockFeedback(...args),
}));

const variant: AdminProductVariantDto = {
  id: "variant-1",
  productId: "product-1",
  sku: "QA-PHYSICAL",
  priceCents: 1000,
  compareAtPriceCents: 1500,
  stock: 2,
  active: true,
  isDefault: true,
  displayOrder: 3,
  weightGrams: 123,
  widthMm: 456,
  heightMm: 789,
  lengthMm: 900,
  optionValues: [],
  inTrash: false,
  createdAt: "2026-10-16T00:00:00Z",
  updatedAt: "2026-10-16T00:00:00Z",
};

describe("variant editor regression", () => {
  beforeEach(() => jest.resetAllMocks());

  it("preserves physical fields when only stock is edited", async () => {
    mockPatch.mockResolvedValue({ variant: { ...variant, stock: 5 } });
    render(
      <ProductVariantEditor
        dictionary={spanish}
        productId="product-1"
        productOptions={[]}
        initialVariants={[variant]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.edit,
      }),
    );
    expect(
      screen.getByLabelText(spanish.admin.products.variants.weightGrams),
    ).toHaveValue(123);
    expect(
      screen.getByLabelText(spanish.admin.products.variants.widthMm),
    ).toHaveValue(456);
    fireEvent.change(
      screen.getByLabelText(spanish.admin.products.variants.stock),
      { target: { value: "5" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.update,
      }),
    );
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "admin-products-variant-update-variant-1",
        "/admin/products/product-1/variants",
        expect.objectContaining({
          stock: 5,
          weightGrams: 123,
          widthMm: 456,
          heightMm: 789,
          lengthMm: 900,
        }),
      ),
    );
  });

  it("does not silently turn nonnumeric price input into zero", async () => {
    render(
      <ProductVariantEditor
        dictionary={spanish}
        productId="product-1"
        productOptions={[]}
        initialVariants={[variant]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.edit,
      }),
    );
    fireEvent.change(
      screen.getByLabelText(spanish.admin.products.variants.priceCents),
      { target: { value: "abc" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.update,
      }),
    );
    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockFeedback).toHaveBeenCalledWith(
      spanish.admin.products.feedback.invalid_variant_numbers,
      { variant: "error" },
    );
  });

  it("confirms trash and makes restoration available only in the trash view", async () => {
    mockPost.mockResolvedValue({ variant: { ...variant, inTrash: true } });
    const changed = jest.fn();
    render(
      <ProductVariantEditor
        dictionary={spanish}
        productId="product-1"
        productOptions={[]}
        initialVariants={[variant]}
        onVariantsChange={changed}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.trash,
      }),
    );
    expect(mockPost).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.confirm,
      }),
    );
    await waitFor(() =>
      expect(changed).toHaveBeenCalledWith([{ ...variant, inTrash: true }]),
    );
    expect(screen.queryByText(variant.sku)).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: spanish.admin.products.variants.onlyTrash,
      }),
    );
    expect(screen.getByText(variant.sku)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.edit,
      }),
    ).toBeDisabled();
    mockPost.mockResolvedValue({ variant });
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.restore,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: spanish.admin.products.variants.confirm,
      }),
    );
    await waitFor(() =>
      expect(mockPost).toHaveBeenLastCalledWith(
        "admin-variant-restore-variant-1",
        "/admin/products/product-1/variants/variant-1/restore",
        {},
      ),
    );
  });
});
