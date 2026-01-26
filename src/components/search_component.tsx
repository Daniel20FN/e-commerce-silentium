import { Dictionary } from "@/dictionary/services/get-dictionary";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import SearchIcon from "@mui/icons-material/Search";
import {
  InputAdornment,
  SxProps,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import React from "react";

export const SearchComponent = React.memo(function SearchComponent({
  dictionary,
  value,
  setSearchValue,
  sx,
  searchOnSubmitOnly = false,
  fullWidth = false,
  placeholder,
}: {
  dictionary: Dictionary;
  value: string | null;
  setSearchValue: React.Dispatch<React.SetStateAction<string | null>>;
  sx?: SxProps<Theme> | undefined;
  searchOnSubmitOnly?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = React.useState(value ?? "");

  React.useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  const handleSubmit = () => {
    setSearchValue(inputValue.trim() == "" ? null : inputValue);
  };

  return (
    <TextField
      id="outlined-basic"
      variant="outlined"
      size="small"
      margin="dense"
      fullWidth={fullWidth}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                onClick={searchOnSubmitOnly ? handleSubmit : undefined}
                sx={searchOnSubmitOnly ? { cursor: "pointer" } : undefined}
              />
            </InputAdornment>
          ),
          ...(searchOnSubmitOnly
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    {searchOnSubmitOnly && inputValue && (
                      <Tooltip title={dictionary.general.deleteSearch} arrow>
                        <CloseIcon
                          fontSize="small"
                          color="error"
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            setInputValue("");
                            setSearchValue(null);
                          }}
                        />
                      </Tooltip>
                    )}
                    <Tooltip
                      title={
                        "Presione Enter para buscar o Presione el icono de búsqueda"
                      }
                      arrow
                    >
                      <InfoIcon
                        fontSize="small"
                        color="info"
                        sx={{ cursor: "help" }}
                      />
                    </Tooltip>
                  </InputAdornment>
                ),
              }
            : {}),
        },
      }}
      sx={{
        padding: 0,
        margin: 0,
        paddingRight: 2,
        ...sx,
      }}
      placeholder={placeholder ?? dictionary.general.quick_search}
      value={inputValue}
      onChange={(event) => {
        setInputValue(event.target.value);
        if (!searchOnSubmitOnly) {
          setSearchValue(
            event.target.value.trim() == "" ? null : event.target.value,
          );
        }
      }}
      onKeyDown={(event) => {
        if (searchOnSubmitOnly && event.key === "Enter") {
          handleSubmit();
        }
      }}
    />
  );
});
