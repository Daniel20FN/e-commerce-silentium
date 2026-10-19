import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import "server-only";
import type {
  CatalogCostDto,
  CatalogCostInput,
  CatalogCostLifecycle,
  CatalogCostsData,
  CatalogCostUpdate,
} from "../types/api_params";
import { summarizeCosts } from "./cost_rules";
import {
  costIdSchema,
  costInputSchema,
  costLifecycleSchema,
  costUpdateSchema,
} from "./cost_schemas";

export class CatalogCostError extends Error {
  constructor(
    public readonly type:
      | "validation_error"
      | "not_found"
      | "conflict"
      | "invalid_state",
    message: string,
  ) {
    super(message);
  }
}

type Db = Pick<
  Prisma.TransactionClient,
  "product" | "productVariant" | "catalogCost" | "$queryRaw"
>;
const costSelect = {
  id: true,
  variantId: true,
  name: true,
  description: true,
  amountCents: true,
  deletedAt: true,
  updatedAt: true,
} satisfies Prisma.CatalogCostSelect;

async function snapshot(productId: string, db: Db): Promise<CatalogCostsData> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, deletedAt: true, archivedAt: true },
  });
  if (!product) throw new CatalogCostError("not_found", "cost_not_found");
  const [records, variants] = await Promise.all([
    db.catalogCost.findMany({
      where: { productId },
      select: costSelect,
      orderBy: [{ amountCents: "desc" }, { name: "asc" }, { id: "asc" }],
    }),
    db.productVariant.findMany({
      where: { productId },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        sku: true,
        priceCents: true,
        isActive: true,
        deletedAt: true,
        optionValues: {
          select: {
            optionValue: {
              select: { value: true, option: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);
  const items: CatalogCostDto[] = records.map(
    ({ updatedAt, deletedAt, ...record }) => ({
      ...record,
      deletedAt: deletedAt?.toISOString() ?? null,
      revision: updatedAt.toISOString(),
    }),
  );
  return {
    items,
    writable: !product.deletedAt && !product.archivedAt,
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      label: v.optionValues
        .map((o) => `${o.optionValue.option.name}: ${o.optionValue.value}`)
        .join(" · "),
      priceCents: v.priceCents,
      active: v.isActive,
      inTrash: v.deletedAt !== null,
    })),
    summaries: Object.fromEntries(
      variants.map((v) => [v.id, summarizeCosts(items, v.id, v.priceCents)]),
    ),
  };
}

export async function getCatalogCosts(
  productId: string,
): Promise<CatalogCostsData> {
  if (!costIdSchema.safeParse(productId).success)
    throw new CatalogCostError("validation_error", "cost_invalid");
  return prisma.$transaction((db) => snapshot(productId, db), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
}

async function lockTarget(
  productId: string,
  variantId: string | null,
  db: Db,
): Promise<void> {
  const products = await db.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Product" WHERE "id" = ${productId} AND "deletedAt" IS NULL AND "archivedAt" IS NULL FOR UPDATE`;
  if (!products.length)
    throw new CatalogCostError("invalid_state", "cost_parent_unavailable");
  if (variantId) {
    const variants = await db.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "ProductVariant" WHERE "id" = ${variantId} AND "productId" = ${productId} AND "deletedAt" IS NULL FOR UPDATE`;
    if (!variants.length)
      throw new CatalogCostError("not_found", "cost_variant_unavailable");
  }
}

export async function createCatalogCost(
  productId: string,
  input: CatalogCostInput,
): Promise<CatalogCostsData> {
  const parsed = costInputSchema.safeParse(input);
  if (!costIdSchema.safeParse(productId).success || !parsed.success)
    throw new CatalogCostError("validation_error", "cost_invalid");
  return prisma.$transaction(async (db) => {
    await lockTarget(productId, parsed.data.variantId, db);
    await db.catalogCost.create({ data: { ...parsed.data, productId } });
    return snapshot(productId, db);
  });
}

async function currentCost(
  productId: string,
  id: string,
  revision: string,
  db: Db,
) {
  const current = await db.catalogCost.findFirst({
    where: { id, productId },
    select: costSelect,
  });
  if (!current) throw new CatalogCostError("not_found", "cost_not_found");
  if (current.updatedAt.toISOString() !== revision)
    throw new CatalogCostError("conflict", "cost_conflict");
  return current;
}

export async function updateCatalogCost(
  productId: string,
  input: CatalogCostUpdate,
): Promise<CatalogCostsData> {
  const parsed = costUpdateSchema.safeParse(input);
  if (!parsed.success || !costIdSchema.safeParse(productId).success)
    throw new CatalogCostError("validation_error", "cost_invalid");
  const { id, revision, ...data } = parsed.data;
  return prisma.$transaction(async (db) => {
    await lockTarget(productId, null, db);
    const current = await currentCost(productId, id, revision, db);
    if (current.deletedAt)
      throw new CatalogCostError("invalid_state", "cost_restore_first");
    await lockTarget(productId, current.variantId, db);
    await lockTarget(productId, data.variantId, db);
    await db.catalogCost.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(
          Math.max(Date.now(), current.updatedAt.getTime() + 1),
        ),
      },
    });
    return snapshot(productId, db);
  });
}

export async function changeCatalogCostState(
  productId: string,
  input: CatalogCostLifecycle,
): Promise<CatalogCostsData> {
  const parsed = costLifecycleSchema.safeParse(input);
  if (!parsed.success || !costIdSchema.safeParse(productId).success)
    throw new CatalogCostError("validation_error", "cost_invalid");
  return prisma.$transaction(async (db) => {
    await lockTarget(productId, null, db);
    const current = await currentCost(
      productId,
      parsed.data.id,
      parsed.data.revision,
      db,
    );
    await lockTarget(productId, current.variantId, db);
    if ((parsed.data.action === "restore") !== (current.deletedAt !== null))
      throw new CatalogCostError("invalid_state", "cost_invalid_state");
    const now = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
    await db.catalogCost.update({
      where: { id: current.id },
      data: {
        deletedAt: parsed.data.action === "trash" ? now : null,
        updatedAt: now,
      },
    });
    return snapshot(productId, db);
  });
}
