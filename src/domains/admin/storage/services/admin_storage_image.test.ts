import {
  buildAdminStorageImagePath,
  validateAdminStorageImageFile,
} from "./admin_storage_image";

describe("admin_storage_image", () => {
  it("accepts supported catalog image files within the size limit", () => {
    const result = validateAdminStorageImageFile({
      name: "acolchado.webp",
      size: 1024,
      type: "image/webp",
    });

    expect(result).toEqual({
      ok: true,
      file: {
        name: "acolchado.webp",
        size: 1024,
        type: "image/webp",
      },
    });
  });

  it("rejects unsupported mime types", () => {
    const result = validateAdminStorageImageFile({
      name: "malicioso.svg",
      size: 1024,
      type: "image/svg+xml",
    });

    expect(result).toEqual({
      ok: false,
      message: "unsupported_image_type",
    });
  });

  it("builds reusable storage paths by scope and entity", () => {
    jest.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid-fija");

    const path = buildAdminStorageImagePath(
      {
        scope: "product",
        entityId: "SKU_001",
      },
      {
        name: "Sábana Premium.JPG",
        size: 1200,
        type: "image/jpeg",
      },
      new Date("2026-04-18T10:00:00.000Z"),
    );

    expect(path).toBe(
      "catalog/product/sku_001/2026-04-18/uuid-fija-s-bana-premium.jpg",
    );
  });
});
