/** @jest-environment node */
import {
  describeImageUpload,
  signReservedImage,
  uploadReservedImage,
  validateStoredImage,
} from "./catalog_image_storage";
import {
  cancelCatalogImageUpload,
  completeCatalogImageUpload,
  getCatalogGallery,
  listStorefrontCatalogImages,
  prepareCatalogImageUpload,
  restoreCatalogImage,
  saveCatalogGallery,
  uploadCatalogImage,
} from "./catalog_media_service";

const tx = {
  $queryRaw: jest.fn(),
  product: { findFirst: jest.fn() },
  productVariant: { findFirst: jest.fn() },
  catalogImage: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};
const mockTransaction = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (...args: never[]) => mockTransaction(...args) },
}));
jest.mock("./catalog_image_storage", () => ({
  describeImageUpload: jest.fn(),
  signReservedImage: jest.fn(),
  validateStoredImage: jest.fn(),
  uploadReservedImage: jest.fn(),
}));
const target = { productId: "p1", variantId: null };
const image = {
  id: "a",
  productId: "p1",
  variantId: null,
  bucket: "catalog-images",
  path: "catalog/product/p1/a.png",
  publicUrl: "https://example.com/a.png",
  fileName: "a.png",
  contentType: "image/png",
  size: 10,
  altText: "Original",
  position: 0,
  status: "ready",
  deletedAt: null,
  createdAt: new Date("2026-10-16"),
  updatedAt: new Date("2026-10-16"),
};

describe("catalog media boundaries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTransaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<object>) => callback(tx),
    );
    tx.$queryRaw.mockResolvedValue([{ id: "p1" }]);
    tx.product.findFirst.mockResolvedValue({ id: "p1" });
    tx.productVariant.findFirst.mockResolvedValue({
      id: "v1",
      productId: "p1",
    });
    tx.catalogImage.findMany.mockResolvedValue([image]);
    tx.catalogImage.count.mockResolvedValue(1);
    tx.catalogImage.update.mockResolvedValue(image);
  });

  it("computes primary from order, returns trash and falls back to product images", async () => {
    tx.catalogImage.findMany.mockImplementation(({ where }) =>
      Promise.resolve(where.variantId === null ? [image] : []),
    );
    const gallery = await getCatalogGallery({
      productId: "p1",
      variantId: "v1",
    });
    expect(gallery.images).toEqual([]);
    expect(gallery.source).toBe("product");
    expect(gallery.resolvedImages[0]).toMatchObject({
      id: "a",
      isPrimary: true,
    });
  });

  it("rejects cross-product variants before reading any images", async () => {
    tx.productVariant.findFirst.mockResolvedValue(null);
    await expect(
      getCatalogGallery({ productId: "p1", variantId: "foreign" }),
    ).rejects.toMatchObject({ type: "not_found" });
    expect(tx.catalogImage.findMany).not.toHaveBeenCalled();
  });

  it("rejects a stale gallery save instead of losing another administrator's changes", async () => {
    await expect(
      saveCatalogGallery(target, { revision: "stale", images: [] }),
    ).rejects.toMatchObject({ message: "media_conflict" });
    expect(tx.catalogImage.updateMany).not.toHaveBeenCalled();
  });

  it("soft-deletes removed images and persists alt/order in a transaction", async () => {
    const initial = await getCatalogGallery(target);
    await saveCatalogGallery(target, {
      revision: initial.revision,
      images: [],
    });
    expect(tx.catalogImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
    );
  });

  it("rejects foreign or trashed ids in snapshots before any write", async () => {
    const initial = await getCatalogGallery(target);
    await expect(
      saveCatalogGallery(target, {
        revision: initial.revision,
        images: [{ id: "foreign", altText: "" }],
      }),
    ).rejects.toMatchObject({ type: "validation_error" });
    expect(tx.catalogImage.updateMany).not.toHaveBeenCalled();
  });

  it("does not restore an image when the gallery already has ten active images", async () => {
    tx.catalogImage.findMany.mockResolvedValue([
      { ...image, deletedAt: new Date() },
    ]);
    tx.catalogImage.count.mockResolvedValue(10);
    const gallery = await getCatalogGallery(target);
    await expect(
      restoreCatalogImage(target, "a", gallery.revision),
    ).rejects.toMatchObject({ message: "media_limit" });
    expect(tx.catalogImage.update).not.toHaveBeenCalled();
  });

  it("reserves metadata before storage and marks failed uploads without deleting physical files", async () => {
    const gallery = await getCatalogGallery(target);
    jest.mocked(describeImageUpload).mockReturnValue(image);
    tx.catalogImage.create.mockResolvedValue({ ...image, status: "pending" });
    jest.mocked(uploadReservedImage).mockRejectedValue(new Error("offline"));
    await expect(
      uploadCatalogImage({
        ...target,
        revision: gallery.revision,
        file: new File(["png"], "a.png", { type: "image/png" }),
      }),
    ).rejects.toMatchObject({ message: "media_upload_failed" });
    expect(tx.catalogImage.create.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(uploadReservedImage).mock.invocationCallOrder[0],
    );
    expect(tx.catalogImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("does not publish an upload if the gallery changes while storage is working", async () => {
    const gallery = await getCatalogGallery(target);
    jest.mocked(describeImageUpload).mockReturnValue(image);
    tx.catalogImage.create.mockResolvedValue({
      ...image,
      id: "reserved",
      status: "pending",
    });
    jest.mocked(uploadReservedImage).mockImplementation(async () => {
      tx.catalogImage.findMany.mockResolvedValue([
        { ...image, altText: "Another administrator" },
      ]);
    });
    await expect(
      uploadCatalogImage({
        ...target,
        revision: gallery.revision,
        file: new File(["png"], "a.png", { type: "image/png" }),
      }),
    ).rejects.toMatchObject({ message: "media_conflict" });
    expect(tx.catalogImage.update).not.toHaveBeenCalled();
    expect(tx.catalogImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });

  it("persists alternate text and promotes the first ordered image without a second primary flag", async () => {
    tx.catalogImage.findMany.mockResolvedValue([
      image,
      { ...image, id: "b", position: 1 },
    ]);
    const gallery = await getCatalogGallery(target);
    await saveCatalogGallery(target, {
      revision: gallery.revision,
      images: [
        { id: "b", altText: " Principal " },
        { id: "a", altText: "Anterior" },
      ],
    });
    expect(tx.catalogImage.update).toHaveBeenNthCalledWith(1, {
      where: { id: "b" },
      data: { position: 0, altText: "Principal" },
    });
    expect(tx.catalogImage.update).toHaveBeenNthCalledWith(2, {
      where: { id: "a" },
      data: { position: 1, altText: "Anterior" },
    });
  });

  it("appends a restored image rather than replacing the current principal", async () => {
    tx.catalogImage.findMany.mockResolvedValue([
      image,
      { ...image, id: "trashed", deletedAt: new Date() },
    ]);
    const gallery = await getCatalogGallery(target);
    await restoreCatalogImage(target, "trashed", gallery.revision);
    expect(tx.catalogImage.update).toHaveBeenCalledWith({
      where: { id: "trashed" },
      data: { deletedAt: null, position: 1 },
    });
  });

  it("prioritizes variant-owned images without mixing in product images", async () => {
    tx.catalogImage.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        where.variantId === null
          ? [image]
          : [{ ...image, id: "own", variantId: "v1" }],
      ),
    );
    const result = await getCatalogGallery({
      productId: "p1",
      variantId: "v1",
    });
    expect(result.source).toBe("variant");
    expect(result.resolvedImages.map((item) => item.id)).toEqual(["own"]);
  });

  it("does not expose draft/deleted products or foreign/inactive variants to storefront consumers", async () => {
    tx.product.findFirst.mockResolvedValueOnce(null);
    expect(await listStorefrontCatalogImages("p1")).toEqual([]);
    tx.productVariant.findFirst.mockResolvedValueOnce(null);
    expect(await listStorefrontCatalogImages("p1", "foreign")).toEqual([]);
    expect(tx.catalogImage.findMany).not.toHaveBeenCalled();
  });
});

describe("signed upload lifecycle", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTransaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<object>) => callback(tx),
    );
    tx.$queryRaw.mockResolvedValue([{ id: "p1" }]);
    tx.product.findFirst.mockResolvedValue({ id: "p1" });
    tx.catalogImage.findMany.mockResolvedValue([image]);
    tx.catalogImage.count.mockResolvedValue(1);
    tx.catalogImage.updateMany.mockResolvedValue({ count: 1 });
    jest.mocked(describeImageUpload).mockReturnValue(image);
    jest
      .mocked(signReservedImage)
      .mockResolvedValue("https://storage.test/signed");
  });
  async function pending() {
    const gallery = await getCatalogGallery(target);
    const record = {
      ...image,
      id: "reserved",
      status: "pending",
      createdAt: new Date(),
      uploadRevision: gallery.revision,
    };
    tx.catalogImage.findFirst.mockResolvedValue(record);
    tx.catalogImage.create.mockResolvedValue(record);
    return record;
  }
  it("reserves the original revision before minting an immutable upload ticket", async () => {
    const record = await pending();
    expect(
      await prepareCatalogImageUpload({
        ...target,
        revision: record.uploadRevision,
        fileName: "a.png",
        contentType: "image/png",
        size: 10,
      }),
    ).toEqual({
      imageId: "reserved",
      signedUrl: "https://storage.test/signed",
    });
    expect(tx.catalogImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          uploadRevision: record.uploadRevision,
          status: "pending",
        }),
      }),
    );
    expect(tx.catalogImage.create.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(signReservedImage).mock.invocationCallOrder[0],
    );
  });
  it("tracks signing failures without exposing a ready image", async () => {
    const record = await pending();
    jest.mocked(signReservedImage).mockRejectedValue(new Error("offline"));
    await expect(
      prepareCatalogImageUpload({
        ...target,
        revision: record.uploadRevision,
        fileName: "a.png",
        contentType: "image/png",
        size: 10,
      }),
    ).rejects.toMatchObject({ message: "media_upload_failed" });
    expect(tx.catalogImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...target, id: "reserved", status: "pending" },
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });
  it("validates the actual stored object before publishing and excludes its reservation from quota", async () => {
    await pending();
    const result = await completeCatalogImageUpload(target, "reserved");
    expect(result.uploadedImageId).toBe("reserved");
    expect(validateStoredImage).toHaveBeenCalled();
    expect(
      jest.mocked(validateStoredImage).mock.invocationCallOrder[0],
    ).toBeLessThan(tx.catalogImage.update.mock.invocationCallOrder[0]);
    expect(tx.catalogImage.update).toHaveBeenCalledWith({
      where: { id: "reserved" },
      data: { status: "ready" },
    });
    expect(tx.catalogImage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "reserved" } }),
      }),
    );
  });
  it("never publishes spoofed bytes", async () => {
    await pending();
    jest.mocked(validateStoredImage).mockRejectedValue(new Error("bad bytes"));
    await expect(
      completeCatalogImageUpload(target, "reserved"),
    ).rejects.toThrow("bad bytes");
    expect(tx.catalogImage.update).not.toHaveBeenCalled();
    expect(tx.catalogImage.updateMany).toHaveBeenCalled();
  });
  it("rejects foreign IDs with scoped lookup and cleanup", async () => {
    tx.catalogImage.findFirst.mockResolvedValue(null);
    await expect(
      completeCatalogImageUpload(target, "foreign"),
    ).rejects.toMatchObject({ type: "not_found" });
    expect(tx.catalogImage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ...target, id: "foreign" }),
      }),
    );
    expect(validateStoredImage).not.toHaveBeenCalled();
  });
  it("rejects expired reservations before downloading", async () => {
    const record = await pending();
    tx.catalogImage.findFirst.mockResolvedValue({
      ...record,
      createdAt: new Date(Date.now() - 16 * 60000),
    });
    await expect(
      completeCatalogImageUpload(target, "reserved"),
    ).rejects.toMatchObject({ type: "conflict" });
    expect(validateStoredImage).not.toHaveBeenCalled();
  });
  it("rechecks revision after the storage validation", async () => {
    await pending();
    jest.mocked(validateStoredImage).mockImplementation(async () => {
      tx.catalogImage.findMany.mockResolvedValue([
        { ...image, altText: "changed" },
      ]);
    });
    await expect(
      completeCatalogImageUpload(target, "reserved"),
    ).rejects.toMatchObject({ type: "conflict" });
    expect(tx.catalogImage.update).not.toHaveBeenCalled();
  });
  it("recovers an already completed upload idempotently", async () => {
    tx.catalogImage.findFirst.mockResolvedValue(image);
    expect(
      (await completeCatalogImageUpload(target, "a")).uploadedImageId,
    ).toBe("a");
    expect(validateStoredImage).not.toHaveBeenCalled();
    expect(tx.catalogImage.update).not.toHaveBeenCalled();
  });
  it("cancels only scoped pending metadata, never ready objects", async () => {
    expect(await cancelCatalogImageUpload(target, "a")).toEqual({
      cancelled: true,
    });
    expect(tx.catalogImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...target, id: "a", status: "pending" },
      }),
    );
  });
});
