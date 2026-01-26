import { AvailableFileType } from "../types";

type VerifyPermitedFileTypesPropResponse = {
  fileTypes: Record<string, string[]>;
  allFalse: boolean;
};

export const verifyPermitedFileTypesProp = (
  obj: AvailableFileType,
): VerifyPermitedFileTypesPropResponse => {
  const supportedFileFormats: AvailableFileType = {
    images: obj.images ?? true,
    documents: obj.documents ?? true,
    texts: obj.texts ?? true,
    videos: obj.videos ?? true,
  };

  const allFalse =
    !supportedFileFormats.images &&
    !supportedFileFormats.documents &&
    !supportedFileFormats.texts &&
    !supportedFileFormats.videos;
  const acceptedTypes: Record<string, string[]> = {};

  if (supportedFileFormats.images) {
    acceptedTypes["image/*"] = [];
  }

  if (supportedFileFormats.documents) {
    acceptedTypes["application/pdf"] = [];
    acceptedTypes["application/msword"] = [];
    acceptedTypes[
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ] = [];
  }

  if (supportedFileFormats.texts) {
    acceptedTypes["text/plain"] = [];
  }

  if (supportedFileFormats.videos) {
    acceptedTypes["video/*"] = [];
  }

  return { fileTypes: acceptedTypes, allFalse };
};
