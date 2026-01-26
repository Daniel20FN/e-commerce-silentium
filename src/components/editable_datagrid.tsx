import { Dictionary } from "@/dictionary/services/get-dictionary";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Checkbox, IconButton, Stack, Tooltip } from "@mui/material";
import {
  DataGrid,
  DataGridProps,
  GridActionsCellItem,
  GridColDef,
  GridRowsProp,
  useGridApiRef,
} from "@mui/x-data-grid";
import React, { useEffect } from "react";
import CustomNoRowsOverlay from "./custom_no_rows_overlay";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EditableDatagridColumn<K = any> = GridColDef & {
  onEdit?: (id: string, value: K) => void;
};

export function EditableDataGrid({
  enabled,
  dictionary,
  getRows,
  columns,
  onAdded,
  onRemoved,
  onRowsSelected,
  defaultRowsSelected,
  hideableActions = true,
  iconSelection,
  checkedIconSelection,
  ...params
}: {
  enabled: boolean;
  dictionary: Dictionary;
  getRows: () => GridRowsProp;
  columns: EditableDatagridColumn[];
  onAdded?: (updateRows: () => void) => void;
  onRemoved?: (id: string, updateRows: () => void) => void;
  hideableActions?: boolean;
  onRowsSelected?: (rows: string[]) => void;
  defaultRowsSelected?: string[];
  iconSelection?: React.ReactNode;
  checkedIconSelection?: React.ReactNode;
} & Omit<DataGridProps, "columns">) {
  const [rows, setRows] = React.useState<GridRowsProp>(() => getRows());
  const [selectedRowIds, setSelectedRowIds] = React.useState<
    string[] | undefined
  >(defaultRowsSelected || []);
  const [allSelected, setAllSelected] = React.useState<boolean>(false);

  const internalApiRef = useGridApiRef();
  const apiRef = params.apiRef ?? internalApiRef;

  useEffect(() => {
    setRows(() => getRows());
  }, [getRows]);

  const handleRowSelection = (id: string) => {
    setSelectedRowIds((prevSelected) => {
      if (prevSelected == undefined) return;
      const isSelected = prevSelected.includes(id);
      let newSelected: string[];
      if (isSelected) {
        newSelected = prevSelected.filter((rowId) => rowId !== id);
      } else {
        newSelected = [...prevSelected, id];
      }

      if (onRowsSelected) {
        onRowsSelected(newSelected);
      }

      return newSelected;
    });
  };
  const hangleRowSelectAll = (checked: boolean) => {
    setSelectedRowIds(() => {
      const rows = getRows();
      let newSelected: string[];

      if (checked) {
        newSelected = rows.map((row) => row.id);
      } else {
        newSelected = [];
      }

      if (onRowsSelected) onRowsSelected(newSelected);

      return newSelected;
    });
  };

  useEffect(() => {
    const rowsLenght = getRows().length;
    if (selectedRowIds?.length != 0 && selectedRowIds?.length === rowsLenght) {
      setAllSelected(true);
    } else {
      setAllSelected(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRowIds]);

  return (
    <DataGrid
      {...params}
      apiRef={apiRef}
      localeText={{
        ...(params.localeText ? params.localeText : undefined),
        toolbarColumns: dictionary.grid.columns,
        toolbarFilters: dictionary.grid.filters,
        toolbarDensity: dictionary.grid.density,
        toolbarDensityCompact: dictionary.grid.compact,
        toolbarDensityStandard: dictionary.grid.standard,
        toolbarDensityComfortable: dictionary.grid.comfortable,
        toolbarExport: dictionary.general.export,
        toolbarExportCSV: dictionary.general.exportCSV,
        toolbarExportPrint: dictionary.general.print,
        filterPanelColumns: dictionary.grid.columns,
        filterPanelOperator: dictionary.grid.operator,
        filterPanelInputLabel: dictionary.grid.value,
        filterOperatorContains: dictionary.grid.contains,
        filterOperatorDoesNotContain: dictionary.grid.doesNotContains,
        filterOperatorEquals: dictionary.grid.equals,
        filterOperatorDoesNotEqual: dictionary.grid.doesNotEqual,
        filterOperatorStartsWith: dictionary.grid.startsWith,
        filterOperatorEndsWith: dictionary.grid.endsWith,
        filterOperatorIsEmpty: dictionary.grid.isEmpty,
        filterOperatorIsNotEmpty: dictionary.grid.isNotEmpty,
        filterOperatorIsAnyOf: dictionary.grid.isAnyOf,
        filterOperatorIs: dictionary.grid.is,
        filterValueAny: dictionary.grid.any,
        filterValueTrue: dictionary.grid.true,
        filterValueFalse: dictionary.grid.false,
        columnMenuHideColumn: dictionary.grid.hideColumn,
        columnMenuManageColumns: dictionary.grid.manageColumn,
        columnMenuFilter: dictionary.grid.filter,
        columnMenuSortAsc: dictionary.grid.sortAsc,
        columnMenuSortDesc: dictionary.grid.sortDesc,
        columnMenuUnsort: dictionary.grid.unsort,
        columnMenuShowColumns: dictionary.grid.showColumns,
        columnsManagementShowHideAllText: dictionary.grid.showHideAllColumns,
        columnsManagementReset: dictionary.grid.reset,
        columnsManagementSearchTitle: dictionary.grid.searchColumns,
      }}
      slots={{
        ...(params?.slots ? params.slots : undefined),
        noRowsOverlay: () => <CustomNoRowsOverlay dictionary={dictionary} />,
      }}
      slotProps={{
        ...(params.slotProps ? params.slotProps : undefined),
        loadingOverlay: {
          variant: "circular-progress",
          noRowsVariant: "circular-progress",
        },
      }}
      onCellEditStop={async (params) => {
        await new Promise((f) => setTimeout(f, 100));
        const column = columns.find((e) => e.field == params.field);
        if (column && column.onEdit && apiRef.current) {
          column.onEdit(
            params.id.toString(),
            apiRef.current.getCellValue(params.id, params.field),
          );
        }
      }}
      columns={[
        ...(onRowsSelected != undefined
          ? [
              {
                field: "select",
                headerName: "",
                width: 50,
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                disableExport: true,
                renderHeader: () => {
                  return (
                    <Checkbox
                      disabled={!enabled}
                      checked={allSelected}
                      onChange={(_, checked) => {
                        hangleRowSelectAll(checked);
                        setAllSelected(checked);
                      }}
                      icon={iconSelection}
                      checkedIcon={checkedIconSelection}
                    />
                  );
                },
                renderCell: (paramsInternal: {
                  id: { toString: () => string };
                }) => {
                  return (
                    <Checkbox
                      disabled={!enabled}
                      checked={selectedRowIds?.includes(
                        paramsInternal.id.toString(),
                      )}
                      onChange={() =>
                        handleRowSelection(paramsInternal.id.toString())
                      }
                      icon={iconSelection}
                      checkedIcon={checkedIconSelection}
                    />
                  );
                },
              } as EditableDatagridColumn,
            ]
          : []),
        ...columns.map((e) => {
          return {
            ...e,
            editable: typeof e.editable === "boolean" ? e.editable : enabled,
          };
        }),
        ...(enabled && (onAdded != undefined || onRemoved != undefined)
          ? ([
              {
                field: "actions",
                type: "actions",
                hideable: hideableActions,
                width: 100,
                renderHeader: () => {
                  if (onAdded) {
                    return (
                      <Stack direction={"row"}>
                        <Tooltip title={dictionary.grid.addRow}>
                          <IconButton
                            id="add-editable-datagrid-button"
                            onClick={() => {
                              if (onAdded)
                                onAdded(() => {
                                  setRows(getRows());
                                });
                              setRows(() => {
                                const newRows = [
                                  ...(getRows() as GridRowsProp),
                                ];

                                return newRows;
                              });
                            }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    );
                  }
                },
                renderCell: (params) => {
                  if (onRemoved) {
                    return (
                      <GridActionsCellItem
                        key={"delete"}
                        icon={<DeleteIcon />}
                        label={dictionary.grid.delete}
                        onClick={() => {
                          if (onRemoved)
                            onRemoved(params.id.toString(), () =>
                              setRows(getRows()),
                            );
                          setRows(getRows());
                        }}
                      />
                    );
                  }
                },
              },
            ] as EditableDatagridColumn[])
          : []),
      ]}
      rows={rows}
      sx={{
        ...params?.sx,
        "& .MuiDataGrid-cell": {
          ...(params?.getRowHeight ? { minHeight: "52px" } : {}),
        },
        borderRadius: 0,
      }}
    />
  );
}
