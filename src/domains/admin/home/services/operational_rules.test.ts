import { safeProductsReturnUrl } from "@/domains/admin/products/services/product_workspace_links";
import {
  BUSINESS_TIME_ZONE,
  operationalDate,
  priorityHref,
  resolvePriorityGroup,
  safePriorityReturn,
} from "./operational_rules";
it("accepts only known priority queues and never external return targets", () => {
  expect(resolvePriorityGroup("low")).toBe("low");
  expect(resolvePriorityGroup("all")).toBeNull();
  expect(priorityHref("unpaid", "qa-id")).toBe(
    "/admin/pendientes?group=unpaid&cursor=qa-id",
  );
  for (const unsafe of [
    "//evil.example/admin",
    "https://evil.example/admin/pendientes?group=low",
    "/admin/usuarios",
    "/admin/pendientes?group=invalid",
    "javascript:alert(1)",
  ]) {
    expect(safePriorityReturn(unsafe, "/admin/pedidos")).toBe("/admin/pedidos");
    expect(safeProductsReturnUrl(unsafe)).toBe("/admin/productos");
  }
  const queue = "/admin/pendientes?group=low&cursor=old&extra=unsafe";
  expect(safeProductsReturnUrl(queue)).toBe("/admin/pendientes?group=low");
  expect(safePriorityReturn(queue, "/admin/pedidos")).toBe(
    "/admin/pendientes?group=low",
  );
});
it("uses the agreed Bogota business clock across UTC midnight, not the host timezone", () => {
  expect(BUSINESS_TIME_ZONE).toBe("America/Bogota");
  const formatted = operationalDate("2026-10-22T02:00:00.000Z");
  expect(formatted).toContain("21");
  expect(formatted).not.toContain("22 de");
});
