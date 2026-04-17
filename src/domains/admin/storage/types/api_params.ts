import type { AdminStorageImageScope } from "./shared";

export interface AdminStorageImageUploadFields {
  entityId?: string;
  scope: AdminStorageImageScope;
}

export interface AdminStorageImageUploadParams
  extends AdminStorageImageUploadFields {
  file: File;
  signal?: AbortSignal;
}
