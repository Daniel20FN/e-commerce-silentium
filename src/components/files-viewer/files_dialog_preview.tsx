import { Download } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { DocumentType } from "../files-uploader/types";
import { getFileIcon } from "./files_view_box";
import { formatFileSize } from "./services/format_file_size";
import { isPDF } from "./services/id_pdf";
import { isImage } from "./services/is_image";
import { isVideo } from "./services/is_video";

interface DocumentsPreviewDialogProps {
  file: DocumentType;
  filePreview: (file: DocumentType) => React.JSX.Element;
  trads: {
    download_file: string;
    size: string;
    this_file_type_is_not_permited: string;
  };
}

const FileDialogPreview = ({
  file,
  filePreview,
  trads,
}: DocumentsPreviewDialogProps) => {
  const downloadFile = (file: DocumentType) => {
    try {
      const fileUrl = file.dbUrl ?? file.url;
      if (!fileUrl) {
        console.error("No file URL available for download");
        return;
      }
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = file.fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  return (
    <Stack>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" noWrap>
            {file.fileName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.size ?? 0)}
          </Typography>
        </Box>
        <IconButton
          onClick={() => downloadFile(file)}
          title={trads.download_file}
          aria-label={trads.download_file}
        >
          <Download />
        </IconButton>
      </Box>
      <Box>
        {isImage(file.fileName, file.type) ? (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: { xs: 280, sm: 360, md: 460 },
            }}
          >
            {filePreview(file)}
          </Box>
        ) : isVideo(file.fileName, file.type) ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "grey.900",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <video
              src={file.dbUrl ? file.dbUrl : file.url}
              width="100%"
              height="auto"
              controls
              preload="metadata"
              style={{
                maxHeight: "300px",
                borderRadius: "8px",
                outline: "none",
              }}
              onError={(e) => {
                console.error("Error loading video:", e);
              }}
              onLoadStart={() => {
                console.log("Video loading started for:", file.fileName);
              }}
            />
          </Box>
        ) : isPDF(file.fileName, file.type) ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <iframe
              src={file.dbUrl ?? file.url}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                minHeight: "500px",
              }}
              title={`Vista previa de ${file.fileName}`}
            />
          </Box>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {trads.this_file_type_is_not_permited}
            </Alert>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              {getFileIcon({ fileName: file.fileName, type: file.type })}
              <Typography variant="h6">{file.fileName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {trads.size}: {formatFileSize(file.size)}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => downloadFile(file)}
              >
                {trads.download_file}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default FileDialogPreview;
