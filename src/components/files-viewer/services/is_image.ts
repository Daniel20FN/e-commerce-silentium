export const allowedImageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

export const isImage = (fileName: string, type?: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return (
    type?.startsWith("image/") ||
    allowedImageExtensions.includes(extension || "")
  );
};
