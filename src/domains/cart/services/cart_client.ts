import { apiService } from "@/types/api-service/api_service";
import type {
  CartItem,
  CartQuote,
  ResolveCartParams,
  ResolveCartResponse,
} from "../types/api_params";

export async function fetchCartQuote(
  items: CartItem[],
  signal?: AbortSignal,
): Promise<CartQuote> {
  const result = await apiService.post<ResolveCartResponse, ResolveCartParams>(
    "/cart/resolve",
    { items },
    undefined,
    signal,
  );
  if (!result) throw new Error("cart_response_missing");
  return result;
}
