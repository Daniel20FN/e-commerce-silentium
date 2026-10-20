import type { AdminDuplicateProductParams } from "../types/api_params";
import { duplicateProductSchema } from "./catalog_operation_schemas";

const key = (productId: string) => `catalog-duplication:${productId}`;

export function readDuplicateIntent(
  productId: string,
): AdminDuplicateProductParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(productId));
    if (!raw) return null;
    const parsed = duplicateProductSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function storeDuplicateIntent(
  productId: string,
  intent: AdminDuplicateProductParams | null,
): void {
  try {
    if (intent) sessionStorage.setItem(key(productId), JSON.stringify(intent));
    else sessionStorage.removeItem(key(productId));
  } catch {
    // The in-memory intent still protects retries when browser storage is unavailable.
  }
}
