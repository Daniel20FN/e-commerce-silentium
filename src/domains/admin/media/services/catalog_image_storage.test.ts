/** @jest-environment node */
import {
  describeImageUpload,
  signReservedImage,
  uploadReservedImage,
  validateImageSignature,
  validateStoredImage,
} from "./catalog_image_storage";
let mockPublicBucket = true;
const mockSign = jest.fn();
const mockDownload = jest.fn();
const mockUpload = jest.fn().mockResolvedValue({ error: null });
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      getBucket: async () => ({
        data: { public: mockPublicBucket },
        error: null,
      }),
      from: () => ({
        upload: mockUpload,
        createSignedUploadUrl: mockSign,
        download: mockDownload,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: "https://example.com/" + path },
        }),
      }),
    },
  }),
}));
jest.mock("@/lib/supabase/shared", () => ({
  getSupabaseCatalogStorageBucket: () => "catalog-images",
}));
describe("catalog image validation", () => {
  beforeEach(() => {
    mockPublicBucket = true;
    mockUpload.mockClear();
  });
  it("uses canonical extension and unique paths even with repeated or misleading filenames", () => {
    const file = new File(["png"], "../../photo.html", { type: "image/png" });
    const a = describeImageUpload({ productId: "p1", variantId: null }, file);
    const b = describeImageUpload({ productId: "p1", variantId: null }, file);
    expect(a.path).toMatch(/^catalog\/product\/p1\/.*\.png$/);
    expect(a.path).not.toBe(b.path);
    expect(a.path).not.toContain("..");
  });
  it.each([
    ["image/jpeg", [255, 216, 255, 0]],
    ["image/png", [137, 80, 78, 71, 13, 10, 26, 10]],
    ["image/webp", Array.from(Buffer.from("RIFF0000WEBP"))],
    ["image/avif", Array.from(Buffer.from("0000ftypavif"))],
  ])("validates %s signatures", async (type, bytes) => {
    await expect(
      validateImageSignature(
        new File([new Uint8Array(bytes)], "image", { type }),
      ),
    ).resolves.toBeUndefined();
  });
  it("rejects a spoofed content type and empty or oversized files", async () => {
    await expect(
      validateImageSignature(
        new File(["<html>"], "fake.png", { type: "image/png" }),
      ),
    ).rejects.toMatchObject({ message: "unsupported_image_type" });
    expect(() =>
      describeImageUpload(
        { productId: "p1", variantId: null },
        new File([], "empty.png", { type: "image/png" }),
      ),
    ).toThrow("image_required");
    expect(() =>
      describeImageUpload(
        { productId: "p1", variantId: null },
        new File([new Uint8Array(5242881)], "large.png", { type: "image/png" }),
      ),
    ).toThrow("file_too_large");
  });
  it("refuses private buckets rather than recording unusable public URLs", async () => {
    mockPublicBucket = false;
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "a.png",
      { type: "image/png" },
    );
    const asset = describeImageUpload(
      { productId: "p1", variantId: null },
      file,
    );
    await expect(uploadReservedImage(asset, file)).rejects.toMatchObject({
      message: "media_storage_unavailable",
    });
    expect(mockUpload).not.toHaveBeenCalled();
  });
  it("uploads validated content with immutable paths, explicit MIME and no overwrite", async () => {
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "a.png",
      { type: "image/png" },
    );
    const asset = describeImageUpload(
      { productId: "p1", variantId: null },
      file,
    );
    await uploadReservedImage(asset, file);
    expect(mockUpload).toHaveBeenCalledWith(asset.path, file, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });
  });
});

describe("signed object validation", () => {
  const file = new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
    "a.png",
    { type: "image/png" },
  );
  const asset = describeImageUpload({ productId: "p1", variantId: null }, file);
  beforeEach(() => {
    mockPublicBucket = true;
    mockSign.mockReset();
    mockDownload.mockReset();
  });
  it("signs only public immutable objects", async () => {
    mockSign.mockResolvedValue({
      data: { signedUrl: "https://storage.test/signed" },
      error: null,
    });
    expect(await signReservedImage(asset)).toBe("https://storage.test/signed");
    expect(mockSign).toHaveBeenCalledWith(asset.path, { upsert: false });
    mockSign.mockClear();
    mockPublicBucket = false;
    await expect(signReservedImage(asset)).rejects.toMatchObject({
      message: "media_storage_unavailable",
    });
    expect(mockSign).not.toHaveBeenCalled();
  });
  it("validates downloaded bytes rather than trusting the prepare payload", async () => {
    mockDownload.mockResolvedValue({ data: file, error: null });
    await expect(validateStoredImage(asset)).resolves.toBeUndefined();
    mockDownload.mockResolvedValue({
      data: new Blob(["spoofed!"], { type: "image/png" }),
      error: null,
    });
    await expect(validateStoredImage(asset)).rejects.toMatchObject({
      type: "validation_error",
    });
    mockDownload.mockResolvedValue({
      data: new Blob(["too long!!!!"], { type: "image/png" }),
      error: null,
    });
    await expect(validateStoredImage(asset)).rejects.toMatchObject({
      type: "validation_error",
    });
    mockDownload.mockResolvedValue({
      data: new Blob([new Uint8Array(8)], { type: "image/jpeg" }),
      error: null,
    });
    await expect(validateStoredImage(asset)).rejects.toMatchObject({
      type: "validation_error",
    });
  });
});
