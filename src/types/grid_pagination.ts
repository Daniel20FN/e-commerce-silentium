import { GridPaginationModel } from "@mui/x-data-grid";

export type PaginationWithRecordsType<T = object> =
  | (T & { records?: never; paginationModel: GridPaginationModel })
  | (T & { records: number; paginationModel?: never });

export type PaginationType<T = object> = T & {
  paginationModel: GridPaginationModel;
};
