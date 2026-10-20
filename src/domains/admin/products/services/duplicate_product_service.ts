import "server-only";

import { getDictionary } from "@/dictionary/services/get-dictionary";
import { prisma } from "@/lib/prisma";
import { Prisma, type CatalogDuplication } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type {
  AdminDuplicateProductData,
  AdminDuplicateProductParams,
} from "../types/api_params";
import { buildOptionCombinationKey } from "./admin_product_rules";
import { CatalogOperationError } from "./catalog_operation_error";

function replay(
  record: CatalogDuplication,
  sourceId: string,
  input: AdminDuplicateProductParams,
): AdminDuplicateProductData {
  if (
    record.sourceProductId !== sourceId ||
    record.copyCosts !== input.copyCosts ||
    record.sourceRevision.toISOString() !== input.expectedUpdatedAt
  )
    throw new CatalogOperationError("conflict", "operation_key_reused");
  return {
    productId: record.targetProductId,
    skippedCategories: record.skippedCategories,
  };
}

export async function duplicateProduct(
  sourceId: string,
  input: AdminDuplicateProductParams,
): Promise<AdminDuplicateProductData> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.catalogDuplication.findUnique({
          where: { operationId: input.operationId },
        });
        if (existing) return replay(existing, sourceId, input);
        const source = await tx.product.findUnique({
          where: { id: sourceId },
          include: {
            categories: { include: { category: true } },
            options: {
              orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              include: {
                values: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
              },
            },
            variants: {
              where: { isActive: true, deletedAt: null },
              orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              take: 201,
              include: { optionValues: true },
            },
            images: {
              where: { status: "ready", deletedAt: null },
              orderBy: [{ position: "asc" }, { id: "asc" }],
              take: 2011,
            },
          },
        });
        if (!source)
          throw new CatalogOperationError("not_found", "record_not_found");
        if (
          source.deletedAt ||
          source.archivedAt ||
          source.status === "archived"
        )
          throw new CatalogOperationError("invalid_state", "product_read_only");
        if (source.updatedAt.toISOString() !== input.expectedUpdatedAt)
          throw new CatalogOperationError(
            "conflict",
            "product_revision_conflict",
          );
        if (source.variants.length > 200 || source.images.length > 2010)
          throw new CatalogOperationError(
            "validation_error",
            "operation_too_large",
          );
        const id = randomUUID();
        const categories = source.categories.filter(
          (item) => item.category.isActive && !item.category.deletedAt,
        );
        const primary =
          categories.find((item) => item.isPrimary)?.categoryId ??
          categories[0]?.categoryId;
        const template = getDictionary("es").admin.products.operations.copyName;
        const name = template.replace("{name}", source.name.slice(0, 145));
        await tx.product.create({
          data: {
            id,
            name,
            slug: `${source.slug.slice(0, 110)}-copia-${id}`,
            status: "draft",
            featured: false,
            shortDescription: source.shortDescription,
            longDescription: source.longDescription,
            brand: source.brand,
            seoTitle: source.seoTitle,
            seoDescription: source.seoDescription,
            categories: {
              create: categories.map((item) => ({
                categoryId: item.categoryId,
                isPrimary: item.categoryId === primary,
              })),
            },
          },
        });
        const values = new Map<string, string>();
        const optionValues: Prisma.ProductOptionValueCreateManyInput[] = [];
        const options = source.options.map((option) => {
          const optionId = randomUUID();
          for (const value of option.values) {
            const valueId = randomUUID();
            values.set(value.id, valueId);
            optionValues.push({
              id: valueId,
              optionId,
              value: value.value,
              displayOrder: value.displayOrder,
            });
          }
          return {
            id: optionId,
            productId: id,
            name: option.name,
            displayOrder: option.displayOrder,
          };
        });
        if (options.length)
          await tx.productOption.createMany({ data: options });
        if (optionValues.length)
          await tx.productOptionValue.createMany({ data: optionValues });
        const variants = new Map<string, string>();
        const variantValues: Prisma.ProductVariantOptionValueCreateManyInput[] =
          [];
        const variantData = source.variants.map((variant, index) => {
          const newId = randomUUID();
          variants.set(variant.id, newId);
          const optionValueIds = variant.optionValues.map((item) => {
            const mapped = values.get(item.optionValueId);
            if (!mapped)
              throw new CatalogOperationError(
                "invalid_state",
                "operation_source_invalid",
              );
            return mapped;
          });
          variantValues.push(
            ...optionValueIds.map((optionValueId) => ({
              productVariantId: newId,
              optionValueId,
            })),
          );
          return {
            id: newId,
            productId: id,
            sku: `CP-${id.replaceAll("-", "")}-${index + 1}`,
            priceCents: variant.priceCents,
            compareAtPriceCents: variant.compareAtPriceCents,
            stock: 0,
            isActive: true,
            isDefault: variant.isDefault,
            displayOrder: variant.displayOrder,
            weightGrams: variant.weightGrams,
            widthMm: variant.widthMm,
            heightMm: variant.heightMm,
            lengthMm: variant.lengthMm,
            optionCombinationKey: buildOptionCombinationKey(optionValueIds),
          };
        });
        if (variantData.length)
          await tx.productVariant.createMany({ data: variantData });
        if (variantValues.length)
          await tx.productVariantOptionValue.createMany({
            data: variantValues,
          });
        const images = source.images.filter(
          (image) => image.variantId === null || variants.has(image.variantId),
        );
        if (images.length)
          await tx.catalogImage.createMany({
            data: images.map((image) => ({
              productId: id,
              variantId: image.variantId ? variants.get(image.variantId) : null,
              bucket: image.bucket,
              path: image.path,
              publicUrl: image.publicUrl,
              fileName: image.fileName,
              contentType: image.contentType,
              size: image.size,
              altText: image.altText,
              position: image.position,
              status: "ready",
            })),
          });
        if (input.copyCosts) {
          const costs = await tx.catalogCost.findMany({
            where: {
              productId: sourceId,
              deletedAt: null,
              OR: [
                { variantId: null },
                { variantId: { in: [...variants.keys()] } },
              ],
            },
            take: 501,
          });
          if (costs.length > 500)
            throw new CatalogOperationError(
              "validation_error",
              "operation_too_large",
            );
          if (costs.length)
            await tx.catalogCost.createMany({
              data: costs.map((cost) => ({
                productId: id,
                variantId: cost.variantId ? variants.get(cost.variantId) : null,
                name: cost.name,
                description: cost.description,
                amountCents: cost.amountCents,
              })),
            });
        }
        const operation = await tx.catalogDuplication.create({
          data: {
            operationId: input.operationId,
            sourceProductId: sourceId,
            targetProductId: id,
            sourceRevision: source.updatedAt,
            copyCosts: input.copyCosts,
            skippedCategories: source.categories.length - categories.length,
          },
        });
        return replay(operation, sourceId, input);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    ) {
      const existing = await prisma.catalogDuplication.findUnique({
        where: { operationId: input.operationId },
      });
      if (existing) return replay(existing, sourceId, input);
      throw new CatalogOperationError("conflict", "operation_retry");
    }
    throw error;
  }
}
