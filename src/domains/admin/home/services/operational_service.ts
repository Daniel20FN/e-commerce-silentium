import { sellableProductWhere } from "@/domains/admin/orders/services/order_catalog";
import {
  DELIVERY_FULFILLMENTS,
  PREPARATION_FULFILLMENTS,
} from "@/domains/admin/orders/services/order_rules";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import "server-only";
import type {
  PriorityBlock,
  PriorityGroup,
  PriorityQueue,
  PriorityRow,
} from "../types/operational";
import { PRIORITY_BLOCKS } from "../types/operational";
import { operationalDate, priorityHref } from "./operational_rules";

const editableProduct: Prisma.ProductWhereInput = {
  deletedAt: null,
  archivedAt: null,
  status: { not: "archived" },
};
const activeVariant: Prisma.ProductVariantWhereInput = {
  deletedAt: null,
  isActive: true,
};

// These predicates drive both dashboard totals and their paginated destinations.
export function productPriorityWhere(
  group: "drafts" | "publication" | "unavailable",
  publicWhere: Prisma.ProductWhereInput,
): Prisma.ProductWhereInput {
  if (group === "drafts") return { ...editableProduct, status: "draft" };
  if (group === "publication")
    return { AND: [editableProduct, { NOT: publicWhere }] };
  return {
    AND: [
      editableProduct,
      publicWhere,
      { variants: { none: { ...activeVariant, stock: { gt: 0 } } } },
    ],
  };
}
export function orderPriorityWhere(
  group: "prepare" | "deliver" | "unpaid",
): Prisma.ManualOrderWhereInput {
  if (group === "unpaid") return { status: "confirmed", payment: "pending" };
  return {
    status: "confirmed",
    fulfillment: {
      in:
        group === "prepare" ? PREPARATION_FULFILLMENTS : DELIVERY_FULFILLMENTS,
    },
  };
}
export function inventoryPriorityWhere(
  tx: Prisma.TransactionClient,
  group: "out" | "low",
): Prisma.ProductVariantWhereInput {
  return {
    deletedAt: null,
    product: editableProduct,
    // Inactive variants can still be replenished; retired variants cannot.
    ...(group === "out"
      ? { stock: 0 }
      : {
          inventoryMinimum: { not: null },
          stock: { gt: 0, lte: tx.productVariant.fields.inventoryMinimum },
        }),
  };
}
function productLink(
  id: string,
  section: "information" | "publication" | "inventory",
  group: PriorityGroup,
): string {
  const query = new URLSearchParams({ section, returnTo: priorityHref(group) });
  return `/admin/productos/${encodeURIComponent(id)}?${query}`;
}
function row(id: string, name: string, href: string): PriorityRow {
  return {
    id,
    name,
    href,
    sku: null,
    stock: null,
    minimum: null,
    orderNumber: null,
  };
}
async function readQueue(
  tx: Prisma.TransactionClient,
  group: PriorityGroup,
  take: number,
  cursor?: string,
  publicWhere?: Prisma.ProductWhereInput,
): Promise<PriorityQueue> {
  const updatedAt = new Date().toISOString();
  const result = { group, updatedAt, updatedLabel: operationalDate(updatedAt) };
  if (group === "prepare" || group === "deliver" || group === "unpaid") {
    const where = orderPriorityWhere(group);
    const anchor = cursor
      ? await tx.manualOrder.findFirst({
          where: { ...where, id: cursor },
          select: { id: true, createdAt: true },
        })
      : null;
    if (cursor && !anchor) throw Error("stale_priority_cursor");
    const [count, records] = await Promise.all([
      tx.manualOrder.count({ where }),
      tx.manualOrder.findMany({
        where: {
          ...where,
          ...(anchor
            ? {
                OR: [
                  { createdAt: { gt: anchor.createdAt } },
                  { createdAt: anchor.createdAt, id: { gt: anchor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: take + 1,
        select: { id: true, number: true },
      }),
    ]);
    return {
      ...result,
      count,
      rows: records.slice(0, take).map((record) => ({
        ...row(
          record.id,
          "",
          `/admin/pedidos/${record.id}?${new URLSearchParams({ returnTo: priorityHref(group) })}`,
        ),
        orderNumber: record.number,
      })),
      nextCursor: records.length > take ? records[take - 1].id : null,
    };
  }
  if (group === "out" || group === "low") {
    const where = inventoryPriorityWhere(tx, group);
    const anchor = cursor
      ? await tx.productVariant.findFirst({
          where: { AND: [where, { id: cursor }] },
          select: { id: true, createdAt: true },
        })
      : null;
    if (cursor && !anchor) throw Error("stale_priority_cursor");
    const [count, records] = await Promise.all([
      tx.productVariant.count({ where }),
      tx.productVariant.findMany({
        where: {
          AND: [
            where,
            ...(anchor
              ? [
                  {
                    OR: [
                      { createdAt: { gt: anchor.createdAt } },
                      { createdAt: anchor.createdAt, id: { gt: anchor.id } },
                    ],
                  },
                ]
              : []),
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: take + 1,
        select: {
          id: true,
          productId: true,
          sku: true,
          stock: true,
          inventoryMinimum: true,
          product: { select: { name: true } },
        },
      }),
    ]);
    return {
      ...result,
      count,
      rows: records.slice(0, take).map((record) => ({
        ...row(
          record.id,
          record.product.name,
          productLink(record.productId, "inventory", group),
        ),
        sku: record.sku,
        stock: record.stock,
        minimum: record.inventoryMinimum,
      })),
      nextCursor: records.length > take ? records[take - 1].id : null,
    };
  }
  const where = productPriorityWhere(
    group,
    publicWhere ?? (await sellableProductWhere(tx)),
  );
  const anchor = cursor
    ? await tx.product.findFirst({
        where: { AND: [where, { id: cursor }] },
        select: { id: true, createdAt: true },
      })
    : null;
  if (cursor && !anchor) throw Error("stale_priority_cursor");
  const [count, records] = await Promise.all([
    tx.product.count({ where }),
    tx.product.findMany({
      where: {
        AND: [
          where,
          ...(anchor
            ? [
                {
                  OR: [
                    { createdAt: { gt: anchor.createdAt } },
                    { createdAt: anchor.createdAt, id: { gt: anchor.id } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
      select: { id: true, name: true },
    }),
  ]);
  return {
    ...result,
    count,
    rows: records
      .slice(0, take)
      .map((record) =>
        row(
          record.id,
          record.name,
          productLink(record.id, "publication", group),
        ),
      ),
    nextCursor: records.length > take ? records[take - 1].id : null,
  };
}
export async function getPriorityQueue(
  group: PriorityGroup,
  cursor?: string,
): Promise<PriorityQueue> {
  return prisma.$transaction((tx) => readQueue(tx, group, 20, cursor), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    timeout: 15000,
  });
}
export async function getPriorityBlock(
  block: PriorityBlock,
): Promise<PriorityQueue[]> {
  return prisma.$transaction(
    async (tx) => {
      const publicWhere =
        block === "catalog" ? await sellableProductWhere(tx) : undefined;
      return Promise.all(
        PRIORITY_BLOCKS[block].map((group) =>
          readQueue(tx, group, 2, undefined, publicWhere),
        ),
      );
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 15000,
    },
  );
}
