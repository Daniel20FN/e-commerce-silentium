import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { visibleCategories } from "@/domains/storefront/services/catalog_rules";
import { publicProductWhere } from "@/domains/storefront/services/catalog_service";
import type { Prisma } from "@prisma/client";
import "server-only";
import type {
  OrderDraftLineParams,
  OrderVariantDto,
} from "../types/api_params";

export async function sellableProductWhere(
  tx: Prisma.TransactionClient,
): Promise<Prisma.ProductWhereInput> {
  const categories = await tx.category.findMany({
    select: { id: true, parentId: true, isActive: true, deletedAt: true },
    take: 10001,
  });
  if (categories.length > 10000)
    throw new CatalogOperationError("validation_error", "order_catalog_limit");
  return publicProductWhere(visibleCategories(categories));
}
export const orderVariantSelect = {
  id: true,
  productId: true,
  sku: true,
  priceCents: true,
  stock: true,
  stockRevision: true,
  product: {
    select: {
      name: true,
      images: {
        where: { deletedAt: null, status: "ready", variantId: null },
        orderBy: { position: "asc" },
        take: 1,
        select: { publicUrl: true },
      },
    },
  },
  images: {
    where: { deletedAt: null, status: "ready" },
    orderBy: { position: "asc" },
    take: 1,
    select: { publicUrl: true },
  },
  optionValues: {
    orderBy: { optionValueId: "asc" },
    select: {
      optionValue: {
        select: { value: true, option: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ProductVariantSelect;
export type OrderCatalogVariant = Prisma.ProductVariantGetPayload<{
  select: typeof orderVariantSelect;
}>;
export function variantAttributes(v: OrderCatalogVariant): string {
  return v.optionValues
    .map((o) => `${o.optionValue.option.name}: ${o.optionValue.value}`)
    .join(" · ");
}
export function projectOrderVariant(v: OrderCatalogVariant): OrderVariantDto {
  return {
    id: v.id,
    productId: v.productId,
    productName: v.product.name,
    sku: v.sku,
    attributes: variantAttributes(v),
    priceCents: v.priceCents,
    stock: v.stock,
    imageUrl: v.images[0]?.publicUrl ?? v.product.images[0]?.publicUrl ?? null,
  };
}
export async function draftLines(
  tx: Prisma.TransactionClient,
  lines: OrderDraftLineParams[],
) {
  const where = await sellableProductWhere(tx);
  const variants = await tx.productVariant.findMany({
    where: {
      id: { in: lines.map((l) => l.variantId) },
      isActive: true,
      deletedAt: null,
      product: where,
    },
    select: orderVariantSelect,
    take: 25,
  });
  return lines.map((line) => {
    const v = variants.find((v) => v.id === line.variantId);
    if (!v)
      throw new CatalogOperationError("invalid_state", "order_not_sellable");
    if (v.priceCents !== line.catalogPriceCents)
      throw new CatalogOperationError("conflict", "order_price_changed");
    if (line.unitPriceCents !== v.priceCents && !line.priceReason)
      throw new CatalogOperationError(
        "validation_error",
        "order_price_reason_required",
      );
    return {
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      sku: v.sku,
      attributes: variantAttributes(v),
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      catalogPriceCents: v.priceCents,
      priceReason: line.priceReason ?? null,
    };
  });
}
