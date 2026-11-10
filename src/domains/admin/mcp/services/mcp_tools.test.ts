/** @jest-environment node */

import type { McpActor } from "./mcp_auth";
import { findMcpTool } from "./mcp_registry";
import { executeMcpTool } from "./mcp_tool_runner";

const mockServices: Record<string, jest.Mock> = {};
function service(name: string): jest.Mock {
  mockServices[name] ??= jest.fn();
  return mockServices[name];
}
function stubModule(...names: string[]): Record<string, unknown> {
  return Object.fromEntries(
    names.map((name) => [name, (...args: unknown[]) => service(name)(...args)]),
  );
}

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/domains/admin/products/services/admin_product_service", () =>
  stubModule(
    "listAdminProducts",
    "getAdminProductDetail",
    "createAdminProduct",
    "updateAdminProduct",
    "archiveAdminProduct",
    "trashAdminProduct",
    "restoreAdminProduct",
  ),
);
jest.mock("@/domains/admin/products/services/admin_variant_service", () =>
  stubModule(
    "listAdminProductVariants",
    "createAdminVariant",
    "updateAdminVariant",
    "softDeleteAdminVariant",
    "restoreAdminVariant",
  ),
);
jest.mock(
  "@/domains/admin/products/services/admin_variant_generation_service",
  () =>
    stubModule(
      "previewAdminVariantGeneration",
      "confirmAdminVariantGeneration",
    ),
);
jest.mock("@/domains/admin/products/services/duplicate_product_service", () =>
  stubModule("duplicateProduct"),
);
jest.mock("@/domains/admin/products/services/price_batch_service", () =>
  stubModule("updatePriceBatch"),
);
jest.mock("@/domains/admin/products/services/publication_service", () =>
  stubModule("getProductPublication", "getProductPreview"),
);
jest.mock("@/domains/admin/costs/services/cost_service", () =>
  stubModule(
    "getCatalogCosts",
    "createCatalogCost",
    "updateCatalogCost",
    "changeCatalogCostState",
  ),
);
jest.mock("@/domains/admin/categories/services/admin_category_mutations", () =>
  stubModule(
    "createAdminCategory",
    "updateAdminCategory",
    "trashAdminCategory",
    "restoreAdminCategory",
    "applyAdminCategoryBulkAction",
  ),
);
jest.mock("@/domains/admin/categories/services/admin_category_queries", () =>
  stubModule("listAdminCategories", "listAdminCategoryParentOptions"),
);
jest.mock("@/domains/admin/inventory/services/inventory_service", () =>
  stubModule("getInventory", "mutateInventory", "setInventoryMinimum"),
);
jest.mock("@/domains/admin/orders/services/order_service", () =>
  stubModule(
    "createOrder",
    "saveOrderDraft",
    "mutateOrder",
    "getOrder",
    "listOrders",
    "searchOrderVariants",
  ),
);
jest.mock("@/domains/admin/media/services/catalog_media_service", () =>
  stubModule(
    "getCatalogGallery",
    "uploadCatalogImage",
    "saveCatalogGallery",
    "restoreCatalogImage",
    "prepareCatalogImageUpload",
    "completeCatalogImageUpload",
    "cancelCatalogImageUpload",
  ),
);
jest.mock("@/domains/admin/analysis/services/analysis_service", () =>
  stubModule("getAnalysis"),
);

const actor: McpActor = {
  id: "user_1",
  label: "Ana Gómez",
  tokenId: "tok_1",
  scopes: ["read", "write"],
};
const readOnlyActor: McpActor = { ...actor, scopes: ["read"] };
const REVISION = "2026-11-10T12:00:00.000Z";
const OPERATION_ID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";

async function run(
  name: string,
  input: unknown,
  caller: McpActor = actor,
): Promise<{ isError: boolean; payload: Record<string, unknown> }> {
  const tool = findMcpTool(name);
  if (!tool) throw new Error(`unknown tool ${name}`);
  const result = await executeMcpTool(tool, input, caller);
  const block = result.content[0];
  const text = block && "text" in block ? block.text : "{}";
  return { isError: result.isError === true, payload: JSON.parse(text) };
}

const productInput = {
  name: "Mesa",
  slug: "mesa",
  categoryIds: ["cat_1"],
  primaryCategoryId: "cat_1",
};
const variantInput = {
  sku: "SKU-1",
  priceCents: 1000,
  stock: 5,
  optionValueIds: [],
};

describe("MCP tools delegate to the domain services", () => {
  beforeEach(() => {
    for (const fn of Object.values(mockServices)) fn.mockReset();
  });

  describe("catalog", () => {
    it("creates products as drafts whatever status is requested", async () => {
      service("createAdminProduct").mockResolvedValue({ id: "p1" });
      const { isError, payload } = await run("catalog_create_product", {
        product: { ...productInput, status: "active" },
      });
      expect(isError).toBe(false);
      expect(payload).toEqual({ data: { id: "p1" } });
      expect(service("createAdminProduct")).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "mesa", status: "draft" }),
      );
    });

    it("requires the revision to update a product and keeps its status", async () => {
      const missing = await run("catalog_update_product", {
        productId: "p1",
        product: productInput,
      });
      expect(missing.isError).toBe(true);
      expect(missing.payload).toMatchObject({
        error: { type: "validation_error", code: "invalid_input" },
      });
      expect(service("updateAdminProduct")).not.toHaveBeenCalled();

      service("getAdminProductDetail").mockResolvedValue({ status: "active" });
      service("updateAdminProduct").mockResolvedValue({ id: "p1" });
      const ok = await run("catalog_update_product", {
        productId: "p1",
        product: {
          ...productInput,
          status: "draft",
          expectedUpdatedAt: REVISION,
        },
      });
      expect(ok.isError).toBe(false);
      expect(service("updateAdminProduct")).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          status: "active",
          expectedUpdatedAt: REVISION,
        }),
      );
    });

    it("passes the audit actor when creating variants and generating them", async () => {
      service("createAdminVariant").mockResolvedValue({ id: "v1" });
      await run("catalog_create_variant", {
        productId: "p1",
        variant: variantInput,
      });
      expect(service("createAdminVariant")).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ sku: "SKU-1", priceCents: 1000 }),
        undefined,
        expect.objectContaining({ id: "user_1", label: "Ana Gómez" }),
      );

      service("confirmAdminVariantGeneration").mockResolvedValue({
        created: [],
        skippedDuplicateCombinationKeys: [],
      });
      await run("catalog_confirm_variant_generation", {
        productId: "p1",
        generation: { variants: [variantInput] },
      });
      expect(service("confirmAdminVariantGeneration")).toHaveBeenCalledWith(
        "p1",
        { variants: [expect.objectContaining({ sku: "SKU-1" })] },
        expect.objectContaining({ id: "user_1" }),
      );
    });

    it("requires the variant revision on update and soft-deletes with destructive intent", async () => {
      const missing = await run("catalog_update_variant", {
        productId: "p1",
        variantId: "v1",
        variant: variantInput,
      });
      expect(missing.isError).toBe(true);
      expect(service("updateAdminVariant")).not.toHaveBeenCalled();

      service("softDeleteAdminVariant").mockResolvedValue({ id: "v1" });
      await run("catalog_delete_variant", { productId: "p1", variantId: "v1" });
      expect(service("softDeleteAdminVariant")).toHaveBeenCalledWith(
        "p1",
        "v1",
      );
    });

    it("duplicates products with the actor and the idempotency key", async () => {
      service("duplicateProduct").mockResolvedValue({ product: { id: "p2" } });
      await run("catalog_duplicate_product", {
        productId: "p1",
        options: {
          operationId: OPERATION_ID,
          expectedUpdatedAt: REVISION,
          copyCosts: false,
        },
      });
      expect(service("duplicateProduct")).toHaveBeenCalledWith(
        "p1",
        {
          operationId: OPERATION_ID,
          expectedUpdatedAt: REVISION,
          copyCosts: false,
        },
        expect.objectContaining({ id: "user_1" }),
      );
    });

    it("rejects unknown fields on strict domain schemas", async () => {
      const { isError, payload } = await run("catalog_create_cost", {
        productId: "p1",
        cost: {
          variantId: null,
          name: "Tela",
          description: null,
          amountCents: 100,
          injected: true,
        },
      });
      expect(isError).toBe(true);
      expect(payload).toMatchObject({ error: { code: "invalid_input" } });
      expect(service("createCatalogCost")).not.toHaveBeenCalled();
    });

    it("trashes costs through the lifecycle service", async () => {
      service("changeCatalogCostState").mockResolvedValue({ costs: [] });
      await run("catalog_trash_cost", {
        productId: "p1",
        id: "c1",
        revision: REVISION,
      });
      expect(service("changeCatalogCostState")).toHaveBeenCalledWith("p1", {
        id: "c1",
        revision: REVISION,
        action: "trash",
      });
    });

    it("applies category bulk actions", async () => {
      service("applyAdminCategoryBulkAction").mockResolvedValue({
        successCount: 1,
        exceptions: [],
      });
      await run("catalog_bulk_categories", {
        bulk: { action: "trash", categoryIds: ["c1"] },
      });
      expect(service("applyAdminCategoryBulkAction")).toHaveBeenCalledWith({
        action: "trash",
        categoryIds: ["c1"],
      });
    });
  });

  describe("publication", () => {
    const detail = {
      updatedAt: "2026-11-09T00:00:00.000Z",
      name: "Mesa",
      slug: "mesa",
      shortDescription: null,
      longDescription: null,
      brand: null,
      seoTitle: null,
      seoDescription: null,
      featured: false,
      status: "draft",
      categories: [{ id: "cat_1" }],
      primaryCategory: { id: "cat_1" },
    };

    it("publishes with the revision supplied by the agent, not the fetched one", async () => {
      service("getAdminProductDetail").mockResolvedValue(detail);
      service("updateAdminProduct").mockResolvedValue({ id: "p1" });
      service("getProductPublication").mockResolvedValue({ issues: [] });
      const { isError, payload } = await run("publication_publish", {
        productId: "p1",
        expectedUpdatedAt: REVISION,
      });
      expect(isError).toBe(false);
      expect(payload).toEqual({
        data: { product: { id: "p1" }, report: { issues: [] } },
      });
      expect(service("updateAdminProduct")).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          status: "active",
          expectedUpdatedAt: REVISION,
        }),
      );
    });

    it("surfaces a stale revision as a conflict tool error", async () => {
      service("getAdminProductDetail").mockResolvedValue(detail);
      service("updateAdminProduct").mockRejectedValue({
        type: "conflict",
        message: "product_revision_conflict",
      });
      const { isError, payload } = await run("publication_publish", {
        productId: "p1",
        expectedUpdatedAt: REVISION,
      });
      expect(isError).toBe(true);
      expect(payload).toMatchObject({
        error: { type: "conflict", code: "product_revision_conflict" },
      });
    });

    it("only unpublishes active products", async () => {
      service("getAdminProductDetail").mockResolvedValue(detail);
      const { isError, payload } = await run("publication_unpublish", {
        productId: "p1",
        expectedUpdatedAt: REVISION,
      });
      expect(isError).toBe(true);
      expect(payload).toMatchObject({
        error: { type: "invalid_state", code: "product_not_active" },
      });
      expect(service("updateAdminProduct")).not.toHaveBeenCalled();
    });

    it("archives, trashes and restores through the product service", async () => {
      service("archiveAdminProduct").mockResolvedValue({ id: "p1" });
      service("trashAdminProduct").mockResolvedValue({ id: "p1" });
      service("restoreAdminProduct").mockResolvedValue({ id: "p1" });
      await run("publication_archive", { productId: "p1" });
      await run("publication_trash", { productId: "p1" });
      await run("publication_restore", { productId: "p1" });
      expect(service("archiveAdminProduct")).toHaveBeenCalledWith("p1");
      expect(service("trashAdminProduct")).toHaveBeenCalledWith("p1");
      expect(service("restoreAdminProduct")).toHaveBeenCalledWith("p1");
    });

    it("reports a missing publication report as not found", async () => {
      service("getProductPublication").mockResolvedValue(null);
      const { payload } = await run("publication_get_state", {
        productId: "p1",
      });
      expect(payload).toMatchObject({ error: { type: "not_found" } });
    });
  });

  describe("inventory", () => {
    const mutation = (kind: string) => ({
      operationId: OPERATION_ID,
      kind,
      rows: [
        {
          variantId: "v1",
          expectedRevision: 0,
          quantity: 3,
          reason: "Compra a proveedor",
        },
      ],
    });

    it("adds stock through the inventory service with the actor", async () => {
      service("mutateInventory").mockResolvedValue({
        operationId: OPERATION_ID,
      });
      const { isError } = await run("inventory_add_stock", {
        productId: "p1",
        mutation: mutation("entry"),
      });
      expect(isError).toBe(false);
      expect(service("mutateInventory")).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ operationId: OPERATION_ID, kind: "entry" }),
        expect.objectContaining({ id: "user_1", label: "Ana Gómez" }),
      );
    });

    it("keeps entries and decreases on separate tools", async () => {
      const entryOnExit = await run("inventory_adjust_stock", {
        productId: "p1",
        mutation: mutation("entry"),
      });
      const exitOnAdd = await run("inventory_add_stock", {
        productId: "p1",
        mutation: mutation("exit"),
      });
      expect(entryOnExit.isError).toBe(true);
      expect(exitOnAdd.isError).toBe(true);
      expect(service("mutateInventory")).not.toHaveBeenCalled();
    });

    it("surfaces stock revision conflicts", async () => {
      service("mutateInventory").mockRejectedValue({
        type: "conflict",
        message: "inventory_conflict",
      });
      const { payload } = await run("inventory_adjust_stock", {
        productId: "p1",
        mutation: mutation("exit"),
      });
      expect(payload).toMatchObject({
        error: { type: "conflict", code: "inventory_conflict" },
      });
    });

    it("sets minimums with the actor", async () => {
      service("setInventoryMinimum").mockResolvedValue({
        operationId: OPERATION_ID,
      });
      await run("inventory_set_minimum", {
        productId: "p1",
        minimum: {
          operationId: OPERATION_ID,
          variantId: "v1",
          expectedRevision: 1,
          minimum: 2,
        },
      });
      expect(service("setInventoryMinimum")).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ minimum: 2 }),
        expect.objectContaining({ id: "user_1" }),
      );
    });
  });

  describe("orders", () => {
    it("creates drafts with the actor", async () => {
      service("createOrder").mockResolvedValue({ id: "o1" });
      await run("orders_create_draft", {
        order: {
          operationId: OPERATION_ID,
          customerName: "Cliente Prueba",
          customerPhone: "+57 300 123 4567",
          delivery: "pickup",
          shippingCents: 0,
          lines: [
            {
              variantId: "v1",
              quantity: 1,
              unitPriceCents: 1000,
              catalogPriceCents: 1000,
            },
          ],
        },
      });
      expect(service("createOrder")).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: "Cliente Prueba" }),
        expect.objectContaining({ id: "user_1" }),
      );
    });

    it("cancels orders with the revision, reason and actor", async () => {
      service("mutateOrder").mockResolvedValue({ id: "o1" });
      await run("orders_cancel", {
        orderId: "o1",
        operationId: OPERATION_ID,
        expectedRevision: 2,
        reason: "Cliente desiste",
      });
      expect(service("mutateOrder")).toHaveBeenCalledWith(
        "o1",
        {
          kind: "cancel",
          operationId: OPERATION_ID,
          expectedRevision: 2,
          reason: "Cliente desiste",
        },
        expect.objectContaining({ id: "user_1" }),
      );
    });

    it("rejects cancelling through the advance tool", async () => {
      const { isError } = await run("orders_advance", {
        orderId: "o1",
        mutation: {
          kind: "cancel",
          operationId: OPERATION_ID,
          expectedRevision: 1,
          reason: "Por error",
        },
      });
      expect(isError).toBe(true);
      expect(service("mutateOrder")).not.toHaveBeenCalled();
    });

    it("rejects returns where resellable exceeds received", async () => {
      const { isError } = await run("orders_register_return", {
        orderId: "o1",
        operationId: OPERATION_ID,
        expectedRevision: 3,
        reason: "Devolución",
        rows: [{ lineId: "l1", received: 1, resellable: 2 }],
      });
      expect(isError).toBe(true);
      expect(service("mutateOrder")).not.toHaveBeenCalled();
    });
  });

  describe("media and analysis", () => {
    it("prepares signed uploads and returns the ticket", async () => {
      service("prepareCatalogImageUpload").mockResolvedValue({
        imageId: "img_1",
        signedUrl: "https://storage.example/sign",
      });
      const { payload } = await run("media_prepare_upload", {
        productId: "p1",
        upload: {
          variantId: null,
          revision: "a".repeat(64),
          fileName: "foto.png",
          contentType: "image/png",
          size: 1024,
        },
      });
      expect(payload).toEqual({
        data: { imageId: "img_1", signedUrl: "https://storage.example/sign" },
      });
      expect(service("prepareCatalogImageUpload")).toHaveBeenCalledWith(
        expect.objectContaining({ productId: "p1", fileName: "foto.png" }),
      );
    });

    it("completes uploads through the existing service", async () => {
      service("completeCatalogImageUpload").mockResolvedValue({ images: [] });
      await run("media_complete_upload", {
        productId: "p1",
        upload: { variantId: null, imageId: "img_1" },
      });
      expect(service("completeCatalogImageUpload")).toHaveBeenCalledWith(
        { productId: "p1", variantId: null },
        "img_1",
      );
    });

    it("builds the analysis window and returns the requested sections", async () => {
      service("getAnalysis").mockResolvedValue({
        ok: true,
        data: { points: [], total: 0, cents: 0 },
      });
      const { payload } = await run("analysis_get", {
        days: 7,
        kinds: ["activity", "top"],
      });
      expect(service("getAnalysis")).toHaveBeenCalledTimes(2);
      expect(payload).toMatchObject({
        data: { window: { days: 7 }, sections: { activity: {}, top: {} } },
      });
    });

    it("maps an unavailable analysis to a generic tool error", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      service("getAnalysis").mockResolvedValue({ ok: false });
      const { isError, payload } = await run("analysis_get", {});
      expect(isError).toBe(true);
      expect(payload).toMatchObject({ error: { type: "internal_error" } });
    });
  });

  describe("scopes and errors", () => {
    it("denies write tools to read-only tokens without calling any service", async () => {
      for (const [name, input] of [
        ["catalog_create_product", { product: productInput }],
        ["inventory_add_stock", { productId: "p1", mutation: {} }],
        ["publication_trash", { productId: "p1" }],
        ["orders_cancel", { orderId: "o1" }],
        ["media_save_gallery", { productId: "p1", gallery: {} }],
      ] as const) {
        const { isError, payload } = await run(name, input, readOnlyActor);
        expect(isError).toBe(true);
        expect(payload).toMatchObject({
          error: { type: "forbidden", code: "insufficient_scope" },
        });
      }
      for (const fn of Object.values(mockServices))
        expect(fn).not.toHaveBeenCalled();
    });

    it("lets read-only tokens run read tools", async () => {
      service("getAdminProductDetail").mockResolvedValue({ id: "p1" });
      const { isError } = await run(
        "catalog_get_product",
        { productId: "p1" },
        readOnlyActor,
      );
      expect(isError).toBe(false);
    });

    it("maps domain errors of every shape to safe messages", async () => {
      const cases: [unknown, string, string][] = [
        [
          { type: "not_found", message: "record_not_found" },
          "not_found",
          "record_not_found",
        ],
        [
          { type: "validation_error", message: "product_slug_taken" },
          "validation_error",
          "product_slug_taken",
        ],
        [
          { type: "invalid_state", message: "product_read_only" },
          "invalid_state",
          "product_read_only",
        ],
        [
          Object.assign(new Error("media_conflict"), { type: "conflict" }),
          "conflict",
          "media_conflict",
        ],
        [
          new Error("variant_generation_limit"),
          "validation_error",
          "variant_generation_limit",
        ],
      ];
      for (const [thrown, type, code] of cases) {
        service("getAdminProductDetail").mockRejectedValueOnce(thrown);
        const { isError, payload } = await run("catalog_get_product", {
          productId: "p1",
        });
        expect(isError).toBe(true);
        expect(payload).toMatchObject({ error: { type, code } });
      }
    });

    it("hides unexpected errors behind a generic message", async () => {
      const secret = "postgres://user:hunter2@db.example/prod";
      const error = new Error(`connect ECONNREFUSED ${secret}`);
      service("getAdminProductDetail").mockRejectedValue(error);
      const logged = jest.spyOn(console, "error").mockImplementation(() => {});
      const { isError, payload } = await run("catalog_get_product", {
        productId: "p1",
      });
      expect(isError).toBe(true);
      expect(payload).toEqual({
        error: {
          type: "internal_error",
          code: "internal_error",
          hint: expect.not.stringContaining("ECONNREFUSED"),
        },
      });
      const text = JSON.stringify(payload);
      expect(text).not.toContain("hunter2");
      expect(text).not.toContain(error.stack ?? "no-stack");
      expect(JSON.stringify(logged.mock.calls)).not.toContain("hunter2");
      logged.mockRestore();
    });

    it("never echoes input values in validation errors", async () => {
      const { payload } = await run("orders_create_draft", {
        order: { customerName: "Cliente Secreto 3001234567", lines: "nope" },
      });
      expect(JSON.stringify(payload)).not.toContain("Secreto");
      expect(JSON.stringify(payload)).not.toContain("3001234567");
    });
  });
});
