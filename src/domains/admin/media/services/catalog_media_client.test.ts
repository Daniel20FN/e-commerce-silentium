import { apiService } from "@/types/api-service/api_service";
import type { CatalogGalleryData } from "../types/api_params";
import { uploadCatalogImageFile } from "./catalog_media_client";
jest.mock("@/types/api-service/api_service", () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    uploadSignedFile: jest.fn(),
  },
}));
const data: CatalogGalleryData = {
  images: [],
  trash: [],
  resolvedImages: [],
  revision: "a".repeat(64),
  source: "none",
  limit: 10,
};
const params = {
  productId: "p1",
  variantId: null,
  revision: data.revision,
  file: new File([new Uint8Array(5 * 1024 * 1024)], "five.png", {
    type: "image/png",
  }),
};
describe("direct signed media transport", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(apiService.post).mockResolvedValue({
      imageId: "new",
      signedUrl: "https://storage.example/upload?token=test-only",
    });
    jest.mocked(apiService.put).mockResolvedValue(data);
    jest.mocked(apiService.get).mockResolvedValue(data);
    jest.mocked(apiService.uploadSignedFile).mockResolvedValue(undefined);
  });
  it("keeps the 5 MiB binary out of local API requests", async () => {
    await uploadCatalogImageFile(params);
    expect(apiService.post).toHaveBeenCalledWith(
      "/admin/products/p1/media/upload",
      {
        variantId: null,
        revision: data.revision,
        fileName: "five.png",
        contentType: "image/png",
        size: 5242880,
      },
    );
    expect(apiService.uploadSignedFile).toHaveBeenCalledWith(
      "https://storage.example/upload?token=test-only",
      params.file,
      "31536000",
    );
    expect(apiService.put).toHaveBeenCalledWith(
      "/admin/products/p1/media/upload",
      { variantId: null, imageId: "new" },
    );
  });
  it("cancels a failed reservation without deleting a physical object", async () => {
    jest
      .mocked(apiService.uploadSignedFile)
      .mockRejectedValue(new Error("network"));
    await expect(uploadCatalogImageFile(params)).rejects.toThrow("network");
    expect(apiService.delete).toHaveBeenCalledWith(
      "/admin/products/p1/media/upload",
      { variantId: null, imageId: "new" },
    );
  });
  it("recovers a completed upload when its response was lost", async () => {
    jest.mocked(apiService.put).mockRejectedValue(new Error("network"));
    jest
      .mocked(apiService.get)
      .mockResolvedValue({ ...data, images: [{ id: "new" }] });
    expect(await uploadCatalogImageFile(params)).toMatchObject({
      uploadedImageId: "new",
    });
    expect(apiService.delete).not.toHaveBeenCalled();
  });
});
