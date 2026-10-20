import type { ProductWorkspaceSection } from "../services/product_workspace_links";
import type { AdminProductStatus } from "./product_dto";

export type PublicationIssueCode =
  | "not_active"
  | "read_only"
  | "no_visible_categories"
  | "no_active_variants"
  | "no_stock"
  | "default_unavailable"
  | "missing_images"
  | "missing_seo"
  | "missing_costs"
  | "hidden_categories";

export interface PublicationIssue {
  code: PublicationIssueCode;
  level: "blocker" | "warning" | "recommendation";
  section: ProductWorkspaceSection;
}

export interface PublicationCategory {
  id: string;
  name: string;
  active: boolean;
  inTrash: boolean;
  visible: boolean;
}

export interface PublicationVariant {
  id: string;
  sku: string;
  active: boolean;
  inTrash: boolean;
  stock: number;
  isDefault: boolean;
}

export interface PublicationReport {
  productId: string;
  status: AdminProductStatus;
  updatedAt: string;
  readOnly: boolean;
  visible: boolean;
  purchasable: boolean;
  publicUrl: string | null;
  selectedSku: string | null;
  readyVariantCount: number;
  categories: PublicationCategory[];
  variants: PublicationVariant[];
  issues: PublicationIssue[];
}
