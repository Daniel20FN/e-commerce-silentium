import { parseCostPesos, summarizeCosts } from "./cost_rules";
import { costInputSchema, costUpdateSchema } from "./cost_schemas";

describe("per-unit COP costs", () => {
  const general = { variantId: null, amountCents: 7000000, deletedAt: null };
  const specific = {
    variantId: "double",
    amountCents: 1000000,
    deletedAt: null,
  };
  it("adds full common costs to each variant, never divides by stock or variant count", () => {
    expect(summarizeCosts([general, specific], "double", 10000000)).toEqual({
      generalCents: 7000000,
      specificCents: 1000000,
      totalCents: 8000000,
      marginCents: 2000000,
      marginPercent: 20,
      hasCosts: true,
    });
    expect(
      summarizeCosts([general, specific], "single", 10000000).totalCents,
    ).toBe(7000000);
  });
  it("excludes trash and unrelated variant costs", () => {
    expect(
      summarizeCosts(
        [specific, { ...general, deletedAt: "2026-10-19" }],
        "single",
        0,
      ),
    ).toMatchObject({ totalCents: 0, hasCosts: false, marginPercent: null });
  });
  it("keeps negative margins and does not invent a zero-price percentage", () => {
    expect(summarizeCosts([general], "single", 5000000)).toMatchObject({
      marginCents: -2000000,
      marginPercent: -40,
    });
    expect(summarizeCosts([general], "single", 0).marginPercent).toBeNull();
  });
  it("distinguishes explicit zero costs from no costs", () => {
    expect(
      summarizeCosts([{ ...general, amountCents: 0 }], "single", 0).hasCosts,
    ).toBe(true);
  });
  it.each([
    ["50000", 5000000],
    ["0", 0],
    ["12,34", 1234],
    ["12.3", 1230],
    ["21474836.47", 2147483647],
  ])("parses pesos %s exactly", (value, expected) =>
    expect(parseCostPesos(String(value))).toBe(expected),
  );
  it.each(["-1", "1e3", "12.345", "1.000,00", "Infinity", "", "21474836.48"])(
    "rejects ambiguous/invalid %s",
    (value) => expect(parseCostPesos(value)).toBeNull(),
  );
  const valid = {
    variantId: null,
    name: "Tela",
    description: null,
    amountCents: 100,
  };
  it("validates strict integer cents and trimmed names", () => {
    expect(costInputSchema.parse({ ...valid, name: " Tela " }).name).toBe(
      "Tela",
    );
    for (const patch of [
      { amountCents: -1 },
      { amountCents: 1.5 },
      { name: " " },
      { extra: true },
      { variantId: "" },
    ])
      expect(costInputSchema.safeParse({ ...valid, ...patch }).success).toBe(
        false,
      );
    expect(
      costUpdateSchema.safeParse({ ...valid, id: "c", revision: "invalid" })
        .success,
    ).toBe(false);
  });
});
