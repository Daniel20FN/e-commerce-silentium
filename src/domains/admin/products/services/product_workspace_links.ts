import {
  priorityHref,
  resolvePriorityGroup,
} from "@/domains/admin/home/services/operational_rules";
import {
  ADMIN_PRODUCT_SORT_FIELD,
  ADMIN_PRODUCT_STATUS_VALUES,
  type AdminProductSortField,
  type AdminProductStatus,
} from "../types/product_dto";

export type ProductWorkspaceSection =
  | "information"
  | "variants"
  | "inventory"
  | "media"
  | "costs"
  | "publication";
export const PRODUCT_WORKSPACE_SECTIONS: ProductWorkspaceSection[] = [
  "information",
  "variants",
  "inventory",
  "media",
  "costs",
  "publication",
];

export function resolveWorkspaceSection(
  value: string | null | undefined,
): ProductWorkspaceSection {
  return (
    PRODUCT_WORKSPACE_SECTIONS.find((section) => section === value) ??
    "information"
  );
}

export function safeProductsReturnUrl(
  value: string | null | undefined,
): string {
  if (!value) return "/admin/productos";
  try {
    const url = new URL(value, "https://workspace.invalid");
    if (url.origin === "https://workspace.invalid" && url.pathname === "/admin")
      return "/admin";
    if (
      url.origin === "https://workspace.invalid" &&
      url.pathname === "/admin/pendientes"
    ) {
      const group = resolvePriorityGroup(
        url.searchParams.get("group") ?? undefined,
      );
      if (group) return priorityHref(group);
    }
    return url.origin === "https://workspace.invalid" &&
      url.pathname === "/admin/productos"
      ? url.pathname + url.search
      : "/admin/productos";
  } catch {
    return "/admin/productos";
  }
}

export function productWorkspaceHref(
  id: string,
  section: ProductWorkspaceSection,
  returnTo: string,
): string {
  const query = new URLSearchParams({
    section,
    returnTo: safeProductsReturnUrl(returnTo),
  });
  return `/admin/productos/${encodeURIComponent(id)}?${query}`;
}

export interface ProductsListView {
  page: number;
  pageSize: number;
  search: string;
  status: AdminProductStatus | "all";
  categoryId: string;
  brand: string;
  featured: "all" | "yes" | "no";
  inTrash: boolean;
  stock: "all" | "in_stock" | "out_of_stock";
  discounted: "all" | "yes" | "no";
  sortField: AdminProductSortField;
  sortDirection: "asc" | "desc";
}

export function readProductsListView(
  params: Pick<URLSearchParams, "get">,
): ProductsListView {
  const page = Number(params.get("page") ?? 0);
  const size = Number(params.get("pageSize") ?? 10);
  const stock = params.get("stock");
  const feature = params.get("featured");
  const discount = params.get("discounted");
  return {
    page: Number.isSafeInteger(page) && page >= 0 && page <= 100000 ? page : 0,
    pageSize: [10, 25, 50].includes(size) ? size : 10,
    search: params.get("search") ?? "",
    status:
      ADMIN_PRODUCT_STATUS_VALUES.find(
        (value) => value === params.get("status"),
      ) ?? "all",
    categoryId: params.get("categoryId") ?? "",
    brand: params.get("brand") ?? "",
    featured: feature === "yes" || feature === "no" ? feature : "all",
    inTrash: params.get("inTrash") === "true",
    stock: stock === "in_stock" || stock === "out_of_stock" ? stock : "all",
    discounted: discount === "yes" || discount === "no" ? discount : "all",
    sortField:
      Object.values(ADMIN_PRODUCT_SORT_FIELD).find(
        (value) => value === params.get("sortField"),
      ) ?? ADMIN_PRODUCT_SORT_FIELD.updatedAt,
    sortDirection: params.get("sortDirection") === "asc" ? "asc" : "desc",
  };
}

export function productsListViewUrl(view: ProductsListView): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(view)) {
    if (value !== "" && value !== "all") params.set(key, String(value));
  }
  return `/admin/productos?${params}`;
}
