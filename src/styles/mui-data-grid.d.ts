import { ComponentsOverrides, Theme } from "@mui/material/styles";
import { DataGridProps } from "@mui/x-data-grid";

declare module "@mui/material/styles" {
  interface Components {
    MuiDataGrid?: {
      defaultProps?: Partial<DataGridProps>;
      styleOverrides?: ComponentsOverrides<Theme>["MuiDataGrid"];
    };
  }
}
