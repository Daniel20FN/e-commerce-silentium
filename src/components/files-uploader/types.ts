export type DocumentType = {
  id: string;
  url: string;
  dbUrl?: string;
  fullPath?: string;
  fileName: string;
  originalFile?: File;
  size: number;
  type?: string;
};

export type AvailableFileType = {
  images?: boolean;
  documents?: boolean;
  texts?: boolean;
  videos?: boolean;
};
