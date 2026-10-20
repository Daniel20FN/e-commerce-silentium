import "server-only";

import {
  setInventoryContext,
  type InventoryActor,
} from "@/domains/admin/inventory/services/inventory_context";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { AdminVariantUpsertParams } from "../types/api_params";
import type { AdminProductVariantDto } from "../types/product_dto";
import type {
  AdminProductErrorCode,
  AdminProductRuleError,
} from "../types/product_errors";
import {
  assertCompareAtPrice,
  assertVariantCombinationAvailable,
  assertVariantSkuAvailable,
  buildValidatedOptionCombinationKey,
  type ProductOptionValueOwnership,
} from "./admin_product_rules";

export interface AdminVariantMutationError {
  type: "validation_error" | "conflict" | "not_found" | "invalid_state";
  message: string;
}

export interface AdminProductVariantsListParams {
  productId: string;
  includeTrash?: boolean;
}

export interface AdminProductVariantsListResult {
  items: AdminProductVariantDto[];
}

interface VariantRecord {
  id: string;
  productId: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  active?: boolean;
  isActive?: boolean;
  isDefault: boolean;
  displayOrder: number;
  weightGrams?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  lengthMm?: number | null;
  optionCombinationKey: string;
  optionValues?: Array<{
    optionValue: {
      id: string;
      value: string;
      option: {
        id: string;
        name: string;
        displayOrder: number;
      };
    };
  }>;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OptionValueRecord {
  id: string;
  option: {
    id: string;
    productId: string;
  };
}

interface VariantMutationOptions {
  now?: Date;
}

type AdminVariantPrismaClient = Pick<
  typeof prisma,
  "product" | "productVariant" | "productOptionValue"
>;

function createMutationError(
  type: AdminVariantMutationError["type"],
  message: string,
): AdminVariantMutationError {
  return { type, message };
}

function isRuleError(error: unknown): error is AdminProductRuleError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as AdminProductRuleError).code === "string"
  );
}

function mapRuleError(error: unknown): never {
  if (isRuleError(error)) {
    const conflictCodes: AdminProductErrorCode[] = [
      "variant_sku_conflict",
      "variant_combination_conflict",
    ];

    throw createMutationError(
      conflictCodes.includes(error.code) ? "conflict" : "validation_error",
      error.code,
    );
  }

  throw error;
}

function getVariantActive(variant: VariantRecord): boolean {
  return variant.active ?? variant.isActive ?? false;
}

function toAdminVariantDto(variant: VariantRecord): AdminProductVariantDto {
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    priceCents: variant.priceCents,
    compareAtPriceCents: variant.compareAtPriceCents,
    stock: variant.stock,
    active: getVariantActive(variant),
    isDefault: variant.isDefault,
    displayOrder: variant.displayOrder,
    weightGrams: variant.weightGrams ?? null,
    widthMm: variant.widthMm ?? null,
    heightMm: variant.heightMm ?? null,
    lengthMm: variant.lengthMm ?? null,
    optionValues: [...(variant.optionValues ?? [])]
      .sort(
        (left, right) =>
          left.optionValue.option.displayOrder -
          right.optionValue.option.displayOrder,
      )
      .map(({ optionValue }) => ({
        optionId: optionValue.option.id,
        optionName: optionValue.option.name,
        optionValueId: optionValue.id,
        optionValue: optionValue.value,
      })),
    inTrash: variant.deletedAt !== null,
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  };
}

const variantOptionValuesInclude = {
  optionValues: {
    include: {
      optionValue: {
        include: {
          option: true,
        },
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

async function assertProductExists(
  productId: string,
  db: AdminVariantPrismaClient,
): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, deletedAt: true, archivedAt: true },
  });

  if (!product) {
    throw createMutationError("not_found", "record_not_found");
  }
  if (product.deletedAt || product.archivedAt || product.status === "archived")
    throw createMutationError("invalid_state", "product_read_only");
}

async function assertSkuAvailable(
  sku: string,
  db: AdminVariantPrismaClient,
  variantId?: string,
): Promise<void> {
  const existingVariant = await db.productVariant.findUnique({
    where: { sku },
    select: { id: true },
  });

  try {
    assertVariantSkuAvailable({
      sku,
      existingVariantId: existingVariant?.id ?? null,
      currentVariantId: variantId,
    });
  } catch (error) {
    mapRuleError(error);
  }
}

async function loadOptionValueOwnership(
  optionValueIds: string[],
  db: AdminVariantPrismaClient,
): Promise<ProductOptionValueOwnership[]> {
  const optionValues = (await db.productOptionValue.findMany({
    where: { id: { in: optionValueIds } },
    select: {
      id: true,
      option: { select: { id: true, productId: true } },
    },
  })) as OptionValueRecord[];

  return optionValues.map((optionValue) => ({
    id: optionValue.id,
    productId: optionValue.option.productId,
    optionId: optionValue.option.id,
  }));
}

async function buildAvailableCombinationKey(
  input: {
    productId: string;
    optionValueIds: string[];
    variantId?: string;
    currentCombinationKey?: string;
  },
  db: AdminVariantPrismaClient,
): Promise<string> {
  const optionValues = await loadOptionValueOwnership(input.optionValueIds, db);
  const combinationKey = (() => {
    try {
      return buildValidatedOptionCombinationKey({
        productId: input.productId,
        optionValueIds: input.optionValueIds,
        optionValues,
      });
    } catch (error) {
      mapRuleError(error);
    }
  })();
  const existingVariants = (await db.productVariant.findMany({
    where: {
      productId: input.productId,
      optionCombinationKey: combinationKey,
      ...(input.variantId ? { id: { not: input.variantId } } : {}),
    },
    select: { optionCombinationKey: true },
  })) as { optionCombinationKey: string }[];

  try {
    assertVariantCombinationAvailable({
      productId: input.productId,
      optionValueIds: input.optionValueIds,
      optionValues,
      existingCombinationKeys: existingVariants.map(
        (variant) => variant.optionCombinationKey,
      ),
      currentCombinationKey: input.currentCombinationKey,
    });
  } catch (error) {
    mapRuleError(error);
  }

  return combinationKey;
}

function assertVariantPrices(input: AdminVariantUpsertParams): void {
  try {
    assertCompareAtPrice({
      priceCents: input.priceCents,
      compareAtPriceCents: input.compareAtPriceCents ?? null,
    });
  } catch (error) {
    mapRuleError(error);
  }
}

function buildVariantCreateData(
  productId: string,
  input: AdminVariantUpsertParams,
  optionCombinationKey: string,
): Prisma.ProductVariantCreateInput {
  return {
    product: { connect: { id: productId } },
    sku: input.sku,
    priceCents: input.priceCents,
    compareAtPriceCents: input.compareAtPriceCents ?? null,
    stock: input.stock,
    isActive: input.active,
    isDefault: input.isDefault,
    displayOrder: input.displayOrder,
    weightGrams: input.weightGrams ?? null,
    widthMm: input.widthMm ?? null,
    heightMm: input.heightMm ?? null,
    lengthMm: input.lengthMm ?? null,
    optionCombinationKey,
    optionValues: {
      create: input.optionValueIds.map((optionValueId) => ({
        optionValue: { connect: { id: optionValueId } },
      })),
    },
  };
}

function buildVariantUpdateData(
  input: AdminVariantUpsertParams,
  optionCombinationKey: string,
): Prisma.ProductVariantUpdateInput {
  return {
    sku: input.sku,
    priceCents: input.priceCents,
    compareAtPriceCents: input.compareAtPriceCents ?? null,
    isActive: input.active,
    isDefault: input.isDefault,
    displayOrder: input.displayOrder,
    weightGrams: input.weightGrams ?? null,
    widthMm: input.widthMm ?? null,
    heightMm: input.heightMm ?? null,
    lengthMm: input.lengthMm ?? null,
    optionCombinationKey,
    optionValues: {
      deleteMany: {},
      create: input.optionValueIds.map((optionValueId) => ({
        optionValue: { connect: { id: optionValueId } },
      })),
    },
  };
}

export async function listAdminProductVariants(
  params: AdminProductVariantsListParams,
): Promise<AdminProductVariantsListResult> {
  const variants = (await prisma.productVariant.findMany({
    where: {
      productId: params.productId,
      ...(params.includeTrash ? {} : { deletedAt: null }),
    },
    orderBy: [{ displayOrder: "asc" }, { sku: "asc" }],
    include: variantOptionValuesInclude,
  })) as VariantRecord[];

  return { items: variants.map(toAdminVariantDto) };
}

export async function listStorefrontSellableVariants(
  productId: string,
): Promise<AdminProductVariantDto[]> {
  const variants = (await prisma.productVariant.findMany({
    where: {
      productId,
      deletedAt: null,
      isActive: true,
      stock: { gt: 0 },
    },
    orderBy: [{ displayOrder: "asc" }, { sku: "asc" }],
    include: variantOptionValuesInclude,
  })) as VariantRecord[];

  return variants.map(toAdminVariantDto);
}

export async function createAdminVariant(
  productId: string,
  input: AdminVariantUpsertParams,
  db: AdminVariantPrismaClient = prisma,
  actor?: InventoryActor,
): Promise<AdminProductVariantDto> {
  if (actor)
    return prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${productId} FOR UPDATE`;
        await setInventoryContext(tx, {
          type: "initial",
          actorId: actor.id,
          actorLabel: actor.label,
          reason: "inventory_created",
        });
        return createAdminVariant(productId, input, tx);
      },
      { timeout: 15000 },
    );
  await assertProductExists(productId, db);
  await assertSkuAvailable(input.sku, db);
  assertVariantPrices(input);

  const optionCombinationKey = await buildAvailableCombinationKey(
    {
      productId,
      optionValueIds: input.optionValueIds,
    },
    db,
  );

  if (input.isDefault) {
    await db.productVariant.updateMany({
      where: { productId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const variant = (await db.productVariant.create({
    data: buildVariantCreateData(productId, input, optionCombinationKey),
    include: variantOptionValuesInclude,
  })) as VariantRecord;

  return toAdminVariantDto(variant);
}

export async function updateAdminVariant(
  productId: string,
  variantId: string,
  input: AdminVariantUpsertParams,
): Promise<AdminProductVariantDto> {
  return prisma.$transaction(async (tx) => {
    await assertProductExists(productId, tx);
    const currentVariant = (await tx.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
        optionCombinationKey: true,
        deletedAt: true,
        updatedAt: true,
        stock: true,
      },
    })) as Pick<
      VariantRecord,
      | "id"
      | "productId"
      | "optionCombinationKey"
      | "deletedAt"
      | "updatedAt"
      | "stock"
    > | null;

    if (!currentVariant || currentVariant.productId !== productId) {
      throw createMutationError("not_found", "record_not_found");
    }

    if (currentVariant.deletedAt)
      throw createMutationError("invalid_state", "variant_in_trash");
    if (input.stock !== currentVariant.stock)
      throw createMutationError("invalid_state", "inventory_use_movements");
    if (
      input.expectedUpdatedAt &&
      currentVariant.updatedAt.toISOString() !== input.expectedUpdatedAt
    )
      throw createMutationError("conflict", "variant_revision_conflict");
    await assertSkuAvailable(input.sku, tx, variantId);
    assertVariantPrices(input);

    const optionCombinationKey = await buildAvailableCombinationKey(
      {
        productId: currentVariant.productId,
        optionValueIds: input.optionValueIds,
        variantId,
        currentCombinationKey: currentVariant.optionCombinationKey,
      },
      tx,
    );

    if (input.isDefault) {
      await tx.productVariant.updateMany({
        where: {
          productId: currentVariant.productId,
          isDefault: true,
          id: { not: variantId },
        },
        data: { isDefault: false },
      });
    }

    let variant: VariantRecord;
    try {
      variant = (await tx.productVariant.update({
        where: {
          id: variantId,
          productId,
          deletedAt: null,
          product: {
            deletedAt: null,
            archivedAt: null,
            status: { not: "archived" },
          },
          ...(input.expectedUpdatedAt
            ? { updatedAt: new Date(input.expectedUpdatedAt) }
            : {}),
        },
        data: buildVariantUpdateData(input, optionCombinationKey),
        include: variantOptionValuesInclude,
      })) as VariantRecord;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      )
        throw createMutationError("conflict", "variant_revision_conflict");
      throw error;
    }
    return toAdminVariantDto(variant);
  });
}

export async function softDeleteAdminVariant(
  productId: string,
  variantId: string,
  options: VariantMutationOptions = {},
): Promise<AdminProductVariantDto> {
  const currentVariant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true },
  });

  if (!currentVariant || currentVariant.productId !== productId) {
    throw createMutationError("not_found", "record_not_found");
  }

  const variant = (await prisma.productVariant.update({
    where: { id: variantId, productId },
    data: { deletedAt: options.now ?? new Date() },
    include: variantOptionValuesInclude,
  })) as VariantRecord;

  return toAdminVariantDto(variant);
}

export async function restoreAdminVariant(
  productId: string,
  variantId: string,
): Promise<AdminProductVariantDto> {
  const currentVariant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true },
  });

  if (!currentVariant || currentVariant.productId !== productId) {
    throw createMutationError("not_found", "record_not_found");
  }

  const variant = (await prisma.productVariant.update({
    where: { id: variantId, productId },
    data: { deletedAt: null },
    include: variantOptionValuesInclude,
  })) as VariantRecord;

  return toAdminVariantDto(variant);
}
