import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import {
  ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
  buildAdminStorageImagePath,
  validateAdminStorageImageFile,
} from "@/domains/admin/storage/services/admin_storage_image";
import { adminStorageImageUploadFieldsSchema } from "@/domains/admin/storage/services/admin_storage_image_schemas";
import type { AdminStorageImageUploadApiResponse } from "@/domains/admin/storage/types/api_responses";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { getSupabaseCatalogStorageBucket } from "@/lib/supabase/shared";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: AdminStorageImageUploadApiResponse,
  status = 200,
): NextResponse<AdminStorageImageUploadApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function getStringFormValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AdminStorageImageUploadApiResponse>> {
  const supabaseResponse = NextResponse.json(null);
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);

  try {
    const currentUser = await resolveCurrentUser(supabase);

    if (!currentUser) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "unauthorized",
            message: "unauthorized",
          },
          401,
        ),
      );
    }

    if (!canAccessAdmin(currentUser)) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "forbidden",
            message: "forbidden",
          },
          403,
        ),
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const fieldsPayload = adminStorageImageUploadFieldsSchema.safeParse({
      entityId: getStringFormValue(formData.get("entityId")) ?? undefined,
      scope: getStringFormValue(formData.get("scope")),
    });

    if (!fieldsPayload.success) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "validation_error",
            message:
              fieldsPayload.error.issues[0]?.message ?? "validation_error",
          },
          400,
        ),
      );
    }

    if (!(fileEntry instanceof File)) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "validation_error",
            message: "image_required",
          },
          400,
        ),
      );
    }

    const fileValidation = validateAdminStorageImageFile(fileEntry);

    if (!fileValidation.ok) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "validation_error",
            message: fileValidation.message,
          },
          400,
        ),
      );
    }

    const bucket = getSupabaseCatalogStorageBucket();
    const path = buildAdminStorageImagePath(fieldsPayload.data, fileEntry);
    const adminClient = createSupabaseAdminClient();
    const uploadResult = await adminClient.storage
      .from(bucket)
      .upload(path, fileEntry, {
        cacheControl: ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
        contentType: fileEntry.type,
        upsert: false,
      });

    if (uploadResult.error) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "internal_server_error",
            message: "storage_upload_failed",
          },
          500,
        ),
      );
    }

    const publicUrl = adminClient.storage.from(bucket).getPublicUrl(path)
      .data.publicUrl;

    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse(
        {
          data: {
            bucket,
            contentType: fileEntry.type,
            entityId: fieldsPayload.data.entityId ?? null,
            originalName: fileEntry.name,
            path,
            publicUrl,
            scope: fieldsPayload.data.scope,
            size: fileEntry.size,
          },
        },
        201,
      ),
    );
  } catch {
    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse(
        {
          type: "internal_server_error",
          message: "internal_server_error",
        },
        500,
      ),
    );
  }
}
