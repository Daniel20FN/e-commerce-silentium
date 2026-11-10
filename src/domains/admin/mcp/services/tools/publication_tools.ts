import {
  adminProductLifecycleSchema,
  adminProductUpsertSchema,
} from "@/domains/admin/products/services/admin_product_schemas";
import {
  archiveAdminProduct,
  getAdminProductDetail,
  restoreAdminProduct,
  trashAdminProduct,
  updateAdminProduct,
} from "@/domains/admin/products/services/admin_product_service";
import { publicationPayload } from "@/domains/admin/products/services/publication_rules";
import {
  getProductPreview,
  getProductPublication,
} from "@/domains/admin/products/services/publication_service";
import { z } from "zod";
import { McpToolError } from "../mcp_errors";
import { defineReadTool, defineWriteTool } from "../mcp_tool_types";

const productId = adminProductLifecycleSchema.shape.productId;
const productInput = z.object({ productId });
const statusInput = z.object({
  productId,
  expectedUpdatedAt: adminProductUpsertSchema.shape.expectedUpdatedAt.unwrap(),
});

/**
 * Same transition the admin panel performs when publishing: the stored
 * product is re-sent with a new status and the caller's revision, so the
 * service's own conflict check protects against stale reads.
 */
async function changeProductStatus(
  id: string,
  expectedUpdatedAt: string,
  status: "active" | "inactive",
) {
  const current = await getAdminProductDetail(id);
  if (status === "inactive" && current.status !== "active")
    throw new McpToolError("invalid_state", "product_not_active");
  const product = await updateAdminProduct(id, {
    ...publicationPayload(current),
    status,
    expectedUpdatedAt,
  });
  const report = await getProductPublication(id);
  return { product, report };
}

export const publicationTools = [
  defineReadTool({
    name: "publication_get_state",
    group: "publication",
    title: "Get publication state",
    description:
      "Returns the publication report of a product: status, storefront visibility, purchasability and the list of blockers, warnings and recommendations.",
    inputSchema: productInput,
    handler: async (input) => {
      const report = await getProductPublication(input.productId);
      if (!report) throw new McpToolError("not_found", "record_not_found");
      return report;
    },
  }),
  defineReadTool({
    name: "publication_get_preview",
    group: "publication",
    title: "Get storefront preview data",
    description:
      "Returns the storefront projection of the product exactly as the private preview would render it.",
    inputSchema: productInput,
    handler: async (input) => {
      const preview = await getProductPreview(input.productId);
      if (!preview) throw new McpToolError("not_found", "record_not_found");
      return preview;
    },
  }),
  defineWriteTool({
    name: "publication_publish",
    group: "publication",
    title: "Publish product",
    description:
      "Sets the product status to active (visible in the storefront when it meets the public rules). expectedUpdatedAt is the product revision. Review publication_get_state afterwards: blockers keep it hidden.",
    destructive: false,
    idempotent: true,
    inputSchema: statusInput,
    handler: (input) =>
      changeProductStatus(input.productId, input.expectedUpdatedAt, "active"),
  }),
  defineWriteTool({
    name: "publication_unpublish",
    group: "publication",
    title: "Unpublish product",
    description:
      "Sets an active product to inactive, removing it from the storefront. expectedUpdatedAt is the product revision. Reversible with publication_publish.",
    destructive: true,
    idempotent: true,
    inputSchema: statusInput,
    handler: (input) =>
      changeProductStatus(input.productId, input.expectedUpdatedAt, "inactive"),
  }),
  defineWriteTool({
    name: "publication_archive",
    group: "publication",
    title: "Archive product",
    description:
      "Archives the product: it becomes read-only and leaves the storefront. Archived products cannot be re-activated.",
    destructive: true,
    idempotent: true,
    inputSchema: productInput,
    handler: (input) => archiveAdminProduct(input.productId),
  }),
  defineWriteTool({
    name: "publication_trash",
    group: "publication",
    title: "Trash product",
    description:
      "Moves the product to the trash and removes it from the storefront. Restorable with publication_restore.",
    destructive: true,
    idempotent: true,
    inputSchema: productInput,
    handler: (input) => trashAdminProduct(input.productId),
  }),
  defineWriteTool({
    name: "publication_restore",
    group: "publication",
    title: "Restore product",
    description: "Restores a trashed product.",
    destructive: false,
    idempotent: true,
    inputSchema: productInput,
    handler: (input) => restoreAdminProduct(input.productId),
  }),
];
