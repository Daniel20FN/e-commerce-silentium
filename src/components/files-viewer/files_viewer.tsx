import { Clear, Delete, PhotoLibrary, Visibility } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Fade,
  Grid,
  IconButton,
  Typography,
  Zoom,
} from "@mui/material";
import { useDialog } from "../dialog/dialog_context";
import { DocumentType } from "../files-uploader/types";
import FileDialogPreview from "./files_dialog_preview";
import { FileViewBox } from "./files_view_box";
import { formatFileSize } from "./services/format_file_size";

interface FilesViewerProps {
  files: DocumentType[];
  isDisabled?: boolean;
  removeFiles?: (files: DocumentType[]) => void;
  trads: {
    selected_files: string;
    clean_all: string;
    documents_preview: string;
    download_file: string;
    size: string;
    this_file_type_is_not_permited: string;
    close?: string;
  };
}

export const FilesViewer = ({
  files,
  isDisabled,
  removeFiles,
  trads,
}: FilesViewerProps) => {
  const { openDialog } = useDialog();

  return (
    <Fade in timeout={500}>
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: { xs: 1.5, sm: 2 },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 0 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhotoLibrary
              color="primary"
              sx={{ fontSize: { xs: 20, sm: 24 } }}
            />
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                fontSize: { xs: "0.875rem", sm: "1rem", md: "1.25rem" },
              }}
            >
              {trads.selected_files}
            </Typography>
            <Chip
              label={files.length}
              size="small"
              color="primary"
              sx={{
                ml: 1,
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                margin: 0.5,
              }}
            />
          </Box>

          {removeFiles && (
            <Button
              variant="outlined"
              disabled={isDisabled}
              startIcon={<Clear sx={{ fontSize: { xs: 16, sm: 20 } }} />}
              onClick={() => {
                if (!isDisabled) {
                  removeFiles(files);
                }
              }}
              sx={{
                textTransform: "none",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                px: { xs: 1, sm: 2 },
                py: { xs: 0.5, sm: 1 },
              }}
              aria-label={trads.clean_all}
            >
              {trads.clean_all}
            </Button>
          )}
        </Box>
        {/* File Grid */}
        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
          {files.map((file, index) => (
            <Grid key={file.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Zoom
                in
                timeout={300}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <Card
                  elevation={2}
                  sx={{
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.3s ease-in-out",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      elevation: 8,
                      transform: "translateY(-4px)",
                      "& .file-overlay": {
                        opacity: 1,
                      },
                      "& .action-buttons": {
                        opacity: 1,
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      aspectRatio: "1/1",
                      overflow: "hidden",
                    }}
                  >
                    <FileViewBox file={file} />

                    {/* Overlay */}
                    <Box
                      className="file-overlay"
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: "rgba(0, 0, 0, 0.3)",
                        opacity: 0,
                        transition: "opacity 0.3s ease-in-out",
                      }}
                    />

                    {/* Action Buttons */}
                    <Box
                      className="action-buttons"
                      sx={{
                        position: "absolute",
                        top: { xs: 4, sm: 8 },
                        right: { xs: 4, sm: 8 },
                        display: "flex",
                        gap: 0.5,
                        opacity: 0,
                        transition: "opacity 0.3s ease-in-out",
                      }}
                    >
                      <IconButton
                        onClick={() => {
                          openDialog({
                            title: trads.documents_preview,
                            confirmText: trads.close || "Cerrar",
                            onConfirm: ({ closeDialog }) => {
                              closeDialog({});
                            },
                            content: (
                              <FileDialogPreview
                                file={file}
                                filePreview={(file: DocumentType) => (
                                  <FileViewBox file={file} />
                                )}
                                trads={{
                                  download_file: trads.download_file,
                                  size: trads.size,
                                  this_file_type_is_not_permited:
                                    trads.this_file_type_is_not_permited,
                                }}
                              />
                            ),
                          });
                        }}
                        sx={{
                          bgcolor: "primary.main",
                          color: "white",
                          "&:hover": { bgcolor: "primary.dark" },
                          width: { xs: 28, sm: 32 },
                          height: { xs: 28, sm: 32 },
                        }}
                        size="small"
                        aria-label={trads.documents_preview}
                      >
                        <Visibility sx={{ fontSize: { xs: 14, sm: 16 } }} />
                      </IconButton>
                      {removeFiles && (
                        <IconButton
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              removeFiles([file]);
                            }
                          }}
                          sx={{
                            bgcolor: "error.main",
                            color: "white",
                            "&:hover": { bgcolor: "error.dark" },
                            width: { xs: 28, sm: 32 },
                            height: { xs: 28, sm: 32 },
                          }}
                          size="small"
                          aria-label={`Eliminar ${file.fileName}`}
                        >
                          <Delete sx={{ fontSize: { xs: 14, sm: 16 } }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ p: { xs: 1, sm: 1.5 }, flexGrow: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        mb: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                      title={file.fileName}
                    >
                      {file.fileName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                    >
                      {formatFileSize(file.size ?? 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Fade>
  );
};
