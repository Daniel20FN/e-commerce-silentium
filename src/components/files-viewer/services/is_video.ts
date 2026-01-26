export const allowedVideoExtensions = [
  "mp4",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "mkv",
  "m4v",
  "3gp",
  "ogg",
  "ogv",
];

export const isVideo = (fileName: string, type?: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return (
    type?.startsWith("video/") ||
    allowedVideoExtensions.includes(extension || "")
  );
};
