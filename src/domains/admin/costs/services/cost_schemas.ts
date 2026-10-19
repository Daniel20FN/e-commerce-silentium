import { z } from "zod";
import { MAX_COST_CENTS } from "./cost_rules";

export const costIdSchema = z.string().trim().min(1).max(128);
const revision = z.string().datetime();
export const costInputSchema = z
  .object({
    variantId: costIdSchema.nullable(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).nullable(),
    amountCents: z.number().int().min(0).max(MAX_COST_CENTS),
  })
  .strict();
export const costUpdateSchema = costInputSchema
  .extend({ id: costIdSchema, revision })
  .strict();
export const costLifecycleSchema = z
  .object({ id: costIdSchema, revision, action: z.enum(["trash", "restore"]) })
  .strict();
