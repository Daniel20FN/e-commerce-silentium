import {
  canAdvanceFulfillment,
  canCancelOrder,
  canReturnOrder,
} from "./order_rules";
import {
  createOrderSchema,
  MAX_ORDER_TOTAL,
  orderMutationSchema,
} from "./order_schemas";

describe("manual order policy", () => {
  test.each(["draft", "confirmed"] as const)(
    "cancels %s before physical exit",
    (status) => {
      expect(canCancelOrder(status, "pending")).toBe(true);
    },
  );
  test("pickup ready is cancellable but not returnable", () => {
    expect(canCancelOrder("confirmed", "ready")).toBe(true);
    expect(canReturnOrder("confirmed", "pickup", "ready")).toBe(false);
  });
  test.each(["shipped", "delivered"] as const)(
    "physical exit %s cannot be cancelled",
    (fulfillment) => {
      expect(canCancelOrder("confirmed", fulfillment)).toBe(false);
      expect(canReturnOrder("confirmed", "shipping", fulfillment)).toBe(true);
    },
  );
  test("cancelled orders cannot return; payment is not involved", () => {
    expect(canCancelOrder("cancelled", "pending")).toBe(false);
    expect(canReturnOrder("cancelled", "shipping", "delivered")).toBe(false);
    expect(canReturnOrder("confirmed", "pickup", "delivered")).toBe(true);
  });
  test("fulfillment follows delivery-specific ordered steps only", () => {
    expect(
      canAdvanceFulfillment("draft", "shipping", "pending", "preparing"),
    ).toBe(false);
    expect(
      canAdvanceFulfillment("confirmed", "shipping", "pending", "preparing"),
    ).toBe(true);
    expect(
      canAdvanceFulfillment("confirmed", "shipping", "pending", "shipped"),
    ).toBe(false);
    expect(
      canAdvanceFulfillment("confirmed", "shipping", "preparing", "ready"),
    ).toBe(false);
    expect(
      canAdvanceFulfillment("confirmed", "pickup", "preparing", "ready"),
    ).toBe(true);
    expect(
      canAdvanceFulfillment("confirmed", "pickup", "ready", "delivered"),
    ).toBe(true);
    expect(
      canAdvanceFulfillment("confirmed", "shipping", "shipped", "preparing"),
    ).toBe(false);
  });
});
describe("manual order strict contracts", () => {
  const draft = {
    operationId: "9d5ddc40-73e0-40da-aefa-227400a07ca4",
    customerName: "QA Client",
    customerPhone: "+573000000000",
    delivery: "shipping",
    address: "QA only address",
    shippingCents: 1000,
    lines: [
      {
        variantId: "variant-one",
        quantity: 2,
        unitPriceCents: 100000,
        catalogPriceCents: 100000,
      },
    ],
  };
  test("valid draft keeps exact integer COP amounts", () =>
    expect(createOrderSchema.parse(draft)).toEqual(draft));
  test("requires name phone and shipping address", () => {
    expect(
      createOrderSchema.safeParse({ ...draft, customerName: "" }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({ ...draft, customerPhone: "not-a-phone" })
        .success,
    ).toBe(false);
    expect(createOrderSchema.safeParse({ ...draft, address: "" }).success).toBe(
      false,
    );
    expect(
      createOrderSchema.safeParse({
        ...draft,
        delivery: "pickup",
        address: undefined,
        shippingCents: 0,
      }).success,
    ).toBe(true);
  });
  test("pickup cannot carry a shipping charge", () => {
    expect(
      createOrderSchema.safeParse({
        ...draft,
        delivery: "pickup",
        address: undefined,
      }).success,
    ).toBe(false);
  });
  test("negotiation requires reason, never implicit discount", () => {
    expect(
      createOrderSchema.safeParse({
        ...draft,
        lines: [{ ...draft.lines[0], unitPriceCents: 90000 }],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...draft,
        lines: [
          {
            ...draft.lines[0],
            unitPriceCents: 90000,
            priceReason: "Acuerdo por WhatsApp",
          },
        ],
      }).success,
    ).toBe(true);
  });
  test("bounds and distinct variants protect all-or-nothing operations", () => {
    for (const lines of [
      [draft.lines[0], draft.lines[0]],
      [],
      Array.from({ length: 26 }, (_, i) => ({
        ...draft.lines[0],
        variantId: `id${i}`,
      })),
      [{ ...draft.lines[0], quantity: 0 }],
      [{ ...draft.lines[0], quantity: 1.5 }],
      [{ ...draft.lines[0], quantity: 999999999 }],
    ])
      expect(createOrderSchema.safeParse({ ...draft, lines }).success).toBe(
        false,
      );
    expect(MAX_ORDER_TOTAL).toBe(2147483647);
    expect(
      createOrderSchema.safeParse({ ...draft, unexpected: "costs" }).success,
    ).toBe(false);
  });
  test("return rows distinguish received from resellable with reason", () => {
    const base = {
      operationId: draft.operationId,
      expectedRevision: 0,
      kind: "return",
      reason: "Recepción física",
      rows: [{ lineId: "line-one", received: 2, resellable: 1 }],
    };
    expect(orderMutationSchema.safeParse(base).success).toBe(true);
    expect(
      orderMutationSchema.safeParse({
        ...base,
        rows: [{ lineId: "line-one", received: 1, resellable: 2 }],
      }).success,
    ).toBe(false);
    expect(
      orderMutationSchema.safeParse({
        ...base,
        rows: [base.rows[0], base.rows[0]],
      }).success,
    ).toBe(false);
    expect(orderMutationSchema.safeParse({ ...base, reason: "" }).success).toBe(
      false,
    );
  });
  test("mutations require revision UUID and known shape", () => {
    expect(
      orderMutationSchema.safeParse({
        operationId: draft.operationId,
        expectedRevision: 0,
        kind: "confirm",
      }).success,
    ).toBe(true);
    expect(
      orderMutationSchema.safeParse({
        operationId: "bad",
        expectedRevision: 0,
        kind: "confirm",
      }).success,
    ).toBe(false);
    expect(
      orderMutationSchema.safeParse({
        operationId: draft.operationId,
        kind: "confirm",
      }).success,
    ).toBe(false);
    expect(
      orderMutationSchema.safeParse({
        operationId: draft.operationId,
        expectedRevision: 0,
        kind: "confirm",
        stock: 7,
      }).success,
    ).toBe(false);
  });
});
