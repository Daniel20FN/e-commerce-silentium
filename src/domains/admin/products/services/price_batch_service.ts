import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  AdminPriceBatchData,
  AdminPriceBatchParams,
} from "../types/api_params";
import { CatalogOperationError } from "./catalog_operation_error";

export async function updatePriceBatch(
  productId: string,
  input: AdminPriceBatchParams,
): Promise<AdminPriceBatchData> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: {
            updatedAt: true,
            status: true,
            archivedAt: true,
            deletedAt: true,
          },
        });
        if (!product)
          throw new CatalogOperationError("not_found", "record_not_found");
        if (
          product.deletedAt ||
          product.archivedAt ||
          product.status === "archived"
        )
          throw new CatalogOperationError("invalid_state", "product_read_only");
        if (product.updatedAt.toISOString() !== input.expectedProductUpdatedAt)
          throw new CatalogOperationError(
            "conflict",
            "product_revision_conflict",
          );
        const rows = input.rows.map((row) => {
          const revision = new Date(row.expectedUpdatedAt);
          const nextRevision = new Date(
            Math.max(Date.now(), revision.getTime() + 1),
          );
          return Prisma.sql`(${row.variantId}, ${revision}::timestamp, ${row.priceCents}::integer, ${row.compareAtPriceCents}::integer, ${nextRevision}::timestamp)`;
        });
        const count = await tx.$executeRaw`
          UPDATE "ProductVariant" AS variant
          SET "priceCents" = input.price, "compareAtPriceCents" = input.compare, "updatedAt" = input.next_revision
          FROM (VALUES ${Prisma.join(rows)}) AS input(id, revision, price, compare, next_revision)
          WHERE variant."id" = input.id AND variant."productId" = ${productId}
            AND variant."deletedAt" IS NULL AND variant."updatedAt" = input.revision
        `;
        if (count !== input.rows.length)
          throw new CatalogOperationError(
            "conflict",
            "variant_revision_conflict",
          );
        return { updated: input.rows.length };
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      throw new CatalogOperationError("conflict", "operation_retry");
    throw error;
  }
}
