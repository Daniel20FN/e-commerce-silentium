import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import "server-only";
import type {
  InventoryData,
  InventoryMinimumParams,
  InventoryMutationParams,
  InventoryQueryParams,
} from "../types/api_params";
import { setInventoryContext, type InventoryActor } from "./inventory_context";

const fail = (
  message: string,
  type:
    | "conflict"
    | "not_found"
    | "invalid_state"
    | "validation_error" = "conflict",
): never => {
  throw new CatalogOperationError(type, message);
};
const fingerprint = (value: InventoryMutationParams | InventoryMinimumParams) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function getInventory(
  productId: string,
  query: InventoryQueryParams,
): Promise<InventoryData> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { status: true, deletedAt: true, archivedAt: true },
  });
  if (!product) return fail("record_not_found", "not_found");
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ displayOrder: "asc" }, { sku: "asc" }],
    take: 1001,
  });
  if (variants.length > 1000)
    return fail("inventory_too_large", "validation_error");
  if (query.variantId && !variants.some((v) => v.id === query.variantId))
    return fail("record_not_found", "not_found");
  let cursor: { createdAt: Date; id: string } | null = null;
  if (query.cursor) {
    cursor = await prisma.inventoryMovement.findFirst({
      where: { id: query.cursor, variant: { productId } },
      select: { id: true, createdAt: true },
    });
    if (!cursor) return fail("record_not_found", "not_found");
  }
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      variant: { productId },
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.reference
        ? { reference: { contains: query.reference, mode: "insensitive" } }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    include: {
      variant: { select: { sku: true } },
      reversedBy: { select: { id: true } },
    },
  });
  return {
    readOnly:
      !!product.deletedAt ||
      !!product.archivedAt ||
      product.status === "archived",
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      revision: v.stockRevision,
      minimum: v.inventoryMinimum,
      inTrash: !!v.deletedAt,
      active: v.isActive,
    })),
    movements: movements.slice(0, 50).map((m) => ({
      id: m.id,
      variantId: m.variantId,
      sku: m.variant.sku,
      type: m.type,
      delta: m.delta,
      before: m.before,
      after: m.after,
      actorLabel: m.actorLabel,
      reason: m.reason,
      reference: m.reference,
      reversedById: m.reversedBy?.id ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor: movements.length > 50 ? movements[49].id : null,
  };
}

async function replay(
  tx: Prisma.TransactionClient,
  productId: string,
  operationId: string,
  hash: string,
  actor: InventoryActor,
): Promise<boolean> {
  const existing = await tx.inventoryOperation.findUnique({
    where: { id: operationId },
  });
  if (!existing) return false;
  if (
    existing.productId !== productId ||
    existing.actorId !== actor.id ||
    existing.requestHash !== hash
  )
    return fail("inventory_operation_reused");
  return true;
}
async function lockProduct(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${productId} FOR UPDATE`;
  const p = await tx.product.findUnique({
    where: { id: productId },
    select: { deletedAt: true, archivedAt: true, status: true },
  });
  if (!p) return fail("record_not_found", "not_found");
  if (p.deletedAt || p.archivedAt || p.status === "archived")
    return fail("product_read_only", "invalid_state");
}
async function operation(
  productId: string,
  input: InventoryMutationParams | InventoryMinimumParams,
  actor: InventoryActor,
  write: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<{ operationId: string }> {
  if (!actor.id || !actor.label) return fail("unauthorized", "invalid_state");
  const hash = fingerprint(input);
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (await replay(tx, productId, input.operationId, hash, actor))
          return { operationId: input.operationId };
        await lockProduct(tx, productId);
        // The product lock serializes identical and independent batches for this product.
        if (await replay(tx, productId, input.operationId, hash, actor))
          return { operationId: input.operationId };
        await tx.inventoryOperation.create({
          data: {
            id: input.operationId,
            productId,
            actorId: actor.id,
            requestHash: hash,
          },
        });
        await write(tx);
        return { operationId: input.operationId };
      },
      { timeout: 20000 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    ) {
      const existing = await prisma.inventoryOperation.findUnique({
        where: { id: input.operationId },
      });
      if (
        existing &&
        existing.productId === productId &&
        existing.actorId === actor.id &&
        existing.requestHash === hash
      )
        return { operationId: input.operationId };
      return fail("inventory_conflict");
    }
    throw error;
  }
}
async function variantForWrite(
  tx: Prisma.TransactionClient,
  productId: string,
  id: string,
  revision: number,
) {
  await tx.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "id"=${id} AND "productId"=${productId} FOR UPDATE`;
  const v = await tx.productVariant.findFirst({ where: { id, productId } });
  if (!v) return fail("record_not_found", "not_found");
  if (v.deletedAt) return fail("variant_in_trash", "invalid_state");
  if (v.stockRevision !== revision) return fail("inventory_conflict");
  return v;
}

export async function mutateInventory(
  productId: string,
  input: InventoryMutationParams,
  actor: InventoryActor,
): Promise<{ operationId: string }> {
  return operation(productId, input, actor, async (tx) => {
    for (const row of [...input.rows].sort((a, b) =>
      a.variantId.localeCompare(b.variantId),
    )) {
      const v = await variantForWrite(
        tx,
        productId,
        row.variantId,
        row.expectedRevision,
      );
      let delta =
        input.kind === "count"
          ? row.quantity - v.stock
          : input.kind === "exit"
            ? -row.quantity
            : row.quantity;
      if (input.kind === "reversal") {
        const original = await tx.inventoryMovement.findUnique({
          where: { id: row.reversesId },
          include: { reversedBy: true },
        });
        if (
          !original ||
          original.variantId !== v.id ||
          original.type === "initial" ||
          original.type === "reversal" ||
          original.reversedBy
        )
          return fail("inventory_reversal_invalid", "invalid_state");
        delta = -original.delta;
      }
      const next = v.stock + delta;
      if (!Number.isSafeInteger(next) || next < 0 || next > 999999999)
        return fail("inventory_balance_invalid", "validation_error");
      await setInventoryContext(tx, {
        type: input.kind,
        variantId: v.id,
        actorId: actor.id,
        actorLabel: actor.label,
        operationId: input.operationId,
        reason: row.reason,
        reference: row.reference,
        reversesId: row.reversesId,
      });
      await tx.productVariant.update({
        where: { id: v.id, stockRevision: row.expectedRevision },
        data: { stock: next },
      });
    }
  });
}
export async function setInventoryMinimum(
  productId: string,
  input: InventoryMinimumParams,
  actor: InventoryActor,
): Promise<{ operationId: string }> {
  return operation(productId, input, actor, async (tx) => {
    const v = await variantForWrite(
      tx,
      productId,
      input.variantId,
      input.expectedRevision,
    );
    await tx.productVariant.update({
      where: { id: v.id, stockRevision: input.expectedRevision },
      data: { inventoryMinimum: input.minimum },
    });
  });
}
