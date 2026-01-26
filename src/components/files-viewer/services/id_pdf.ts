export const allowedPDFExtensions = ["pdf"];

export const isPDF = (fileName: string, type?: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return (
    type === "application/pdf" || allowedPDFExtensions.includes(extension || "")
  );
};
