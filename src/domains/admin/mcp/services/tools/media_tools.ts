import {
  galleryRestoreSchema,
  gallerySaveSchema,
  imageFinishSchema,
  imagePrepareSchema,
} from "@/domains/admin/media/services/catalog_media_schemas";
import {
  cancelCatalogImageUpload,
  completeCatalogImageUpload,
  getCatalogGallery,
  prepareCatalogImageUpload,
  restoreCatalogImage,
  saveCatalogGallery,
  uploadCatalogImage,
} from "@/domains/admin/media/services/catalog_media_service";
import { adminProductLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import { z } from "zod";
import { McpToolError } from "../mcp_errors";
import { defineReadTool, defineWriteTool } from "../mcp_tool_types";

/**
 * The whole MCP request body must stay below Vercel's 4.5 MB limit. Base64
 * inflates data by 4/3, so the decoded image is capped well under that.
 */
export const MCP_IMAGE_BASE64_MAX_DECODED_BYTES = 2 * 1024 * 1024;
export const MCP_IMAGE_BASE64_MAX_LENGTH =
  Math.ceil(MCP_IMAGE_BASE64_MAX_DECODED_BYTES / 3) * 4;

const productId = adminProductLifecycleSchema.shape.productId;
const variantId = z.string().trim().min(1).max(128).nullable();

const base64UploadInput = z.object({
  productId,
  variantId,
  revision: z.string().length(64),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(100),
  dataBase64: z
    .string()
    .min(1)
    .max(MCP_IMAGE_BASE64_MAX_LENGTH)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export const mediaTools = [
  defineReadTool({
    name: "media_get_gallery",
    group: "media",
    title: "Get image gallery",
    description:
      "Returns the image gallery of a product or one of its variants (variantId), the trash and the gallery revision (64 hex chars) required by every media write.",
    inputSchema: z.object({ productId, variantId: variantId.optional() }),
    handler: (input) =>
      getCatalogGallery({
        productId: input.productId,
        variantId: input.variantId ?? null,
      }),
  }),
  defineWriteTool({
    name: "media_prepare_upload",
    group: "media",
    title: "Prepare signed image upload",
    description:
      "Reserves an image slot and returns { imageId, signedUrl }. Upload the file bytes to signedUrl with an HTTP PUT outside MCP, then call media_complete_upload. Allowed: JPEG, PNG, WebP, AVIF up to 5 MB.",
    destructive: false,
    inputSchema: z.object({ productId, upload: imagePrepareSchema }),
    handler: (input) =>
      prepareCatalogImageUpload({
        productId: input.productId,
        ...input.upload,
      }),
  }),
  defineWriteTool({
    name: "media_complete_upload",
    group: "media",
    title: "Complete image upload",
    description:
      "Finalizes an upload reserved with media_prepare_upload after the bytes were sent to the signed URL. Verifies the stored object and publishes the image to the gallery.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, upload: imageFinishSchema }),
    handler: (input) =>
      completeCatalogImageUpload(
        { productId: input.productId, variantId: input.upload.variantId },
        input.upload.imageId,
      ),
  }),
  defineWriteTool({
    name: "media_cancel_upload",
    group: "media",
    title: "Cancel image upload",
    description:
      "Cancels a pending upload reserved with media_prepare_upload and releases the slot.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, upload: imageFinishSchema }),
    handler: (input) =>
      cancelCatalogImageUpload(
        { productId: input.productId, variantId: input.upload.variantId },
        input.upload.imageId,
      ),
  }),
  defineWriteTool({
    name: "media_save_gallery",
    group: "media",
    title: "Save gallery order and alt text",
    description:
      "Saves the display order (the order of the images array) and alt text of the gallery. Requires the gallery revision from media_get_gallery. Images omitted from the list are moved to the trash.",
    destructive: true,
    idempotent: true,
    inputSchema: z.object({ productId, gallery: gallerySaveSchema }),
    handler: (input) =>
      saveCatalogGallery(
        { productId: input.productId, variantId: input.gallery.variantId },
        input.gallery,
      ),
  }),
  defineWriteTool({
    name: "media_restore_image",
    group: "media",
    title: "Restore image",
    description:
      "Restores a trashed image. Requires the gallery revision from media_get_gallery.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, restore: galleryRestoreSchema }),
    handler: (input) =>
      restoreCatalogImage(
        { productId: input.productId, variantId: input.restore.variantId },
        input.restore.imageId,
        input.restore.revision,
      ),
  }),
  defineWriteTool({
    name: "media_upload_image_base64",
    group: "media",
    title: "Upload small image (base64)",
    description: `Fallback for small images: uploads base64 data directly (decoded size up to ${MCP_IMAGE_BASE64_MAX_DECODED_BYTES / (1024 * 1024)} MB). Same validation as the admin panel (MIME type, file signature, size). Prefer media_prepare_upload for larger files.`,
    destructive: false,
    inputSchema: base64UploadInput,
    handler: async (input) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (bytes.byteLength > MCP_IMAGE_BASE64_MAX_DECODED_BYTES)
        throw new McpToolError("validation_error", "file_too_large");
      const file = new File([new Uint8Array(bytes)], input.fileName, {
        type: input.contentType,
      });
      return uploadCatalogImage({
        productId: input.productId,
        variantId: input.variantId,
        revision: input.revision,
        file,
      });
    },
  }),
];
