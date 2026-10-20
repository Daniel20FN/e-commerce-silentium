import type { StorefrontProductRecord } from "@/domains/storefront/services/catalog_service";
import type { StorefrontCategory } from "@/domains/storefront/types/catalog";
import type { AdminProductDetailDto } from "../types/product_dto";
import type { PublicationReport } from "../types/publication";

export const publicationCategory: StorefrontCategory = {
  id: "cat",
  name: "Dormitorio",
  slug: "dormitorio",
  parentId: null,
  description: null,
  imageUrl: null,
  sortOrder: 0,
  seoTitle: null,
  seoDescription: null,
};
export const previewRecord: StorefrontProductRecord = {
  id: "qa",
  slug: "qa",
  name: "Producto QA privado",
  shortDescription: "Suave",
  longDescription: "Descripción",
  brand: "Silentium",
  seoTitle: "QA",
  seoDescription: "QA SEO",
  categories: [{ categoryId: "cat", isPrimary: true }],
  options: [],
  images: [
    {
      id: "image",
      publicUrl: "https://example.com/qa.webp",
      altText: "Imagen QA",
    },
  ],
  variants: [
    {
      id: "variant",
      sku: "QA-SKU",
      priceCents: 12500000,
      compareAtPriceCents: null,
      stock: 3,
      isDefault: true,
      optionValues: [],
      images: [],
    },
  ],
};
export const savedProduct: AdminProductDetailDto = {
  id: "qa",
  slug: "qa",
  name: "Producto QA privado",
  shortDescription: "Suave",
  longDescription: "Descripción",
  brand: "Silentium",
  seoTitle: "QA",
  seoDescription: "QA SEO",
  featured: false,
  status: "draft",
  inTrash: false,
  categories: [
    { id: "cat", name: "Dormitorio", slug: "dormitorio", isPrimary: true },
  ],
  primaryCategory: {
    id: "cat",
    name: "Dormitorio",
    slug: "dormitorio",
    isPrimary: true,
  },
  options: [],
  optionsLocked: true,
  variantCount: 1,
  sellableVariantCount: 1,
  hasSellableVariants: true,
  warnings: [],
  archivedAt: null,
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
};
export const publicationReport: PublicationReport = {
  productId: "qa",
  status: "draft",
  updatedAt: savedProduct.updatedAt,
  readOnly: false,
  visible: false,
  purchasable: false,
  publicUrl: null,
  selectedSku: "QA-SKU",
  readyVariantCount: 1,
  categories: [
    {
      id: "cat",
      name: "Dormitorio",
      active: true,
      inTrash: false,
      visible: true,
    },
  ],
  variants: [
    {
      id: "variant",
      sku: "QA-SKU",
      active: true,
      inTrash: false,
      stock: 3,
      isDefault: true,
    },
  ],
  issues: [{ code: "not_active", level: "blocker", section: "information" }],
};
