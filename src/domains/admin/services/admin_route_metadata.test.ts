import dictionary from "@/dictionary/es.json";
import {
  ADMIN_ROUTE_SECTION,
  adminNavigationDictionary,
  getAdminNavigationSections,
  resolveAdminRouteMetadata,
} from "./admin_route_metadata";
it("does not send the guide articles to the shared client shell", () => {
  const projected = adminNavigationDictionary(dictionary);
  expect(projected.admin.guide).toEqual({
    title: dictionary.admin.guide.title,
    description: dictionary.admin.guide.description,
    contextHelp: dictionary.admin.guide.contextHelp,
  });
  expect(projected.admin.guide).not.toHaveProperty("articles");
  expect(dictionary.admin.guide.articles).toHaveLength(17);
  expect(resolveAdminRouteMetadata("/admin/guia", projected).section).toBe(
    ADMIN_ROUTE_SECTION.guide,
  );
});
it("exposes the private guide as a distinct navigation section", () => {
  expect(resolveAdminRouteMetadata("/admin/guia", dictionary)).toMatchObject({
    section: ADMIN_ROUTE_SECTION.guide,
    navigationHref: "/admin/guia",
    title: dictionary.admin.guide.title,
  });
  expect(getAdminNavigationSections(dictionary)).toContainEqual({
    href: "/admin/guia",
    section: ADMIN_ROUTE_SECTION.guide,
    label: dictionary.admin.navigation.guide,
  });
  expect(
    resolveAdminRouteMetadata("/admin/guia-extra", dictionary).section,
  ).toBe(ADMIN_ROUTE_SECTION.dashboard);
});
it("places orders immediately after products in the drawer", () => {
  const navigation = getAdminNavigationSections(dictionary).map(
    (item) => item.href,
  );
  expect(navigation.indexOf("/admin/pedidos")).toBe(
    navigation.indexOf("/admin/productos") + 1,
  );
});
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

it("keeps analysis separate from operational home and lookalike paths", () => {
  expect(
    resolveAdminRouteMetadata("/admin/analisis", dictionary),
  ).toMatchObject({
    section: ADMIN_ROUTE_SECTION.analysis,
    navigationHref: "/admin/analisis",
  });
  expect(
    resolveAdminRouteMetadata("/admin/analisis-extra", dictionary).section,
  ).toBe(ADMIN_ROUTE_SECTION.dashboard);
  expect(getAdminNavigationSections(dictionary)[0].href).toBe("/admin");
});
