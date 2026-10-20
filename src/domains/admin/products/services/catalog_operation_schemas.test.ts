import {
  duplicateProductSchema,
  parsePricePesos,
  priceBatchSchema,
  pricePesosInput,
} from "./catalog_operation_schemas";

const row = {
  variantId: "variant",
  expectedUpdatedAt: "2026-10-20T00:00:00.000Z",
  priceCents: 123456,
  compareAtPriceCents: null,
};
const input = { expectedProductUpdatedAt: row.expectedUpdatedAt, rows: [row] };
it("parses COP without binary floating-point rounding or ambiguous thousands separators", () => {
  expect(parsePricePesos("1234,56")).toBe(123456);
  expect(parsePricePesos("0.01")).toBe(1);
  expect(parsePricePesos("9999999.99")).toBe(999999999);
  for (const value of [
    "",
    "-1",
    "1.234",
    "1,234.56",
    "1e3",
    "10000000",
    "Infinity",
  ])
    expect(parsePricePesos(value)).toBeNull();
  expect(pricePesosInput(123456)).toBe("1234.56");
  expect(pricePesosInput(0)).toBe("0.00");
});
it("requires revisions, exact nonnegative cents and greater compare-at, and rejects stock injection", () => {
  expect(priceBatchSchema.safeParse(input).success).toBe(true);
  for (const changed of [
    { ...row, priceCents: -1 },
    { ...row, priceCents: 1.5 },
    { ...row, compareAtPriceCents: 100 },
    { ...row, stock: 50 },
    { ...row, expectedUpdatedAt: "" },
  ])
    expect(
      priceBatchSchema.safeParse({ ...input, rows: [changed] }).success,
    ).toBe(false);
});
it("bounds atomic batches and rejects duplicate rows", () => {
  expect(priceBatchSchema.safeParse({ ...input, rows: [] }).success).toBe(
    false,
  );
  expect(
    priceBatchSchema.safeParse({ ...input, rows: [row, row] }).success,
  ).toBe(false);
  expect(
    priceBatchSchema.safeParse({
      ...input,
      rows: Array.from({ length: 51 }, (_, i) => ({
        ...row,
        variantId: String(i),
      })),
    }).success,
  ).toBe(false);
});
it("binds a duplication intent and never accepts client-supplied destination stock/SKU/image paths", () => {
  const copy = {
    operationId: "b72a888e-4a62-4af9-8efc-fc5baed75624",
    expectedUpdatedAt: row.expectedUpdatedAt,
    copyCosts: false,
  };
  expect(duplicateProductSchema.safeParse(copy).success).toBe(true);
  expect(duplicateProductSchema.safeParse({ ...copy, stock: 99 }).success).toBe(
    false,
  );
  expect(
    duplicateProductSchema.safeParse({ ...copy, copyCosts: "true" }).success,
  ).toBe(false);
  expect(
    duplicateProductSchema.safeParse({ ...copy, operationId: "guess" }).success,
  ).toBe(false);
});
