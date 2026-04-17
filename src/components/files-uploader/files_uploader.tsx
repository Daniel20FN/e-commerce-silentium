import { CloudUpload, DragIndicator, PhotoLibrary } from "@mui/icons-material";
import { Box, Fade, Paper, Typography, Zoom } from "@mui/material";
import { alpha } from "@mui/material/styles";
import * as React from "react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FilesViewer } from "../files-viewer/files_viewer";
import { moveFileInList } from "./services/move_file_in_list";
import { verifyPermitedFileTypesProp } from "./services/verify_allowed_file_types";
import { AvailableFileType, DocumentType } from "./types";

interface FilesUploaderProps {
  disableClick?: boolean;
  disabled?: boolean;
  multiple: boolean;
  disableDrag?: boolean;
  enableReorder?: boolean;
  onFilesChange?: (files: DocumentType[]) => void;
  initialFiles?: DocumentType[];
  permitedFileTypes?: AvailableFileType;
  trads: {
    download_file: string;
    size: string;
    this_file_type_is_not_permited: string;
    upload_documents: string;
    drag_an_drop_files_or_click_to_select_them: string;
    supports_images_pdf_word_docs_and_txt: string;
    selected_files: string;
    clean_all: string;
    documents_preview: string;
    not_selected_files: string;
    drag_or_click_some_files_in_the_area: string;
    drop_files_here: string;
    file_upload_disabled: string;
    drag_or_click_to_select: string;
    close?: string;
    move_file_backward?: string;
    move_file_forward?: string;
    remove_file?: string;
    primary_file?: string;
  };
  maxFiles?: number;
  maxFileSize?: number;
  setFilesToDelete: React.Dispatch<
    React.SetStateAction<
      {
        dbUrl: string;
      }[]
    >
  >;
}

/**
 * Componente para subir y previsualizar documentos.
 *
 * @param {boolean} multiple - Si se permite seleccionar múltiples archivos.
 * @param {boolean} [disableDrag] - Si se debe deshabilitar el arrastre de archivos.
 * @param {number} [maxFiles] - Número máximo de archivos permitidos.
 * @param {boolean} [disabled] - Si se debe deshabilitar toda la interacción.
 * @param {boolean} [disableClick] - Si se debe deshabilitar la apertura del selector al hacer clic.
 * @param {(files: PrismaJson.DocumentType[]) => void} [onFilesChange] - Función que recibe los archivos actuales cada vez que hay un cambio.
 * @param {PrismaJson.DocumentType[]} [initialFiles] - Archivos que se muestran inicialmente.
 * @param {Dictionary} dictionary - Diccionario de traducción.
 * @param {React.Dispatch<React.SetStateAction<{ dbUrl: string }[]>>} setFilesToDelete - Función para indicar los archivos eliminados con `dbUrl`, para su posterior borrado en BDD o AWS.
 *
 * @remarks
 * - Para preview se acepta `word`, `pdf`, `imagen` y `txt`.
 * - Este componente genera blobs URL a partir de archivos `File` para previsualización.
 * - Recuerda llamar a `cleanupBlobUrls` (función exportada desde este componente) al desmontar o al limpiar los documentos para evitar saturar la memoria.
 * - Al final verás un ejemplo de como usarlo(cleanupBlobUrls).
 * - Si pasas archivos desde la BDD como `initialFiles`, asegúrate de que `originalFile` esté `undefined`.
 * - Si eliminas archivos que contienen `dbUrl`, se añaden a `setFilesToDelete`.
 * - Asegúrate de que el tipo de documentos coincida con `PrismaJson.DocumentType`:
 *   ```ts
 *   type DocumentType = {
 *     id: string;
 *     url: string;
 *     dbUrl?: string;
 *     fullPath?: string;
 *     fileName: string;
 *     originalFile?: File;
 *     size: number;
 *     type?: string;
 *   }
 *   ```
 * @example
 * import { cleanupBlobUrls } from "@/components/documents_uploader";
 * - En este caso de uso, se llama al guardar, o cancelar los cambios en el objeto que contiene los documentos.
 *
 *  value contiene los cambios realizados a los documentos.
 *
 * onAccept: () => {
 *   value.documents = cleanupBlobUrls(value.documents);
 *   value.cv = cleanupBlobUrls([value.cv])[0];
 *   ...
 * }
 * onCancel: () => {
 *   value.documents = cleanupBlobUrls(value.documents);
 *   value.cv = cleanupBlobUrls([value.cv])[0];
 *   ...
 * }
 */

export const FilesUploader = ({
  multiple,
  disableDrag,
  enableReorder = false,
  maxFiles,
  maxFileSize,
  disabled,
  disableClick,
  onFilesChange,
  setFilesToDelete,
  initialFiles = [],
  permitedFileTypes = {
    images: true,
    documents: true,
    texts: true,
    videos: true,
  },
  trads,
}: FilesUploaderProps) => {
  const formatedFiles = React.useMemo(() => {
    return initialFiles.map((file) => {
      const baseFile = {
        ...file,
        id: file.id ? file.id : crypto.randomUUID(),
      };

      if (file.dbUrl == undefined && file.originalFile != undefined) {
        try {
          return {
            ...baseFile,
            url: URL.createObjectURL(file.originalFile),
            originalFile: file.originalFile,
            fileName: file.originalFile.name,
            size: file.size,
            type: file.type,
          };
        } catch (error) {
          console.error("Error creating object URL for file:", error);
          return baseFile;
        }
      }

      return baseFile;
    });
  }, [initialFiles]);

  const [files, setFiles] = useState<DocumentType[]>(() => formatedFiles);

  // --- FEEDBACK LOOP GUARDS ---
  // Helper to create a signature for files array, used for shallow change detection
  const makeSignature = (arr: DocumentType[]) =>
    arr
      .map(
        (f) =>
          `${f.fileName}-${f.size}-${f.type ?? ""}-${f.dbUrl ?? ""}-${(f.originalFile as File | undefined)?.lastModified ?? ""}`,
      )
      .join("|");

  const isFirstRender = React.useRef(true);
  const prevFilesSignature = React.useRef("");
  const syncingFromProps = React.useRef(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles((prev) => {
        if (typeof maxFiles === "number") {
          if (prev.length >= maxFiles) {
            return prev;
          }
          const availableSlots = maxFiles - prev.length;
          if (acceptedFiles.length > availableSlots) {
            acceptedFiles = acceptedFiles.slice(0, availableSlots);
          }
        }

        // Filter files by maxFileSize if specified
        const validFiles =
          typeof maxFileSize === "number"
            ? acceptedFiles.filter((file) => {
                if (file.size > maxFileSize) {
                  console.warn(
                    `File ${file.name} exceeds maximum size of ${maxFileSize} bytes`,
                  );
                  return false;
                }
                return true;
              })
            : acceptedFiles;

        // Filter out duplicate files (by name and size)
        const uniqueFiles = validFiles.filter((file) => {
          const isDuplicate = prev.some(
            (existingFile) =>
              existingFile.fileName === file.name &&
              existingFile.size === file.size,
          );
          if (isDuplicate) {
            console.warn(
              `File ${file.name} is already in the list and will be skipped`,
            );
          }
          return !isDuplicate;
        });

        const newFiles: DocumentType[] = uniqueFiles.map((file) => ({
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          originalFile: file,
          fileName: file.name,
          size: file.size,
          type: file.type,
        }));
        return [...prev, ...newFiles];
      });
    },
    [maxFiles, maxFileSize],
  );

  const { fileTypes, allFalse } =
    verifyPermitedFileTypesProp(permitedFileTypes);

  const isDisabled = disabled || allFalse;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: fileTypes,
    onDrop,
    noClick: disableClick,
    disabled: isDisabled,
    noDrag: disableDrag,
    multiple: multiple,
    maxFiles: maxFiles,
    maxSize: maxFileSize,
  });

  const removeFiles = (filesToDelete: DocumentType[]) => {
    for (const file of filesToDelete) {
      if (file.dbUrl) {
        setFilesToDelete((prev) => [...prev, { dbUrl: file.dbUrl! }]);
      }
      setFiles((prev) => {
        const fileToRemove = prev.find((f) => f.id === file.id);
        if (fileToRemove && fileToRemove.url.startsWith("blob:")) {
          URL.revokeObjectURL(fileToRemove.url);
        }
        return prev.filter((f) => f.id !== file.id);
      });
    }
  };

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prevFiles) => moveFileInList(prevFiles, fromIndex, toIndex));
  }, []);

  // Notify parent component of file changes, avoiding initial echo and redundant updates
  React.useEffect(() => {
    const currentSig = makeSignature(files);

    // Skip first render to avoid echoing initialFiles back to parent
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevFilesSignature.current = currentSig;
      return;
    }

    // If we're syncing from props, don't notify parent to avoid ping-pong
    if (syncingFromProps.current) {
      syncingFromProps.current = false;
      prevFilesSignature.current = currentSig;
      return;
    }

    // Avoid calling when nothing really changed
    if (currentSig === prevFilesSignature.current) return;

    prevFilesSignature.current = currentSig;
    if (onFilesChange) onFilesChange(files);
  }, [files, onFilesChange]);

  // Keep local state in sync if parent changes initialFiles
  React.useEffect(() => {
    const propsSig = makeSignature(formatedFiles);
    const stateSig = makeSignature(files);
    if (propsSig !== stateSig) {
      syncingFromProps.current = true;
      setFiles(formatedFiles);
    }
  }, [files, formatedFiles]);

  // Cleanup blobs on unmount
  React.useEffect(() => {
    const currentFiles = files;
    return () => {
      currentFiles.forEach((file) => {
        if (file.url && file.url.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: 0,
        p: { xs: 1, sm: 2 },
        overflow: "auto",
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h6"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 600,
            fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },
          }}
        >
          {trads.upload_documents}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          {trads.drag_an_drop_files_or_click_to_select_them}
        </Typography>
      </Box>

      {/* Dropzone Area */}
      <Paper
        elevation={isDragActive ? 8 : 2}
        sx={{
          mb: { xs: 2, sm: 3 },
          transition: "all 0.3s ease-in-out",
          transform: isDragActive ? "scale(1.02)" : "scale(1)",
        }}
      >
        <Box
          {...getRootProps()}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            textAlign: "center",
            cursor: isDisabled ? "not-allowed" : "pointer",
            border: 2,
            borderStyle: "dashed",
            borderColor: isDragActive ? "primary.main" : "grey.300",
            borderRadius: 2,
            bgcolor: isDragActive
              ? (theme) => alpha(theme.palette.primary.main, 0.05)
              : "transparent",
            transition: "all 0.3s ease-in-out",
            "&:hover": !isDisabled
              ? {
                  borderColor: "primary.main",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                }
              : undefined,
            opacity: isDisabled ? 0.6 : 1,
          }}
        >
          <input {...getInputProps()} />

          <Zoom in timeout={300}>
            <Box
              sx={{
                width: { xs: 40, sm: 60, md: 80 },
                height: { xs: 40, sm: 60, md: 80 },
                borderRadius: "50%",
                bgcolor: isDragActive ? "primary.main" : "grey.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: { xs: 1, sm: 2 },
                transition: "all 0.3s ease-in-out",
              }}
            >
              {isDragActive ? (
                <DragIndicator
                  sx={{ fontSize: { xs: 20, sm: 30, md: 40 }, color: "white" }}
                />
              ) : (
                <CloudUpload
                  sx={{
                    fontSize: { xs: 20, sm: 30, md: 40 },
                    color: "grey.600",
                  }}
                />
              )}
            </Box>
          </Zoom>

          <Typography
            variant="body1"
            gutterBottom
            sx={{
              fontWeight: 500,
              fontSize: { xs: "0.875rem", sm: "1rem", md: "1.25rem" },
            }}
          >
            {isDragActive
              ? trads.drop_files_here
              : isDisabled
                ? trads.file_upload_disabled
                : trads.drag_or_click_to_select}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          >
            {trads.supports_images_pdf_word_docs_and_txt}
          </Typography>
        </Box>
      </Paper>

      {/* File Previews Header */}
      {files.length > 0 && (
        <FilesViewer
          files={files}
          enableReorder={enableReorder}
          isDisabled={isDisabled}
          onReorder={reorderFiles}
          removeFiles={removeFiles}
          trads={{
            ...trads,
            close: trads.close || "Cerrar",
          }}
        />
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <Fade in timeout={800}>
          <Box sx={{ textAlign: "center", py: { xs: 3, sm: 4, md: 6 } }}>
            <PhotoLibrary
              sx={{
                fontSize: { xs: 40, sm: 48, md: 64 },
                color: "grey.400",
                mb: 2,
              }}
            />
            <Typography
              variant="body1"
              color="text.secondary"
              gutterBottom
              sx={{ fontSize: { xs: "0.875rem", sm: "1rem", md: "1.25rem" } }}
            >
              {trads.not_selected_files}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
            >
              {trads.drag_or_click_some_files_in_the_area}
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export { cleanupBlobUrls } from "./services/clean_up_blobs";
