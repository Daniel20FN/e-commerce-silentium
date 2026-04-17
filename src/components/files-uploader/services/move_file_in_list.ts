import type { DocumentType } from "../types";

export function moveFileInList(
  files: readonly DocumentType[],
  fromIndex: number,
  toIndex: number,
): DocumentType[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= files.length ||
    toIndex >= files.length
  ) {
    return [...files];
  }

  const nextFiles = [...files];
  const [movedFile] = nextFiles.splice(fromIndex, 1);

  if (!movedFile) {
    return [...files];
  }

  nextFiles.splice(toIndex, 0, movedFile);

  return nextFiles;
}
