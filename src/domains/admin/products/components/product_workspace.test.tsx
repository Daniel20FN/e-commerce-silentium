import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { publicationReport } from "../__fixtures__/publication";
import type {
  AdminProductDetailDto,
  AdminProductVariantDto,
} from "../types/product_dto";
import { ProductWorkspace } from "./product_workspace";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn(), patch: jest.fn() },
}));
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: { post: jest.fn(), put: jest.fn() },
  }),
}));
jest.mock("@/domains/admin/media/components/catalog_media_dialog", () => ({
  CatalogMediaDialog: () => <div>media-editor</div>,
}));
jest.mock("@/domains/admin/costs/components/catalog_costs_dialog", () => ({
  CatalogCostsDialog: () => <div>cost-editor</div>,
}));

const product: AdminProductDetailDto = {
  id: "product-1",
  name: "Aurora QA",
  slug: "aurora-qa",
  status: "draft",
  inTrash: false,
  shortDescription: "Description",
  longDescription: null,
  brand: null,
  seoTitle: null,
  seoDescription: null,
  featured: false,
  primaryCategory: {
    id: "category-1",
    name: "Dormitorio",
    slug: "dormitorio",
    isPrimary: true,
  },
  categories: [
    {
      id: "category-1",
      name: "Dormitorio",
      slug: "dormitorio",
      isPrimary: true,
    },
  ],
  variantCount: 1,
  sellableVariantCount: 1,
  hasSellableVariants: true,
  warnings: [],
  archivedAt: null,
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-20T01:00:00.000Z",
  options: [],
  optionsLocked: false,
};
const variant: AdminProductVariantDto = {
  id: "variant-1",
  productId: product.id,
  sku: "QA-STORED",
  priceCents: 10000,
  compareAtPriceCents: null,
  stock: 2,
  active: true,
  isDefault: true,
  displayOrder: 0,
  weightGrams: null,
  widthMm: null,
  heightMm: null,
  lengthMm: null,
  optionValues: [],
  inTrash: false,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
};
const get = jest.mocked(apiService.get);
const patch = jest.mocked(apiService.patch);
const copy = dictionary.admin.products.workspace;

function arrange(nextProduct = product) {
  get.mockImplementation(async (endpoint) => {
    if (endpoint.endsWith("/publication"))
      return {
        report: {
          ...publicationReport,
          productId: nextProduct.id,
          status: nextProduct.status,
          updatedAt: nextProduct.updatedAt,
        },
      };
    if (endpoint.endsWith("/inventory"))
      return {
        readOnly: false,
        variants: [
          {
            id: variant.id,
            sku: variant.sku,
            stock: 2,
            revision: 0,
            minimum: null,
            inTrash: false,
            active: true,
          },
        ],
        movements: [],
        nextCursor: null,
      };
    if (endpoint.endsWith("/variants")) return { items: [variant] };
    if (endpoint.endsWith("/parent-options"))
      return { items: [{ id: "category-1", name: "Dormitorio" }] };
    return { product: nextProduct };
  });
}

describe("routed product workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(
      null,
      "",
      "/admin/productos/product-1?section=information",
    );
    arrange();
  });

  it("waits for all stored variants before mounting their editor", async () => {
    let resolveVariants: (value: {
      items: AdminProductVariantDto[];
    }) => void = () => {};
    const pending = new Promise<{ items: AdminProductVariantDto[] }>(
      (resolve) => {
        resolveVariants = resolve;
      },
    );
    get.mockImplementation(async (endpoint) =>
      endpoint.endsWith("/variants")
        ? pending
        : endpoint.endsWith("/parent-options")
          ? { items: [] }
          : { product },
    );
    render(
      <ProductWorkspace
        dictionary={dictionary}
        productId={product.id}
        initialSection="variants"
      />,
    );
    expect(
      screen.queryByText(dictionary.admin.products.variants.empty),
    ).not.toBeInTheDocument();
    await act(async () => {
      resolveVariants({ items: [variant] });
      await pending;
    });
    expect(await screen.findByText(variant.sku)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      product.name,
    );
  });

  it("protects dirty information across tab changes, staying and discarding", async () => {
    render(<ProductWorkspace dictionary={dictionary} productId={product.id} />);
    fireEvent.change(
      await screen.findByLabelText(dictionary.admin.products.form.name),
      { target: { value: "Pending title" } },
    );
    fireEvent.click(screen.getByRole("tab", { name: copy.media }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      copy.discardTitle,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.keep }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByLabelText(dictionary.admin.products.form.name),
    ).toHaveValue("Pending title");
    fireEvent.click(screen.getByRole("tab", { name: copy.media }));
    fireEvent.click(await screen.findByRole("button", { name: copy.discard }));
    expect(await screen.findByText("media-editor")).toBeInTheDocument();
    expect(window.location.search).toContain("section=media");
    fireEvent.click(screen.getByRole("tab", { name: copy.information }));
    expect(
      await screen.findByLabelText(dictionary.admin.products.form.name),
    ).toHaveValue(product.name);
  });

  it("sends the saved revision and preserves the form on a conflict", async () => {
    patch.mockRejectedValue(new Error("product_revision_conflict"));
    render(<ProductWorkspace dictionary={dictionary} productId={product.id} />);
    fireEvent.change(
      await screen.findByLabelText(dictionary.admin.products.form.name),
      { target: { value: "My pending title" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.products.form.save,
      }),
    );
    expect(
      await screen.findByText(
        dictionary.admin.products.feedback.product_revision_conflict,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(dictionary.admin.products.form.name),
    ).toHaveValue("My pending title");
    expect(patch).toHaveBeenCalledWith(
      `/admin/products/${product.id}`,
      expect.objectContaining({
        expectedUpdatedAt: product.updatedAt,
        name: "My pending title",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(copy.dirty),
    );
    fireEvent.click(screen.getByRole("button", { name: copy.reload }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      copy.discardBody,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.discard }));
    await screen.findByRole("heading", { level: 1 });
    expect(
      screen.queryByText(
        dictionary.admin.products.feedback.product_revision_conflict,
      ),
    ).not.toBeInTheDocument();
  });

  it("does not let a running save silently lose newer field input or navigate", async () => {
    let finish: (value: { product: AdminProductDetailDto }) => void = () => {};
    patch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<ProductWorkspace dictionary={dictionary} productId={product.id} />);
    const name = await screen.findByLabelText(
      dictionary.admin.products.form.name,
    );
    fireEvent.change(name, { target: { value: "Saved title" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.products.form.save,
      }),
    );
    await waitFor(() => expect(name).toBeDisabled());
    fireEvent.click(screen.getByRole("tab", { name: copy.media }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(copy.waitTitle);
    expect(
      screen.queryByRole("button", { name: copy.discard }),
    ).not.toBeInTheDocument();
    arrange({ ...product, name: "Saved title" });
    await act(async () => {
      finish({ product });
    });
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Saved title",
    );
  });

  it("protects back links and registers the native unload warning", async () => {
    render(
      <ProductWorkspace
        dictionary={dictionary}
        productId={product.id}
        returnTo="/admin/productos?search=QA&page=2"
      />,
    );
    fireEvent.change(
      await screen.findByLabelText(dictionary.admin.products.form.name),
      { target: { value: "Dirty" } },
    );
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute(
      "href",
      "/admin/productos?search=QA&page=2",
    );
    fireEvent.click(screen.getByRole("link", { name: copy.back }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      copy.discardTitle,
    );
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it("guards batch drafts before switching editors or duplicating the saved product", async () => {
    const operations = dictionary.admin.products.operations;
    render(
      <ProductWorkspace
        dictionary={dictionary}
        productId={product.id}
        initialSection="variants"
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: operations.batch }),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: `${operations.price} — ${variant.sku}`,
      }),
      { target: { value: "1234.56" } },
    );
    fireEvent.click(screen.getByRole("button", { name: operations.single }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      copy.discardTitle,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.keep }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("textbox", {
        name: `${operations.price} — ${variant.sku}`,
      }),
    ).toHaveValue("1234.56");
    fireEvent.click(screen.getByRole("button", { name: operations.duplicate }));
    fireEvent.click(await screen.findByRole("button", { name: copy.discard }));
    expect(
      await screen.findByRole("dialog", { name: operations.duplicateTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: operations.copyCosts }),
    ).not.toBeChecked();
  });

  it("treats archivedAt as read-only even if a legacy status is still draft", async () => {
    arrange({ ...product, archivedAt: "2026-10-20T00:00:00.000Z" });
    render(
      <ProductWorkspace
        dictionary={dictionary}
        productId={product.id}
        initialSection="variants"
      />,
    );
    await screen.findByText(copy.readOnly);
    expect(
      screen.queryByRole("button", {
        name: dictionary.admin.products.operations.duplicate,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: dictionary.admin.products.operations.batch,
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps archived products read-only and permits cost consultation", async () => {
    arrange({ ...product, status: "archived" });
    render(<ProductWorkspace dictionary={dictionary} productId={product.id} />);
    expect(await screen.findByText(copy.readOnly)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(dictionary.admin.products.form.name),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: dictionary.admin.products.form.save,
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: copy.costs }));
    expect(await screen.findByText("cost-editor")).toBeInTheDocument();
  });

  it("activates through the existing saved product PATCH and retains revision conflict input", async () => {
    patch.mockReset().mockRejectedValue(new Error("product_revision_conflict"));
    const publication = dictionary.admin.products.publication;
    render(
      <ProductWorkspace
        dictionary={dictionary}
        productId={product.id}
        initialSection="publication"
      />,
    );
    await screen.findByText(publication.hidden);
    fireEvent.click(screen.getByRole("button", { name: publication.publish }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: publication.confirm }),
    );
    await screen.findByText(
      dictionary.admin.products.feedback.product_revision_conflict,
    );
    expect(patch).toHaveBeenCalledWith(
      `/admin/products/${product.id}`,
      expect.objectContaining({
        expectedUpdatedAt: product.updatedAt,
        status: "active",
        name: product.name,
      }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      product.name,
    );
  });

  it.each([
    ["record_not_found", copy.notFound],
    ["forbidden", copy.accessError],
    ["network", copy.loadError],
  ])("distinguishes load failures: %s", async (code, message) => {
    get.mockRejectedValue(new Error(code));
    render(<ProductWorkspace dictionary={dictionary} productId={product.id} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(
      screen.getByRole("button", { name: copy.retry }),
    ).toBeInTheDocument();
  });
});

it("guards navigation away from pending inventory proposals", async () => {
  arrange();
  sessionStorage.clear();
  render(
    <ProductWorkspace
      dictionary={dictionary}
      productId={product.id}
      initialSection="inventory"
    />,
  );
  const inventory = dictionary.admin.inventory;
  fireEvent.click(await screen.findByRole("button", { name: inventory.add }));
  fireEvent.change(
    await screen.findByRole("textbox", {
      name: `${inventory.quantity} — ${variant.sku}`,
    }),
    { target: { value: "3" } },
  );
  fireEvent.click(screen.getByRole("tab", { name: copy.information }));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: copy.keep }));
  expect(
    await screen.findByRole("textbox", {
      name: `${inventory.quantity} — ${variant.sku}`,
    }),
  ).toHaveValue("3");
});
