import { Dictionary } from "@/dictionary/services/get-dictionary";
import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, SxProps, TextField, Theme } from "@mui/material";
import { GridApiCommunity } from "@mui/x-data-grid/internals";
import React from "react";

export const DataGridQuickSearchComponent = React.memo(
  function DataGridQuickSearchComponent({
    apiRef,
    dictionary,
    sx,
  }: {
    apiRef: React.RefObject<GridApiCommunity>;
    dictionary: Dictionary;
    sx?: SxProps<Theme> | undefined;
  }) {
    return (
      <TextField
        id="outlined-basic"
        variant="outlined"
        size="small"
        margin="dense"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          padding: 0,
          margin: 0,
          paddingRight: 2,
          ...sx,
        }}
        placeholder={dictionary.general.quick_search}
        onChange={(event) => {
          apiRef.current.setQuickFilterValues(
            event.currentTarget.value.length == 0 ||
              event.currentTarget.value.trim() == ""
              ? []
              : [event.currentTarget.value],
          );
        }}
      />
    );
  },
);
