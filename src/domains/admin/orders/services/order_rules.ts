import type {
  OrderDelivery,
  OrderFulfillment,
  OrderStatus,
} from "../types/api_params";

export const PREPARATION_FULFILLMENTS: OrderFulfillment[] = [
  "pending",
  "preparing",
];
export const DELIVERY_FULFILLMENTS: OrderFulfillment[] = ["ready", "shipped"];
export const OPEN_FULFILLMENTS: OrderFulfillment[] = [
  ...PREPARATION_FULFILLMENTS,
  ...DELIVERY_FULFILLMENTS,
];

export function canCancelOrder(
  status: OrderStatus,
  fulfillment: OrderFulfillment,
): boolean {
  return (
    status === "draft" ||
    (status === "confirmed" &&
      ["pending", "preparing", "ready"].includes(fulfillment))
  );
}
export function canReturnOrder(
  status: OrderStatus,
  delivery: OrderDelivery,
  fulfillment: OrderFulfillment,
): boolean {
  return (
    status === "confirmed" &&
    (fulfillment === "delivered" ||
      (delivery === "shipping" && fulfillment === "shipped"))
  );
}
export function canAdvanceFulfillment(
  status: OrderStatus,
  delivery: OrderDelivery,
  from: OrderFulfillment,
  to: OrderFulfillment,
): boolean {
  if (status !== "confirmed") return false;
  const sequence: OrderFulfillment[] = [
    "pending",
    "preparing",
    delivery === "shipping" ? "shipped" : "ready",
    "delivered",
  ];
  return (
    sequence.indexOf(from) >= 0 && sequence[sequence.indexOf(from) + 1] === to
  );
}
