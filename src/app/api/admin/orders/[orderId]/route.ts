import {
  orderMutationSchema,
  saveOrderDraftSchema,
} from "@/domains/admin/orders/services/order_schemas";
import {
  getOrder,
  mutateOrder,
  saveOrderDraft,
} from "@/domains/admin/orders/services/order_service";
import type {
  OrderDetailDto,
  OrderMutationResult,
} from "@/domains/admin/orders/types/api_params";
import { NextRequest } from "next/server";
import { invalidOrder, orderJson, orderRoute } from "../_shared";

type Props = { params: Promise<{ orderId: string }> };

export function GET(request: NextRequest, { params }: Props) {
  return orderRoute<OrderDetailDto>(request, async () => {
    const { orderId } = await params;
    return getOrder(orderId);
  });
}

export function PUT(request: NextRequest, { params }: Props) {
  return orderRoute<OrderMutationResult>(request, async (actor) => {
    const input = saveOrderDraftSchema.safeParse(await orderJson(request));
    if (!input.success) return invalidOrder();
    const { orderId } = await params;
    return saveOrderDraft(orderId, input.data, actor);
  });
}

export function POST(request: NextRequest, { params }: Props) {
  return orderRoute<OrderMutationResult>(request, async (actor) => {
    const input = orderMutationSchema.safeParse(await orderJson(request));
    if (!input.success) return invalidOrder();
    const { orderId } = await params;
    return mutateOrder(orderId, input.data, actor);
  });
}
