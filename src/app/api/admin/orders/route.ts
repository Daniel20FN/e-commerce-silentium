import {
  createOrderSchema,
  ordersQuerySchema,
} from "@/domains/admin/orders/services/order_schemas";
import {
  createOrder,
  listOrders,
} from "@/domains/admin/orders/services/order_service";
import type {
  OrderMutationResult,
  OrdersData,
} from "@/domains/admin/orders/types/api_params";
import { NextRequest } from "next/server";
import { parseRequestParams } from "../products/_shared";
import { invalidOrder, orderJson, orderRoute } from "./_shared";

export function GET(request: NextRequest) {
  return orderRoute<OrdersData>(request, async () => {
    const input = ordersQuerySchema.safeParse(parseRequestParams(request));
    if (!input.success) return invalidOrder();
    return listOrders(input.data);
  });
}

export function POST(request: NextRequest) {
  return orderRoute<OrderMutationResult>(request, async (actor) => {
    const input = createOrderSchema.safeParse(await orderJson(request));
    if (!input.success) return invalidOrder();
    return createOrder(input.data, actor);
  });
}
