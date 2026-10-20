import {
  inventoryMinimumSchema,
  inventoryMutationSchema,
} from "./inventory_schemas";
const input = {
  operationId: "a48273ef-08be-4cb8-8cbb-4d927349b30a",
  kind: "entry",
  rows: [
    {
      variantId: "variant",
      expectedRevision: 0,
      quantity: 2,
      reason: "Entrega QA",
    },
  ],
};
test("validates integer nonnegative quantities and bounded nonduplicated batch", () => {
  expect(inventoryMutationSchema.safeParse(input).success).toBe(true);
  for (const quantity of [-1, 0, 1.1, 1000000000])
    expect(
      inventoryMutationSchema.safeParse({
        ...input,
        rows: [{ ...input.rows[0], quantity }],
      }).success,
    ).toBe(false);
  expect(
    inventoryMutationSchema.safeParse({
      ...input,
      rows: [...input.rows, ...input.rows],
    }).success,
  ).toBe(false);
  expect(
    inventoryMutationSchema.safeParse({ ...input, actorId: "forged" }).success,
  ).toBe(false);
  expect(
    inventoryMutationSchema.safeParse({
      ...input,
      rows: Array.from({ length: 26 }, (_, i) => ({
        ...input.rows[0],
        variantId: String(i),
      })),
    }).success,
  ).toBe(false);
});
test("count zero and optional minimum zero/null are explicit, reversals need a linked movement", () => {
  expect(
    inventoryMutationSchema.safeParse({
      ...input,
      kind: "count",
      rows: [{ ...input.rows[0], quantity: 0 }],
    }).success,
  ).toBe(true);
  expect(
    inventoryMutationSchema.safeParse({ ...input, kind: "reversal" }).success,
  ).toBe(false);
  for (const minimum of [null, 0, 3])
    expect(
      inventoryMinimumSchema.safeParse({
        operationId: input.operationId,
        variantId: "v",
        expectedRevision: 0,
        minimum,
      }).success,
    ).toBe(true);
});
