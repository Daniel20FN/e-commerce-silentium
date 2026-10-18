import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { uploadCatalogImageFile } from "../services/catalog_media_client";
import type { CatalogGalleryData, CatalogImageDto } from "../types/api_params";
import { CatalogMediaDialog } from "./catalog_media_dialog";
jest.mock("../services/catalog_media_client", () => ({
  uploadCatalogImageFile: jest.fn(),
}));
jest.mock("@/types/api-service/api_service", () => ({
  apiService: {
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock("notistack", () => ({ enqueueSnackbar: jest.fn() }));
jest.mock("@/components/dialog/dialog_context", () => ({
  useDialog: () => ({ openDialog: jest.fn() }),
}));
const copy = dictionary.admin.media;
jest.setTimeout(20000);
const imageA: CatalogImageDto = {
  id: "a",
  productId: "p1",
  variantId: null,
  bucket: "catalog-images",
  path: "product/a.png",
  publicUrl: "https://example.com/a.png",
  fileName: "a.png",
  contentType: "image/png",
  size: 128,
  altText: "A original",
  position: 0,
  isPrimary: true,
  deletedAt: null,
};
const imageB: CatalogImageDto = {
  ...imageA,
  id: "b",
  fileName: "b.png",
  path: "product/b.png",
  publicUrl: "https://example.com/b.png",
  altText: "B original",
  position: 1,
  isPrimary: false,
};
const gallery: CatalogGalleryData = {
  images: [imageA, imageB],
  trash: [],
  resolvedImages: [imageA, imageB],
  source: "product",
  revision: "a".repeat(64),
  limit: 10,
};

describe("CatalogMediaDialog with shared FilesUploader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiService.get).mockResolvedValue(gallery);
    jest.mocked(apiService.put).mockResolvedValue(gallery);
    jest.mocked(apiService.patch).mockResolvedValue(gallery);
    URL.createObjectURL = jest.fn(() => "blob:qa-image");
    URL.revokeObjectURL = jest.fn();
  });
  const setup = () =>
    render(
      <CatalogMediaDialog
        dictionary={dictionary}
        product={{ id: "p1", name: "QA Producto" }}
        variants={[{ id: "v1", sku: "SKU-1" }]}
        onClose={jest.fn()}
      />,
    );

  it("reuses reorder controls and saves order, primary-by-position and edited alt text", async () => {
    setup();
    fireEvent.click(
      await screen.findByLabelText(`${copy.uploader.move_file_forward} a.png`),
    );
    fireEvent.change(screen.getByLabelText(`${copy.alt} 1`), {
      target: { value: "Imagen B principal" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await waitFor(() =>
      expect(apiService.put).toHaveBeenCalledWith("/admin/products/p1/media", {
        variantId: null,
        revision: gallery.revision,
        images: [
          { id: "b", altText: "Imagen B principal" },
          { id: "a", altText: "A original" },
        ],
      }),
    );
  });

  it("confirms removals before saving, and supports recovery from trash", async () => {
    jest.mocked(apiService.put).mockResolvedValue({
      ...gallery,
      images: [imageB],
      trash: [{ ...imageA, deletedAt: "2026-10-16" }],
    });
    setup();
    fireEvent.click(
      await screen.findByLabelText(`${copy.uploader.remove_file} a.png`),
    );
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    expect(apiService.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: copy.confirmSave }));
    const restore = await screen.findByRole("button", { name: copy.restore });
    await waitFor(() => expect(restore).toBeEnabled());
    fireEvent.click(restore);
    await waitFor(() =>
      expect(apiService.patch).toHaveBeenCalledWith(
        "/admin/products/p1/media",
        { variantId: null, imageId: "a", revision: gallery.revision },
      ),
    );
  });

  it("shows inherited product images for a variant without adding them as its own", async () => {
    jest
      .mocked(apiService.get)
      .mockResolvedValueOnce(gallery)
      .mockResolvedValueOnce({ ...gallery, images: [] });
    setup();
    await screen.findByLabelText(`${copy.alt} 1`);
    fireEvent.mouseDown(screen.getByLabelText(copy.target));
    fireEvent.click(
      await screen.findByRole("option", {
        name: `${copy.variantPrefix}: SKU-1`,
      }),
    );
    expect(await screen.findByText(copy.fallback)).toBeInTheDocument();
    expect(screen.queryByLabelText(`${copy.alt} 1`)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
  });

  it("keeps a newly selected file and protects dirty state from accidental closing", async () => {
    jest.mocked(apiService.get).mockResolvedValue({
      ...gallery,
      images: [],
      resolvedImages: [],
      source: "none",
    });
    setup();
    await screen.findByText(copy.noImages);
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    if (!input) throw new Error("missing file input");
    fireEvent.change(input, {
      target: { files: [new File(["png"], "new.png", { type: "image/png" })] },
    });
    await screen.findByLabelText(`${copy.alt} 1`);
    expect(screen.getByRole("button", { name: copy.save })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(await screen.findByText(copy.discardTitle)).toBeInTheDocument();
  });

  it("shows a revision conflict without pretending the gallery was saved", async () => {
    jest.mocked(apiService.put).mockRejectedValue(new Error("media_conflict"));
    setup();
    fireEvent.change(await screen.findByLabelText(`${copy.alt} 1`), {
      target: { value: "Editado" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    expect(
      await screen.findByText(copy.errors.media_conflict),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.save })).toBeEnabled();
  });

  it("does not re-upload a previously completed file after a partial upload failure", async () => {
    const empty = {
      ...gallery,
      images: [],
      resolvedImages: [],
      source: "none" as const,
    };
    jest.mocked(apiService.get).mockResolvedValue(empty);
    jest
      .mocked(uploadCatalogImageFile)
      .mockResolvedValueOnce({
        ...gallery,
        images: [imageA],
        uploadedImageId: "a",
      })
      .mockRejectedValueOnce(new Error("media_upload_failed"))
      .mockResolvedValueOnce({ ...gallery, uploadedImageId: "b" });
    setup();
    await screen.findByText(copy.noImages);
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error("missing file input");
    fireEvent.change(input, {
      target: {
        files: [
          new File(["a"], "a.png", { type: "image/png" }),
          new File(["b"], "b.png", { type: "image/png" }),
        ],
      },
    });
    await screen.findByLabelText(`${copy.alt} 2`);
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await screen.findByText(copy.errors.media_upload_failed);
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await waitFor(() => expect(apiService.put).toHaveBeenCalled());
    expect(uploadCatalogImageFile).toHaveBeenCalledTimes(3);
  });

  it("frees confirmed removals before uploading replacements into a full gallery", async () => {
    const full = {
      ...gallery,
      images: Array.from({ length: 10 }, (_, index) => ({
        ...imageA,
        id: String(index),
        fileName: `image-${index}.png`,
        publicUrl: `https://example.com/${index}.png`,
        position: index,
      })),
    };
    const retained = {
      ...full,
      images: full.images.slice(1),
      revision: "b".repeat(64),
    };
    jest.mocked(apiService.get).mockResolvedValue(full);
    jest.mocked(apiService.put).mockResolvedValue(retained);
    jest.mocked(uploadCatalogImageFile).mockResolvedValue({
      ...retained,
      images: [...retained.images, imageB],
      uploadedImageId: "b",
    });
    setup();
    fireEvent.click(
      await screen.findByLabelText(`${copy.uploader.remove_file} image-0.png`),
    );
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error("missing file input");
    fireEvent.change(input, {
      target: {
        files: [new File(["png"], "replacement.png", { type: "image/png" })],
      },
    });
    await screen.findByLabelText(`${copy.alt} 10`);
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    fireEvent.click(
      await screen.findByRole("button", { name: copy.confirmSave }),
    );
    await waitFor(() =>
      expect(uploadCatalogImageFile).toHaveBeenCalledWith(
        expect.objectContaining({ revision: retained.revision }),
      ),
    );
    expect(
      jest.mocked(apiService.put).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(uploadCatalogImageFile).mock.invocationCallOrder[0],
    );
  });

  it("allows closing a loading gallery and aborts its request", async () => {
    jest.mocked(apiService.get).mockReturnValue(new Promise(() => {}));
    const onClose = jest.fn();
    render(
      <CatalogMediaDialog
        dictionary={dictionary}
        product={{ id: "p1", name: "QA" }}
        variants={[]}
        onClose={onClose}
      />,
    );
    expect(await screen.findByText(copy.loading)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
