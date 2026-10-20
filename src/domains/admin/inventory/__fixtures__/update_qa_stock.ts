import type { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { setInventoryContext } from "../services/inventory_context";

export async function updateQaStock(
  db: PrismaClient,
  variantId: string,
  data: Prisma.ProductVariantUpdateInput,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    const operationId = randomUUID();
    await tx.inventoryOperation.create({
      data: {
        id: operationId,
        productId: variant.productId,
        actorId: "qa-fixture",
        requestHash: operationId,
      },
    });
    await setInventoryContext(tx, {
      type: "maintenance",
      variantId,
      operationId,
      actorId: "qa-fixture",
      actorLabel: "QA fixture",
      reason: "Isolated integration fixture change",
    });
    await tx.productVariant.update({ where: { id: variantId }, data });
  });
}
