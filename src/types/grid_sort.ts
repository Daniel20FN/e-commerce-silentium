import { GridSortModel } from "@mui/x-data-grid";

export type SortType<T = object> = T & {
  sortModel: GridSortModel;
};
