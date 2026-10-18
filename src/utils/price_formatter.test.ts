import { priceFormatter } from "./price_formatter";
describe("Colombian peso formatting", () => {
  it("formats COP instead of EUR and retains a real zero price", () => {
    expect(priceFormatter(189000).replace(/\s/g, "")).toBe("$189.000");
    expect(priceFormatter(0).replace(/\s/g, "")).toBe("$0");
    expect(priceFormatter(null)).toBe("");
  });
  it("preserves fractional pesos when present", () => {
    expect(priceFormatter(1234.5).replace(/\s/g, "")).toBe("$1.234,5");
  });
});
