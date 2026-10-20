"use client";

import { FilesUploader } from "@/components/files-uploader/files_uploader";
import type { DocumentType } from "@/components/files-uploader/types";
import { FilesViewer } from "@/components/files-viewer/files_viewer";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  AdminEditorSurface,
  type AdminEditorState,
} from "@/domains/admin/components/admin_editor_surface";
import { validateAdminStorageImageFile } from "@/domains/admin/storage/services/admin_storage_image";
import {
  ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES,
  ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES,
} from "@/domains/admin/storage/types/shared";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadCatalogImageFile } from "../services/catalog_media_client";
import type {
  CatalogGalleryApiResponse,
  CatalogGalleryData,
  CatalogGalleryQuery,
  CatalogGalleryRestoreParams,
  CatalogGallerySaveParams,
  CatalogGalleryTarget,
  CatalogImageDto,
} from "../types/api_params";

interface Props {
  embedded?: boolean;
  onStateChange?: (state: AdminEditorState) => void;
  dictionary: Dictionary;
  product: { id: string; name: string };
  variants: { id: string; sku: string }[];
  onClose: () => void;
}
type EditorState = { busy: boolean; dirty: boolean };

function documentFor(image: CatalogImageDto): DocumentType {
  return {
    id: image.id,
    url: image.publicUrl,
    dbUrl: image.publicUrl,
    fullPath: image.path,
    fileName: image.fileName,
    size: image.size,
    type: image.contentType,
  };
}

export function CatalogMediaDialog({
  embedded = false,
  onStateChange,
  dictionary,
  product,
  variants,
  onClose,
}: Props) {
  const copy = dictionary.admin.media;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [state, setState] = useState<EditorState>({
    busy: false,
    dirty: false,
  });
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);
  const [discard, setDiscard] = useState<
    { target: string | null } | "close" | null
  >(null);
  const close = () => {
    if (!state.busy) {
      if (state.dirty) setDiscard("close");
      else onClose();
    }
  };
  return (
    <>
      <AdminEditorSurface
        embedded={embedded}
        open
        fullWidth
        maxWidth="md"
        onClose={close}
      >
        <DialogTitle>
          {copy.title} — {product.name}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="catalog-media-target-label" shrink>
                {copy.target}
              </InputLabel>
              <Select
                labelId="catalog-media-target-label"
                label={copy.target}
                value={variantId ?? ""}
                displayEmpty
                disabled={state.busy}
                onChange={(event) => {
                  const target = event.target.value || null;
                  if (state.dirty) setDiscard({ target });
                  else setVariantId(target);
                }}
              >
                <MenuItem value="">{copy.general}</MenuItem>
                {variants.map((variant) => (
                  <MenuItem key={variant.id} value={variant.id}>
                    {copy.variantPrefix}: {variant.sku}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <GalleryEditor
              key={variantId ?? "product"}
              dictionary={dictionary}
              target={{ productId: product.id, variantId }}
              onStateChange={setState}
            />
          </Stack>
        </DialogContent>
        {!embedded && (
          <DialogActions>
            <Button disabled={state.busy} onClick={close}>
              {copy.close}
            </Button>
          </DialogActions>
        )}
      </AdminEditorSurface>
      <Dialog
        open={discard !== null}
        onClose={() => setDiscard(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{copy.discardTitle}</DialogTitle>
        <DialogContent>{copy.discardBody}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscard(null)}>{copy.keepEditing}</Button>
          <Button
            onClick={() => {
              if (discard === "close") onClose();
              else if (discard) setVariantId(discard.target);
              setDiscard(null);
            }}
          >
            {copy.discard}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface EditorProps {
  dictionary: Dictionary;
  target: CatalogGalleryTarget;
  onStateChange: (state: EditorState) => void;
}

function GalleryEditor({ dictionary, target, onStateChange }: EditorProps) {
  const copy = dictionary.admin.media;
  const endpoint = `/admin/products/${target.productId}/media`;
  const [gallery, setGallery] = useState<CatalogGalleryData | null>(null);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [, setFilesToDelete] = useState<{ dbUrl: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmSave, setConfirmSave] = useState(false);
  const blobs = useRef(new Set<string>());
  const dirty =
    gallery !== null &&
    JSON.stringify(
      documents.map((file) => ({
        id: file.id,
        altText: altTexts[file.id] ?? "",
      })),
    ) !==
      JSON.stringify(
        gallery.images.map((file) => ({ id: file.id, altText: file.altText })),
      );
  const removedCount =
    gallery?.images.filter(
      (image) => !documents.some((file) => file.id === image.id),
    ).length ?? 0;

  useEffect(() => {
    onStateChange({ busy, dirty });
  }, [busy, dirty, onStateChange]);
  useEffect(() => {
    const urls = blobs.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const showError = useCallback(
    (reason: unknown) => {
      const key = reason instanceof Error ? reason.message : "unexpected";
      const translated =
        Object.entries(copy.errors).find(([code]) => code === key)?.[1] ??
        copy.errors.unexpected;
      setError(translated);
    },
    [copy.errors],
  );

  const applyGallery = useCallback((data: CatalogGalleryData) => {
    setGallery(data);
    setDocuments(data.images.map(documentFor));
    setAltTexts(
      Object.fromEntries(data.images.map((image) => [image.id, image.altText])),
    );
    setFilesToDelete([]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await apiService.get<
          CatalogGalleryApiResponse,
          CatalogGalleryQuery
        >(
          endpoint,
          { variantId: target.variantId },
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          if (!data) throw new Error("unexpected");
          applyGallery(data);
        }
      } catch (reason) {
        if (!controller.signal.aborted) showError(reason);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [endpoint, target.variantId, reloadKey, applyGallery, showError]);

  const changeFiles = useCallback(
    (files: DocumentType[]) => {
      const valid = files.filter((file) => {
        if (file.url.startsWith("blob:")) blobs.current.add(file.url);
        if (!file.originalFile) return true;
        const validation = validateAdminStorageImageFile(file.originalFile);
        if (!validation.ok || !file.originalFile.size) {
          showError(
            new Error(validation.ok ? "image_required" : validation.message),
          );
          return false;
        }
        return true;
      });
      setDocuments(valid);
    },
    [showError],
  );

  const save = async (): Promise<void> => {
    if (busy || !gallery) return;
    setBusy(true);
    setError(null);
    setConfirmSave(false);
    let revision = gallery.revision;
    let nextDocuments = [...documents];
    const nextAltTexts = { ...altTexts };
    try {
      if (removedCount > 0 && documents.some((file) => file.originalFile)) {
        const retained = await apiService.put<
          CatalogGalleryApiResponse,
          CatalogGallerySaveParams
        >(endpoint, {
          variantId: target.variantId,
          revision,
          images: documents
            .filter((file) => !file.originalFile)
            .map((file) => ({
              id: file.id,
              altText: nextAltTexts[file.id] ?? "",
            })),
        });
        if (!retained) throw new Error("unexpected");
        revision = retained.revision;
        setGallery(retained);
      }
      for (const file of documents) {
        if (!file.originalFile) continue;
        const uploaded = await uploadCatalogImageFile({
          ...target,
          revision,
          file: file.originalFile,
        });
        const image = uploaded?.images.find(
          (item) => item.id === uploaded.uploadedImageId,
        );
        if (!uploaded || !image) throw new Error("media_upload_failed");
        revision = uploaded.revision;
        nextDocuments = nextDocuments.map((item) =>
          item.id === file.id ? documentFor(image) : item,
        );
        nextAltTexts[image.id] = nextAltTexts[file.id] ?? "";
        delete nextAltTexts[file.id];
        setGallery(uploaded);
        setDocuments(nextDocuments);
        setAltTexts({ ...nextAltTexts });
      }
      const data = await apiService.put<
        CatalogGalleryApiResponse,
        CatalogGallerySaveParams
      >(endpoint, {
        variantId: target.variantId,
        revision,
        images: nextDocuments.map((file) => ({
          id: file.id,
          altText: nextAltTexts[file.id] ?? "",
        })),
      });
      if (!data) throw new Error("unexpected");
      applyGallery(data);
      enqueueSnackbar(copy.saved, { variant: "success" });
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (imageId: string): Promise<void> => {
    if (busy || dirty || !gallery) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiService.patch<
        CatalogGalleryApiResponse,
        CatalogGalleryRestoreParams
      >(endpoint, {
        variantId: target.variantId,
        imageId,
        revision: gallery.revision,
      });
      if (!data) throw new Error("unexpected");
      applyGallery(data);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <Stack direction="row" spacing={1}>
        <CircularProgress size={20} />
        <Typography>{copy.loading}</Typography>
      </Stack>
    );
  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Button
        disabled={busy}
        onClick={() => {
          setLoading(true);
          setError(null);
          setReloadKey((value) => value + 1);
        }}
      >
        {copy.reload}
      </Button>
      {gallery ? (
        <>
          <Typography variant="body2">{copy.help}</Typography>
          <Typography variant="caption">
            {copy.limits.replace("{limit}", String(gallery.limit))}
          </Typography>
          {target.variantId ? (
            <Alert severity="info">
              {gallery.source === "variant"
                ? copy.own
                : gallery.source === "product"
                  ? copy.fallback
                  : copy.noImages}
            </Alert>
          ) : !gallery.images.length ? (
            <Alert severity="warning">{copy.noImages}</Alert>
          ) : null}
          {target.variantId && gallery.source === "product" ? (
            <FilesViewer
              files={gallery.resolvedImages.map(documentFor)}
              trads={copy.uploader}
            />
          ) : null}
          <FilesUploader
            multiple
            enableReorder
            disabled={busy}
            maxFiles={gallery.limit}
            maxFileSize={ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES}
            acceptedMimeTypes={ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES}
            onFilesRejected={() => showError(new Error("rejected"))}
            initialFiles={documents}
            onFilesChange={changeFiles}
            setFilesToDelete={setFilesToDelete}
            permitedFileTypes={{
              images: true,
              documents: false,
              videos: false,
              texts: false,
            }}
            trads={copy.uploader}
          />
          {documents.map((file, index) => (
            <Stack key={file.id} spacing={0.5}>
              <Typography variant="body2">{file.fileName}</Typography>
              <TextField
                size="small"
                fullWidth
                disabled={busy}
                label={`${copy.alt} ${index + 1}`}
                value={altTexts[file.id] ?? ""}
                helperText={copy.altHelp}
                slotProps={{ htmlInput: { maxLength: 500 } }}
                onChange={(event) =>
                  setAltTexts((values) => ({
                    ...values,
                    [file.id]: event.target.value,
                  }))
                }
              />
              {file.fullPath ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {file.fullPath}
                </Typography>
              ) : null}
            </Stack>
          ))}
          <Button
            variant="contained"
            disabled={busy || !dirty}
            onClick={() => {
              if (removedCount) setConfirmSave(true);
              else void save();
            }}
          >
            {busy ? copy.saving : copy.save}
          </Button>
          <Typography variant="caption">{copy.recoverable}</Typography>
          <Typography variant="h6" component="h3">
            {copy.trash} ({gallery.trash.length})
          </Typography>
          {dirty ? (
            <Typography variant="caption">{copy.saveBeforeRestore}</Typography>
          ) : null}
          {!gallery.trash.length ? (
            <Typography variant="body2" color="text.secondary">
              {copy.emptyTrash}
            </Typography>
          ) : (
            gallery.trash.map((image) => (
              <Stack
                key={image.id}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Box
                  component="img"
                  src={image.publicUrl}
                  alt={image.altText}
                  sx={{ width: 56, height: 56, objectFit: "contain" }}
                />
                <Typography
                  variant="body2"
                  sx={{ flex: 1, overflowWrap: "anywhere" }}
                >
                  {image.fileName}
                </Typography>
                <Button
                  size="small"
                  disabled={busy || dirty}
                  onClick={() => void restore(image.id)}
                >
                  {copy.restore}
                </Button>
              </Stack>
            ))
          )}
        </>
      ) : null}
      <Dialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{copy.saveConfirmTitle}</DialogTitle>
        <DialogContent>
          {copy.saveConfirmBody.replace("{count}", String(removedCount))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSave(false)}>
            {copy.keepEditing}
          </Button>
          <Button onClick={() => void save()}>{copy.confirmSave}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
