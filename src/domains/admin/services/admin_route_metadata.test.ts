import dictionary from "@/dictionary/es.json";
import {
  ADMIN_ROUTE_SECTION,
  getAdminNavigationSections,
  resolveAdminRouteMetadata,
} from "./admin_route_metadata";
it("resolves order list, new and detail under the same operational navigation", () => {
  for (const path of [
    "/admin/pedidos",
    "/admin/pedidos/nuevo",
    "/admin/pedidos/order-a",
  ]) {
    expect(resolveAdminRouteMetadata(path, dictionary)).toMatchObject({
      section: ADMIN_ROUTE_SECTION.orders,
      title: dictionary.admin.orders.title,
      navigationHref: "/admin/pedidos",
    });
  }
  expect(getAdminNavigationSections(dictionary)).toContainEqual({
    href: "/admin/pedidos",
    label: dictionary.admin.navigation.orders,
    section: ADMIN_ROUTE_SECTION.orders,
  });
  expect(
    resolveAdminRouteMetadata("/admin/pedidos-extra", dictionary).section,
  ).toBe(ADMIN_ROUTE_SECTION.dashboard);
});
