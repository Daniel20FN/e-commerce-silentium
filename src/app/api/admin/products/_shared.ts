import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api-service/api_response";
import { NextRequest, NextResponse } from "next/server";

const PRODUCT_ROUTE_ERROR_TYPE = {
  VALIDATION_ERROR: "validation_error",
  CONFLICT: "conflict",
  NOT_FOUND: "not_found",
  INVALID_STATE: "invalid_state",
} as const;

const SUPPORTED_PRODUCT_ROUTE_ERROR_TYPES = [
  PRODUCT_ROUTE_ERROR_TYPE.VALIDATION_ERROR,
  PRODUCT_ROUTE_ERROR_TYPE.CONFLICT,
  PRODUCT_ROUTE_ERROR_TYPE.NOT_FOUND,
  PRODUCT_ROUTE_ERROR_TYPE.INVALID_STATE,
] as const;

type ProductRouteErrorType =
  (typeof PRODUCT_ROUTE_ERROR_TYPE)[keyof typeof PRODUCT_ROUTE_ERROR_TYPE];

interface ProductRouteError {
  type: ProductRouteErrorType;
  message: string;
}

interface AuthorizedAdminAccess {
  authorized: true;
  supabaseResponse: NextResponse<null>;
}

interface RejectedAdminAccess<TData> {
  authorized: false;
  response: NextResponse<ApiResponse<TData>>;
}

type AdminAccessResult<TData> =
  | AuthorizedAdminAccess
  | RejectedAdminAccess<TData>;

interface ParsedJsonBody {
  ok: true;
  body: unknown;
}

interface InvalidJsonBody<TData> {
  ok: false;
  response: NextResponse<ApiResponse<TData>>;
}

export function createProductJsonResponse<TData>(
  body: ApiResponse<TData>,
  status = 200,
): NextResponse<ApiResponse<TData>> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function createAuthorizedProductJsonResponse<TData>(
  supabaseResponse: NextResponse<null>,
  body: ApiResponse<TData>,
  status = 200,
): NextResponse<ApiResponse<TData>> {
  return copySupabaseResponseCookies(
    supabaseResponse,
    createProductJsonResponse(body, status),
  );
}

export async function parseJsonBody<TData>(
  request: NextRequest,
): Promise<ParsedJsonBody | InvalidJsonBody<TData>> {
  try {
    return {
      ok: true,
      body: (await request.json()) as unknown,
    };
  } catch {
    return {
      ok: false,
      response: createProductJsonResponse<TData>(
        {
          type: PRODUCT_ROUTE_ERROR_TYPE.VALIDATION_ERROR,
          message: "invalid_json",
        },
        400,
      ),
    };
  }
}

export function parseRequestParams(request: NextRequest): unknown {
  const rawParams = request.nextUrl.searchParams.get("params");

  if (!rawParams) {
    return {};
  }

  try {
    return JSON.parse(rawParams) as unknown;
  } catch {
    return null;
  }
}

export async function resolveAdminRouteAccess<TData>(
  request: NextRequest,
): Promise<AdminAccessResult<TData>> {
  const supabaseResponse = NextResponse.json(null);
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);
  const currentUser = await resolveCurrentUser(supabase);

  if (!currentUser) {
    return {
      authorized: false,
      response: createAuthorizedProductJsonResponse<TData>(
        supabaseResponse,
        {
          type: "unauthorized",
          message: "unauthorized",
        },
        401,
      ),
    };
  }

  if (!canAccessAdmin(currentUser)) {
    return {
      authorized: false,
      response: createAuthorizedProductJsonResponse<TData>(
        supabaseResponse,
        {
          type: "forbidden",
          message: "forbidden",
        },
        403,
      ),
    };
  }

  return {
    authorized: true,
    supabaseResponse,
  };
}

export function mapProductRouteErrorStatus(
  type: ProductRouteErrorType,
): number {
  switch (type) {
    case PRODUCT_ROUTE_ERROR_TYPE.VALIDATION_ERROR:
      return 400;
    case PRODUCT_ROUTE_ERROR_TYPE.CONFLICT:
      return 409;
    case PRODUCT_ROUTE_ERROR_TYPE.NOT_FOUND:
      return 404;
    case PRODUCT_ROUTE_ERROR_TYPE.INVALID_STATE:
      return 422;
  }
}

function isProductRouteErrorType(type: unknown): type is ProductRouteErrorType {
  return (
    typeof type === "string" &&
    SUPPORTED_PRODUCT_ROUTE_ERROR_TYPES.some(
      (supportedType) => supportedType === type,
    )
  );
}

export function isProductRouteError(
  error: unknown,
): error is ProductRouteError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("type" in error) || !("message" in error)) {
    return false;
  }

  return (
    isProductRouteErrorType(error.type) && typeof error.message === "string"
  );
}

export function isVariantGenerationError(error: unknown): error is Error {
  return (
    error instanceof Error && error.message.startsWith("variant_generation_")
  );
}
