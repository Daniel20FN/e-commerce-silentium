import {
  Description,
  InsertDriveFile,
  PhotoLibrary,
  PictureAsPdf,
  VideoLibrary,
} from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import { DocumentType } from "../files-uploader/types";
import { allowedImageExtensions, isImage } from "./services/is_image";
import { allowedVideoExtensions, isVideo } from "./services/is_video";

interface FileIconProps {
  fileName: string;
  type?: string;
}

interface FilePreviewProps {
  file: DocumentType;
}

export const getFileIcon = ({ fileName, type }: FileIconProps) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (
    type?.startsWith("image/") ||
    allowedImageExtensions.includes(extension || "")
  ) {
    return (
      <PhotoLibrary
        sx={{ fontSize: { xs: 24, sm: 32, md: 40 }, color: "primary.main" }}
      />
    );
  }

  if (
    type?.startsWith("video/") ||
    allowedVideoExtensions.includes(extension || "")
  ) {
    return (
      <VideoLibrary
        sx={{ fontSize: { xs: 24, sm: 32, md: 40 }, color: "secondary.main" }}
      />
    );
  }

  if (type === "application/pdf" || extension === "pdf") {
    return (
      <PictureAsPdf
        sx={{ fontSize: { xs: 24, sm: 32, md: 40 }, color: "error.main" }}
      />
    );
  }

  if (
    type?.includes("word") ||
    type?.includes("document") ||
    ["doc", "docx"].includes(extension || "")
  ) {
    return (
      <Description
        sx={{ fontSize: { xs: 24, sm: 32, md: 40 }, color: "info.main" }}
      />
    );
  }

  return (
    <InsertDriveFile
      sx={{ fontSize: { xs: 24, sm: 32, md: 40 }, color: "grey.600" }}
    />
  );
};

export const FileViewBox = ({ file }: FilePreviewProps) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  if (isImage(file.fileName, file.type)) {
    if (imageError) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            bgcolor: "grey.50",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {getFileIcon({ fileName: file.fileName, type: file.type })}
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            {file.fileName.split(".").pop()?.toUpperCase()}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          bgcolor: "grey.100",
          position: "relative",
        }}
      >
        <Image
          src={file.dbUrl ? file.dbUrl : file.url}
          alt={file.fileName || "Vista previa del archivo"}
          fill
          style={{
            objectFit: "contain",
            transition: "transform 0.3s ease-in-out",
          }}
          onError={(e) => {
            console.error("Error loading image:", e);
            setImageError(true);
          }}
        />
      </Box>
    );
  }

  if (isVideo(file.fileName, file.type)) {
    if (videoError) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            bgcolor: "grey.50",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {getFileIcon({ fileName: file.fileName, type: file.type })}
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            {file.fileName.split(".").pop()?.toUpperCase()}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          bgcolor: "grey.900",
        }}
      >
        <video
          src={file.dbUrl ? file.dbUrl : file.url}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
          muted
          playsInline
          onMouseEnter={(e) => {
            const video = e.currentTarget;
            video.play().catch(() => {});
          }}
          onMouseLeave={(e) => {
            const video = e.currentTarget;
            video.pause();
            video.currentTime = 0;
          }}
          onError={(e) => {
            console.error("Error loading video:", e);
            setVideoError(true);
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        bgcolor: "grey.50",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      {getFileIcon({ fileName: file.fileName, type: file.type })}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        {file.fileName.split(".").pop()?.toUpperCase()}
      </Typography>
    </Box>
  );
};
