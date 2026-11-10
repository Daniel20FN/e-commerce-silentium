/** @jest-environment node */

import { MCP_TOOLS, toolInputJsonSchema, toolsForActor } from "./mcp_registry";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const ALLOWED_TOOLS = [
  "analysis_get",
  "catalog_bulk_categories",
  "catalog_category_parent_options",
  "catalog_confirm_variant_generation",
  "catalog_create_category",
  "catalog_create_cost",
  "catalog_create_product",
  "catalog_create_variant",
  "catalog_delete_variant",
  "catalog_duplicate_product",
  "catalog_get_costs",
  "catalog_get_product",
  "catalog_list_categories",
  "catalog_list_products",
  "catalog_list_variants",
  "catalog_preview_variant_generation",
  "catalog_restore_category",
  "catalog_restore_cost",
  "catalog_restore_variant",
  "catalog_trash_category",
  "catalog_trash_cost",
  "catalog_update_category",
  "catalog_update_cost",
  "catalog_update_prices",
  "catalog_update_product",
  "catalog_update_variant",
  "inventory_add_stock",
  "inventory_adjust_stock",
  "inventory_get",
  "inventory_set_minimum",
  "media_cancel_upload",
  "media_complete_upload",
  "media_get_gallery",
  "media_prepare_upload",
  "media_restore_image",
  "media_save_gallery",
  "media_upload_image_base64",
  "orders_advance",
  "orders_cancel",
  "orders_create_draft",
  "orders_get",
  "orders_list",
  "orders_register_return",
  "orders_save_draft",
  "orders_search_variants",
  "publication_archive",
  "publication_get_preview",
  "publication_get_state",
  "publication_publish",
  "publication_restore",
  "publication_trash",
  "publication_unpublish",
];

const DENIED_PATTERN =
  /user|invit|role|legal|consent|account|password|session|auth|token/i;

const DESTRUCTIVE_TOOLS = [
  "catalog_bulk_categories",
  "catalog_delete_variant",
  "catalog_trash_category",
  "catalog_trash_cost",
  "inventory_adjust_stock",
  "media_save_gallery",
  "orders_advance",
  "orders_cancel",
  "orders_register_return",
  "publication_archive",
  "publication_trash",
  "publication_unpublish",
];

describe("MCP tool registry", () => {
  it("exposes exactly the allow-listed tools", () => {
    expect(MCP_TOOLS.map((tool) => tool.name).sort()).toEqual(ALLOWED_TOOLS);
  });

  it("has unique names and none for users, invitations, roles, legal or account", () => {
    const names = MCP_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => DENIED_PATTERN.test(name))).toEqual([]);
  });

  it("prefixes every tool with its group", () => {
    for (const tool of MCP_TOOLS)
      expect(tool.name.startsWith(`${tool.group}_`)).toBe(true);
  });

  it("marks reads as read-only and every write with an explicit destructive flag", () => {
    for (const tool of MCP_TOOLS) {
      if (tool.scope === "read") {
        expect(tool.annotations.readOnlyHint).toBe(true);
        expect(tool.annotations.destructiveHint).toBe(false);
      } else {
        expect(tool.annotations.readOnlyHint).toBe(false);
        expect(typeof tool.annotations.destructiveHint).toBe("boolean");
      }
      expect(tool.annotations.openWorldHint).toBe(false);
    }
  });

  it("flags destructive tools with destructiveHint", () => {
    const flagged = MCP_TOOLS.filter(
      (tool) => tool.annotations.destructiveHint,
    ).map((tool) => tool.name);
    expect(flagged.sort()).toEqual(DESTRUCTIVE_TOOLS);
  });

  it("publishes an object JSON schema for every tool", () => {
    for (const tool of MCP_TOOLS) {
      const schema = toolInputJsonSchema(tool);
      expect(schema.type).toBe("object");
    }
  });

  it("hides write tools from read-only tokens", () => {
    const readOnly = toolsForActor({ scopes: ["read"] });
    expect(readOnly.length).toBeGreaterThan(0);
    expect(readOnly.every((tool) => tool.scope === "read")).toBe(true);
    expect(toolsForActor({ scopes: ["read", "write"] })).toHaveLength(
      MCP_TOOLS.length,
    );
  });
});
