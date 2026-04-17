import type { ApiResponse } from "@/types/api-service/api_response";
import type { AdminStorageImageScope } from "./shared";

export interface AdminStorageImageAsset {
  bucket: string;
  contentType: string;
  entityId: string | null;
  originalName: string;
  path: string;
  publicUrl: string;
  scope: AdminStorageImageScope;
  size: number;
}

export type AdminStorageImageUploadApiResponse =
  ApiResponse<AdminStorageImageAsset>;
