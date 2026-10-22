import type { ApiResponse } from "@/types/api-service/api_response";

export type OrderStatus = "draft" | "confirmed" | "cancelled";
export type OrderPayment = "pending" | "paid";
export type OrderDelivery = "shipping" | "pickup";
export type OrderFulfillment =
  | "pending"
  | "preparing"
  | "shipped"
  | "ready"
  | "delivered";
export type OrderEventKind =
  | "created"
  | "edited"
  | "confirmed"
  | "cancelled"
  | "payment"
  | "fulfillment"
  | "returned";
export interface OrderDraftLineParams {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
  catalogPriceCents: number;
  priceReason?: string;
}
export interface OrderDraftParams {
  customerName: string;
  customerPhone: string;
  delivery: OrderDelivery;
  address?: string;
  shippingCents: number;
  notes?: string;
  lines: OrderDraftLineParams[];
}
export interface CreateOrderParams extends OrderDraftParams {
  operationId: string;
}
export interface SaveOrderDraftParams extends CreateOrderParams {
  expectedRevision: number;
}
export interface OrderReturnRowParams {
  lineId: string;
  received: number;
  resellable: number;
}
export type OrderMutationParams = {
  operationId: string;
  expectedRevision: number;
} & (
  | { kind: "confirm" }
  | { kind: "cancel"; reason: string }
  | { kind: "payment"; payment: OrderPayment; reason?: string }
  | { kind: "fulfillment"; fulfillment: OrderFulfillment }
  | { kind: "return"; reason: string; rows: OrderReturnRowParams[] }
);
export interface OrdersQueryParams {
  search?: string;
  status?: OrderStatus;
  payment?: OrderPayment;
  fulfillment?: OrderFulfillment;
  cursor?: string;
}
export interface OrderVariantQueryParams {
  search?: string;
  cursor?: string;
}
export interface OrderVariantDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  attributes: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
}
export interface OrderLineDto {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  attributes: string;
  quantity: number;
  unitPriceCents: number;
  catalogPriceCents: number;
  priceReason: string | null;
  received: number;
  resellable: number;
}
export interface OrderSummaryDto {
  id: string;
  number: number;
  revision: number;
  status: OrderStatus;
  payment: OrderPayment;
  delivery: OrderDelivery;
  fulfillment: OrderFulfillment;
  customerName: string;
  customerPhone: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}
export interface OrderEventDto {
  id: string;
  kind: OrderEventKind;
  actorLabel: string;
  reason: string | null;
  from: string | null;
  to: string | null;
  createdAt: string;
  returns: { lineId: string; received: number; resellable: number }[];
}
export interface OrderDetailDto extends OrderSummaryDto {
  address: string | null;
  notes: string | null;
  createdByLabel: string;
  lines: OrderLineDto[];
  events: OrderEventDto[];
}
export interface OrdersData {
  orders: OrderSummaryDto[];
  nextCursor: string | null;
}
export interface OrderVariantsData {
  variants: OrderVariantDto[];
  nextCursor: string | null;
}
export interface OrderMutationResult {
  orderId: string;
  operationId: string;
}
export type OrdersApiResponse = ApiResponse<OrdersData>;
export type OrderApiResponse = ApiResponse<OrderDetailDto>;
export type OrderVariantsApiResponse = ApiResponse<OrderVariantsData>;
export type OrderMutationApiResponse = ApiResponse<OrderMutationResult>;
