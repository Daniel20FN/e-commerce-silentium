import {
  getStorefrontCategories,
  publicProductWhere,
} from "@/domains/storefront/services/catalog_service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import "server-only";
import type {
  CartLine,
  CartQuote,
  ResolveCartParams,
} from "../types/api_params";
import { MAX_CART_QUANTITY } from "./cart_rules";

const imageArgs = {
  where: { status: "ready", deletedAt: null },
  orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  take: 1,
  select: { id: true, publicUrl: true, altText: true },
} satisfies Prisma.ProductVariant$imagesArgs;

export async function resolveCart({
  items,
}: ResolveCartParams): Promise<CartQuote> {
  if (!items.length) return { lines: [], subtotalCents: 0, valid: false };
  const categories = await getStorefrontCategories();
  const variants = await prisma.productVariant.findMany({
    where: {
      id: { in: items.map((item) => item.variantId) },
      isActive: true,
      deletedAt: null,
      product: publicProductWhere(categories),
    },
    select: {
      id: true,
      sku: true,
      priceCents: true,
      stock: true,
      images: imageArgs,
      optionValues: {
        select: {
          optionValue: {
            select: {
              value: true,
              option: { select: { name: true, displayOrder: true } },
            },
          },
        },
      },
      product: {
        select: {
          name: true,
          slug: true,
          images: {
            ...imageArgs,
            where: { ...imageArgs.where, variantId: null },
          },
        },
      },
    },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const lines: CartLine[] = items.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant)
      return {
        ...item,
        status: "unavailable",
        name: null,
        sku: null,
        attributes: null,
        slug: null,
        image: null,
        priceCents: null,
        subtotalCents: null,
        maxQuantity: 0,
      };
    const image = variant.images[0] ?? variant.product.images[0];
    const maxQuantity = Math.min(MAX_CART_QUANTITY, variant.stock);
    const available = item.quantity <= maxQuantity;
    return {
      ...item,
      status:
        maxQuantity === 0
          ? "unavailable"
          : available
            ? "available"
            : "insufficient_stock",
      name: variant.product.name,
      sku: variant.sku,
      slug: variant.product.slug,
      attributes: variant.optionValues
        .toSorted(
          (a, b) =>
            a.optionValue.option.displayOrder -
            b.optionValue.option.displayOrder,
        )
        .map(
          (value) =>
            `${value.optionValue.option.name}: ${value.optionValue.value}`,
        )
        .join(" / "),
      image: image
        ? {
            id: image.id,
            url: image.publicUrl,
            alt: image.altText || variant.product.name,
          }
        : null,
      priceCents: variant.priceCents,
      subtotalCents: available ? variant.priceCents * item.quantity : null,
      maxQuantity,
    };
  });
  const subtotalCents = lines.reduce(
    (sum, line) => sum + (line.subtotalCents ?? 0),
    0,
  );
  if (!Number.isSafeInteger(subtotalCents))
    throw new Error("cart_total_invalid");
  return {
    lines,
    subtotalCents,
    valid: lines.every((line) => line.status === "available"),
  };
}
