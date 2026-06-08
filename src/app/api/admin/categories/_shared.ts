import type { AdminCategoryMutationError } from "@/domains/admin/categories/services/admin_category_mutations";
import type {
  AdminCategoryBulkActionApiResponse,
  AdminCategoryMutationApiResponse,
} from "@/domains/admin/categories/types/api_responses";
import { NextResponse } from "next/server";

type AdminCategoryRouteResponse =
  | AdminCategoryMutationApiResponse
  | AdminCategoryBulkActionApiResponse;

export function createCategoryJsonResponse<
  T extends AdminCategoryRouteResponse,
>(body: T, status = 200): NextResponse<T> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function mapCategoryMutationErrorStatus(
  type: AdminCategoryMutationError["type"],
): number {
  switch (type) {
    case "validation_error":
      return 400;
    case "conflict":
      return 409;
    case "not_found":
      return 404;
    case "invalid_state":
      return 422;
    default:
      return 500;
  }
}

export function isCategoryMutationError(
  error: unknown,
): error is AdminCategoryMutationError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("type" in error) || !("message" in error)) {
    return false;
  }

  return typeof error.type === "string" && typeof error.message === "string";
}
