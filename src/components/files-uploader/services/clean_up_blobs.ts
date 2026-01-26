import { DocumentType } from "../types";

export function cleanupBlobUrls(files: DocumentType[]) {
  return files.map((file) => {
    if (file.url.startsWith("blob:")) {
      URL.revokeObjectURL(file.url);
    }
    return {
      ...file,
      url: "",
    };
  });
}
