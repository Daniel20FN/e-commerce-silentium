import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { canManageUsers } from "./admin_roles";

export type AdminNavigationDictionary = Omit<Dictionary, "admin"> & {
  admin: Omit<Dictionary["admin"], "guide"> & {
    guide: Pick<
      Dictionary["admin"]["guide"],
      "title" | "description" | "contextHelp"
    >;
  };
};

export function adminNavigationDictionary(
  dictionary: Dictionary,
): AdminNavigationDictionary {
  const { title, description, contextHelp } = dictionary.admin.guide;
  return {
    ...dictionary,
    admin: { ...dictionary.admin, guide: { title, description, contextHelp } },
  };
}

export const ADMIN_ROUTE_SECTION = {
  dashboard: "dashboard",
  analysis: "analysis",
  users: "users",
  userDetail: "user-detail",
  categories: "categories",
  products: "products",
  orders: "orders",
  guide: "guide",
} as const;

export type AdminRouteSection =
  (typeof ADMIN_ROUTE_SECTION)[keyof typeof ADMIN_ROUTE_SECTION];

interface AdminRouteMetadata {
  description: string;
  href: string;
  navigationHref: string;
  section: AdminRouteSection;
  title: string;
  matches: (pathname: string) => boolean;
}

export interface AdminNavigationSection {
  href: string;
  label: string;
  section: AdminRouteSection;
}

export function getAdminNavigationSections(
  dictionary: AdminNavigationDictionary,
  user: Pick<CurrentUserDto, "role">,
): AdminNavigationSection[] {
  const sections: AdminNavigationSection[] = [
    {
      href: "/admin",
      label: dictionary.admin.navigation.dashboard,
      section: ADMIN_ROUTE_SECTION.dashboard,
    },
    {
      href: "/admin/analisis",
      label: dictionary.admin.navigation.analysis,
      section: ADMIN_ROUTE_SECTION.analysis,
    },
    {
      href: "/admin/usuarios",
      label: dictionary.admin.navigation.users,
      section: ADMIN_ROUTE_SECTION.users,
    },
    {
      href: "/admin/categorias",
      label: dictionary.admin.navigation.categories,
      section: ADMIN_ROUTE_SECTION.categories,
    },
    {
      href: "/admin/productos",
      label: dictionary.admin.navigation.products,
      section: ADMIN_ROUTE_SECTION.products,
    },
    {
      href: "/admin/pedidos",
      label: dictionary.admin.navigation.orders,
      section: ADMIN_ROUTE_SECTION.orders,
    },
    {
      href: "/admin/guia",
      label: dictionary.admin.navigation.guide,
      section: ADMIN_ROUTE_SECTION.guide,
    },
  ];
  return sections.filter(
    (item) =>
      item.section !== ADMIN_ROUTE_SECTION.users || canManageUsers(user),
  );
}

export function resolveAdminRouteMetadata(
  pathname: string,
  dictionary: AdminNavigationDictionary,
): AdminRouteMetadata {
  const routes: AdminRouteMetadata[] = [
    {
      href: "/admin/guia",
      navigationHref: "/admin/guia",
      section: ADMIN_ROUTE_SECTION.guide,
      title: dictionary.admin.guide.title,
      description: dictionary.admin.guide.description,
      matches: (path) => path === "/admin/guia",
    },
    {
      href: "/admin/analisis",
      navigationHref: "/admin/analisis",
      section: ADMIN_ROUTE_SECTION.analysis,
      title: dictionary.admin.analysis.title,
      description: dictionary.admin.analysis.description,
      matches: (path) => path === "/admin/analisis",
    },
    {
      href: "/admin/pendientes",
      navigationHref: "/admin",
      section: ADMIN_ROUTE_SECTION.dashboard,
      title: dictionary.admin.dashboard.operations.queueTitle,
      description: dictionary.admin.dashboard.operations.queueDescription,
      matches: (path) => path === "/admin/pendientes",
    },
    {
      href: "/admin/pedidos",
      navigationHref: "/admin/pedidos",
      section: ADMIN_ROUTE_SECTION.orders,
      title: dictionary.admin.orders.title,
      description: dictionary.admin.orders.description,
      matches: (path) =>
        path === "/admin/pedidos" || path.startsWith("/admin/pedidos/"),
    },
    {
      href: "/admin/productos",
      navigationHref: "/admin/productos",
      section: ADMIN_ROUTE_SECTION.products,
      title: dictionary.admin.products.title,
      description: dictionary.admin.products.description,
      matches: (currentPathname) =>
        currentPathname === "/admin/productos" ||
        currentPathname.startsWith("/admin/productos/"),
    },
    {
      href: "/admin/usuarios/[userId]",
      navigationHref: "/admin/usuarios",
      section: ADMIN_ROUTE_SECTION.userDetail,
      title: dictionary.admin.users.detail.title,
      description: dictionary.admin.users.detail.subtitle,
      matches: (currentPathname) =>
        currentPathname.startsWith("/admin/usuarios/"),
    },
    {
      href: "/admin/categorias",
      navigationHref: "/admin/categorias",
      section: ADMIN_ROUTE_SECTION.categories,
      title: dictionary.admin.categories.title,
      description: dictionary.admin.categories.description,
      matches: (currentPathname) => currentPathname === "/admin/categorias",
    },
    {
      href: "/admin/usuarios",
      navigationHref: "/admin/usuarios",
      section: ADMIN_ROUTE_SECTION.users,
      title: dictionary.admin.users.title,
      description: dictionary.admin.users.description,
      matches: (currentPathname) => currentPathname === "/admin/usuarios",
    },
    {
      href: "/admin",
      navigationHref: "/admin",
      section: ADMIN_ROUTE_SECTION.dashboard,
      title: dictionary.admin.dashboard.title,
      description: dictionary.admin.dashboard.subtitle,
      matches: (currentPathname) => currentPathname === "/admin",
    },
  ];

  return (
    routes.find((route) => route.matches(pathname)) ?? {
      href: "/admin",
      navigationHref: "/admin",
      section: ADMIN_ROUTE_SECTION.dashboard,
      title: dictionary.admin.layout.title,
      description: dictionary.admin.layout.defaultSubtitle,
      matches: () => false,
    }
  );
}
