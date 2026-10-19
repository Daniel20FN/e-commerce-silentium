import type { StorefrontImage } from "@/domains/storefront/types/catalog";
import type { ApiResponse } from "@/types/api-service/api_response";

export interface CartItem {
  variantId: string;
  quantity: number;
}
export interface ResolveCartParams {
  items: CartItem[];
}
export interface CartLine extends CartItem {
  status: "available" | "unavailable" | "insufficient_stock";
  name: string | null;
  sku: string | null;
  attributes: string | null;
  slug: string | null;
  image: StorefrontImage | null;
  priceCents: number | null;
  subtotalCents: number | null;
  maxQuantity: number;
}
export interface CartQuote {
  lines: CartLine[];
  subtotalCents: number;
  valid: boolean;
}
export type ResolveCartResponse = ApiResponse<CartQuote>;
export interface CartContact {
  phone: string;
  publicOrigin: string | null;
}
