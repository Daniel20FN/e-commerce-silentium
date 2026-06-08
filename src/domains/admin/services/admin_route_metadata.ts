import type { Dictionary } from "@/dictionary/services/get-dictionary";

export const ADMIN_ROUTE_SECTION = {
  dashboard: "dashboard",
  users: "users",
  userDetail: "user-detail",
  categories: "categories",
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
  dictionary: Dictionary,
): AdminNavigationSection[] {
  return [
    {
      href: "/admin",
      label: dictionary.admin.navigation.dashboard,
      section: ADMIN_ROUTE_SECTION.dashboard,
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
  ];
}

export function resolveAdminRouteMetadata(
  pathname: string,
  dictionary: Dictionary,
): AdminRouteMetadata {
  const routes: AdminRouteMetadata[] = [
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
