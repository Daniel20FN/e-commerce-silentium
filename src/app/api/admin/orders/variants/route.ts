import { orderVariantQuerySchema } from "@/domains/admin/orders/services/order_schemas";
import { searchOrderVariants } from "@/domains/admin/orders/services/order_service";
import type { OrderVariantsData } from "@/domains/admin/orders/types/api_params";
import { NextRequest } from "next/server";
import { parseRequestParams } from "../../products/_shared";
import { invalidOrder, orderRoute } from "../_shared";

export function GET(request: NextRequest) {
  return orderRoute<OrderVariantsData>(request, async () => {
    const input = orderVariantQuerySchema.safeParse(
      parseRequestParams(request),
    );
    if (!input.success) return invalidOrder();
    return searchOrderVariants(input.data);
  });
}
