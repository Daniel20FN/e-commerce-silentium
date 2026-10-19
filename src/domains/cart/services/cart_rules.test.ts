import type { CartQuote } from "../types/api_params";
import {
  addCartItem,
  CART_KEY,
  MAX_CART_LINES,
  pricesChanged,
  readCart,
  resolveCartSchema,
} from "./cart_rules";

describe("cart rules and untrusted persistence", () => {
  it("has a versioned namespace and starts empty without recovery warning", () => {
    expect(CART_KEY).toContain("v1");
    expect(readCart(null)).toEqual({ items: [], recovered: false });
  });
  it.each([0, -1, 1.5, 100, Infinity, NaN])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(
        resolveCartSchema.safeParse({ items: [{ variantId: "v", quantity }] })
          .success,
      ).toBe(false);
    },
  );
  it("merges repeated variants but keeps different variants separate", () => {
    expect(
      addCartItem([{ variantId: "v", quantity: 2 }], {
        variantId: "v",
        quantity: 3,
      }),
    ).toEqual([{ variantId: "v", quantity: 5 }]);
    expect(
      addCartItem([{ variantId: "v", quantity: 2 }], {
        variantId: "other",
        quantity: 1,
      }),
    ).toHaveLength(2);
    expect(() =>
      addCartItem([{ variantId: "v", quantity: 99 }], {
        variantId: "v",
        quantity: 1,
      }),
    ).toThrow();
  });
  it("rejects duplicates, overposting, invalid IDs and excessive cart size", () => {
    for (const items of [
      [
        { variantId: "v", quantity: 1 },
        { variantId: "v", quantity: 2 },
      ],
      [{ variantId: "v", quantity: 1, priceCents: 1 }],
      [{ variantId: "../evil", quantity: 1 }],
      Array.from({ length: MAX_CART_LINES + 1 }, (_, i) => ({
        variantId: `v${i}`,
        quantity: 1,
      })),
    ])
      expect(resolveCartSchema.safeParse({ items }).success).toBe(false);
  });
  it.each(["bad", "null", '{"version":2,"items":[]}', '{"items":[]}'])(
    "safely recovers corrupt/unknown envelope %s",
    (raw) => expect(readCart(raw)).toEqual({ items: [], recovered: true }),
  );
  it("recovers only validated unique entries and never trusts prices", () => {
    expect(
      readCart(
        JSON.stringify({
          version: 1,
          items: [
            { variantId: "ok", quantity: 2 },
            { variantId: "ok", quantity: 3 },
            { variantId: "negative", quantity: -1 },
            { variantId: "priced", quantity: 1, priceCents: 99 },
          ],
        }),
      ),
    ).toEqual({ items: [{ variantId: "ok", quantity: 2 }], recovered: true });
  });
  it("flags changed authoritative prices, including zero", () => {
    const line = {
      variantId: "v",
      quantity: 1,
      status: "available",
      name: "x",
      sku: "s",
      slug: "x",
      attributes: null,
      image: null,
      priceCents: 0,
      subtotalCents: 0,
      maxQuantity: 2,
    } satisfies CartQuote["lines"][number];
    const quote = { lines: [line], valid: true, subtotalCents: 0 };
    expect(
      pricesChanged(quote, { ...quote, lines: [{ ...line, priceCents: 1 }] }),
    ).toBe(true);
    expect(pricesChanged(null, quote)).toBe(false);
    expect(pricesChanged(quote, quote)).toBe(false);
  });
});
