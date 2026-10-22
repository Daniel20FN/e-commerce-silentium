import type { ApiResponse } from "@/types/api-service/api_response";

export type InventoryKind = "entry" | "exit" | "count" | "reversal";
export interface InventoryRowParams {
  variantId: string;
  expectedRevision: number;
  quantity: number;
  reason: string;
  reference?: string;
  reversesId?: string;
}
export interface InventoryMutationParams {
  operationId: string;
  kind: InventoryKind;
  rows: InventoryRowParams[];
}
export interface InventoryMinimumParams {
  operationId: string;
  variantId: string;
  expectedRevision: number;
  minimum: number | null;
}
export interface InventoryQueryParams {
  variantId?: string;
  type?: InventoryKind | "initial" | "maintenance";
  from?: string;
  to?: string;
  reference?: string;
  cursor?: string;
}
export interface InventoryVariantDto {
  id: string;
  sku: string;
  stock: number;
  revision: number;
  minimum: number | null;
  inTrash: boolean;
  active: boolean;
}
export interface InventoryMovementDto {
  id: string;
  variantId: string;
  sku: string;
  type: InventoryQueryParams["type"];
  delta: number;
  before: number;
  after: number;
  actorLabel: string | null;
  reason: string;
  reference: string | null;
  reversedById: string | null;
  orderLinked?: boolean;
  createdAt: string;
}
export interface InventoryData {
  readOnly: boolean;
  variants: InventoryVariantDto[];
  movements: InventoryMovementDto[];
  nextCursor: string | null;
}
export type InventoryApiResponse = ApiResponse<InventoryData>;
export type InventoryMutationApiResponse = ApiResponse<{ operationId: string }>;
