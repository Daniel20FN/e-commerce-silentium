import { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";

export const defaultGridPagination: GridPaginationModel = {
  pageSize: 25,
  page: 0,
};

export const defaultGridSorting = (
  gridSortItem?: GridSortModel[number],
): GridSortModel => [
  {
    field: gridSortItem ? gridSortItem.field : "name",
    sort: gridSortItem ? gridSortItem.sort : "asc",
  },
];
