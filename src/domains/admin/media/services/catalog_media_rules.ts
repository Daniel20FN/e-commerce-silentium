import type { CatalogImageDto } from "../types/api_params";

export const CATALOG_PRODUCT_IMAGE_LIMIT = 10;
export const CATALOG_VARIANT_IMAGE_LIMIT = 10;

export function resolveGalleryImages(
  productImages: CatalogImageDto[],
  variantImages: CatalogImageDto[],
  isVariant: boolean,
): { images: CatalogImageDto[]; source: "product" | "variant" | "none" } {
  const own = variantImages.filter((image) => !image.deletedAt);
  const general = productImages.filter((image) => !image.deletedAt);
  if (isVariant && own.length) return { images: own, source: "variant" };
  return { images: general, source: general.length ? "product" : "none" };
}
