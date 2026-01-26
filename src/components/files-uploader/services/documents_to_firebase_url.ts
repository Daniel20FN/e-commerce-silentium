import { DocumentType } from "../types";

export async function documentsToFirebaseUrl({
  files,
  firebaseUploader,
  path,
}: {
  files: DocumentType[];
  firebaseUploader: (
    arrayBuffer: ArrayBuffer,
    fullPath: string,
  ) => Promise<unknown>;
  path: string;
}): Promise<DocumentType[] | undefined> {
  try {
    const updatedDocuments = await Promise.all(
      files.map(async (file) => {
        if (file.originalFile) {
          const arrayBuffer = await file.originalFile.arrayBuffer();
          const fileName = file.fileName.replace(/\s+/g, "_");
          const fullPath = `/${path}/${file.id}/${fileName}`;

          const result = await firebaseUploader(arrayBuffer, fullPath);

          if (
            typeof result === "object" &&
            result !== null &&
            "url" in result &&
            typeof result.url === "string"
          ) {
            return {
              id: file.id,
              url: "",
              dbUrl: result.url,
              fullPath,
              fileName,
              size: file.size,
              type: file.type,
            };
          } else {
            return file;
          }
        }

        return file;
      }),
    );

    return updatedDocuments;
  } catch (error) {
    console.error(error);
  }
}
