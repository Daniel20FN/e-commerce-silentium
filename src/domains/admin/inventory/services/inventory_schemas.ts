import { z } from "zod";

const id = z.string().trim().min(1).max(191);
const quantity = z.number().int().min(0).max(999999999);
const revision = z.number().int().min(0).max(2147483646);
export const inventoryMutationSchema = z
  .object({
    operationId: z.uuid(),
    kind: z.enum(["entry", "exit", "count", "reversal"]),
    rows: z
      .array(
        z
          .object({
            variantId: id,
            expectedRevision: revision,
            quantity,
            reason: z.string().trim().min(3).max(500),
            reference: z.string().trim().max(120).optional(),
            reversesId: id.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      new Set(input.rows.map((row) => row.variantId)).size !== input.rows.length
    )
      ctx.addIssue({ code: "custom", message: "inventory_duplicate_variant" });
    input.rows.forEach((row, index) => {
      if (
        (input.kind === "entry" || input.kind === "exit") &&
        row.quantity === 0
      )
        ctx.addIssue({
          code: "custom",
          message: "inventory_quantity_invalid",
          path: ["rows", index, "quantity"],
        });
      if ((input.kind === "reversal") !== !!row.reversesId)
        ctx.addIssue({
          code: "custom",
          message: "inventory_reversal_invalid",
          path: ["rows", index, "reversesId"],
        });
    });
  });
export const inventoryMinimumSchema = z
  .object({
    operationId: z.uuid(),
    variantId: id,
    expectedRevision: revision,
    minimum: quantity.nullable(),
  })
  .strict();
export const inventoryQuerySchema = z
  .object({
    variantId: id.optional(),
    type: z
      .enum(["initial", "entry", "exit", "count", "reversal", "maintenance"])
      .optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    reference: z.string().trim().max(120).optional(),
    cursor: id.optional(),
  })
  .strict()
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    message: "inventory_date_invalid",
  });
