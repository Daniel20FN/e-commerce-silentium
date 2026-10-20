import "server-only";

import {
  setInventoryContext,
  type InventoryActor,
} from "@/domains/admin/inventory/services/inventory_context";
import { prisma } from "@/lib/prisma";
import type {
  AdminVariantGenerationConfirmParams,
  AdminVariantGenerationPreviewParams,
} from "../types/api_params";
import type { AdminProductVariantDto } from "../types/product_dto";
import { buildOptionCombinationKey } from "./admin_product_rules";
import { createAdminVariant } from "./admin_variant_service";

export interface AdminVariantGenerationPreviewCombination {
  optionValueIds: string[];
  optionCombinationKey: string;
  label: string;
}

export interface AdminVariantGenerationPreviewResult {
  combinations: AdminVariantGenerationPreviewCombination[];
  duplicateCombinations: AdminVariantGenerationPreviewCombination[];
}

export interface AdminVariantGenerationConfirmResult {
  created: AdminProductVariantDto[];
  skippedDuplicateCombinationKeys: string[];
}

interface ProductOptionValueRecord {
  id: string;
  value: string;
  displayOrder: number;
}

interface ProductOptionRecord {
  id: string;
  productId: string;
  name: string;
  values: ProductOptionValueRecord[];
}

interface ExistingCombinationRecord {
  optionCombinationKey: string;
}

interface CombinationSeed {
  optionValueIds: string[];
  labelParts: string[];
}

function createGenerationError(message: string): Error {
  return new Error(message);
}

function combineOptions(options: ProductOptionRecord[]): CombinationSeed[] {
  return options.reduce<CombinationSeed[]>(
    (combinations, option) =>
      combinations.flatMap((combination) =>
        option.values.map((value) => ({
          optionValueIds: [...combination.optionValueIds, value.id],
          labelParts: [
            ...combination.labelParts,
            `${option.name}: ${value.value}`,
          ],
        })),
      ),
    [{ optionValueIds: [], labelParts: [] }],
  );
}

async function getExistingCombinationKeys(
  productId: string,
  combinationKeys?: string[],
): Promise<Set<string>> {
  const existing = (await prisma.productVariant.findMany({
    where: {
      productId,
      ...(combinationKeys
        ? { optionCombinationKey: { in: combinationKeys } }
        : {}),
    },
    select: { optionCombinationKey: true },
  })) as ExistingCombinationRecord[];

  return new Set(existing.map((variant) => variant.optionCombinationKey));
}

export async function previewAdminVariantGeneration(
  productId: string,
  input: AdminVariantGenerationPreviewParams,
): Promise<AdminVariantGenerationPreviewResult> {
  const options = (await prisma.productOption.findMany({
    where: {
      productId,
      id: { in: input.optionIds },
    },
    include: {
      values: {
        orderBy: [{ displayOrder: "asc" }, { value: "asc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  })) as ProductOptionRecord[];

  if (options.length !== input.optionIds.length) {
    throw createGenerationError("variant_generation_option_invalid");
  }

  if (options.some((option) => option.values.length === 0)) {
    throw createGenerationError("variant_generation_option_without_values");
  }

  const generatedCombinations = combineOptions(options).map((combination) => ({
    optionValueIds: combination.optionValueIds,
    optionCombinationKey: buildOptionCombinationKey(combination.optionValueIds),
    label: combination.labelParts.join(" / "),
  }));
  const existingCombinationKeys = await getExistingCombinationKeys(
    productId,
    generatedCombinations.map(
      (combination) => combination.optionCombinationKey,
    ),
  );

  return {
    combinations: generatedCombinations.filter(
      (combination) =>
        !existingCombinationKeys.has(combination.optionCombinationKey),
    ),
    duplicateCombinations: generatedCombinations.filter((combination) =>
      existingCombinationKeys.has(combination.optionCombinationKey),
    ),
  };
}

export async function confirmAdminVariantGeneration(
  productId: string,
  input: AdminVariantGenerationConfirmParams,
  actor?: InventoryActor,
): Promise<AdminVariantGenerationConfirmResult> {
  const requestedCombinationKeys = input.variants.map((variant) =>
    buildOptionCombinationKey(variant.optionValueIds),
  );
  const existingCombinationKeys = await getExistingCombinationKeys(
    productId,
    requestedCombinationKeys,
  );
  const created: AdminProductVariantDto[] = [];
  const skippedDuplicateCombinationKeys: string[] = [];
  const variantsToCreate: AdminVariantGenerationConfirmParams["variants"] = [];

  for (const variant of input.variants) {
    const combinationKey = buildOptionCombinationKey(variant.optionValueIds);

    if (existingCombinationKeys.has(combinationKey)) {
      skippedDuplicateCombinationKeys.push(combinationKey);
      continue;
    }

    variantsToCreate.push(variant);
    existingCombinationKeys.add(combinationKey);
  }

  await prisma.$transaction(
    async (transaction) => {
      if (actor)
        await transaction.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${productId} FOR UPDATE`;
      if (actor)
        await setInventoryContext(transaction, {
          type: "initial",
          actorId: actor.id,
          actorLabel: actor.label,
          reason: "inventory_generated",
        });
      for (const variant of variantsToCreate) {
        created.push(await createAdminVariant(productId, variant, transaction));
      }
    },
    { timeout: 30000 },
  );

  return {
    created,
    skippedDuplicateCombinationKeys,
  };
}
