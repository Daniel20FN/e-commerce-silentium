import AddCircleIcon from "@mui/icons-material/AddCircle";
import LinkIcon from "@mui/icons-material/Link";
import { IconButton, Tooltip } from "@mui/material";
import Autocomplete, { AutocompleteProps } from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import { debounce } from "lodash";
import * as React from "react";

type AsyncAutocompleteInputProps<
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  K = any,
> = Omit<
  AutocompleteProps<T, false, false, false>,
  "options" | "renderInput" | "getOptionLabel"
> & {
  search: (value: string) => Promise<T[]>;
  label: string;
  hideLabel?: boolean;
  getOptionLabel: (value: T) => string;
  onSelected: (value: T | null) => void;
  initialValue?: T;
  initialValueSearch?: K;
  initialSearch?: (initialValueSearch: K | undefined) => Promise<T | null>;
  inputProps?: TextFieldProps;
  onCreate?: () => Promise<T | null> | T | null;
  onNavigate?: (value: T | null) => void;
  validator?: (value: T | null) => string | null;
  isOptionEqualToValue?: (option: T, value: T) => boolean;
};

export type AsyncAutocompleteRefParams = {
  validate: () => boolean;
  field: string;
  title: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AsyncAutocompleteInt<T, K = any>(
  props: AsyncAutocompleteInputProps<T, K>,
  ref: React.ForwardedRef<AsyncAutocompleteRefParams>,
) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<readonly T[] | null>(null);
  const [text, setText] = React.useState<string>("");
  const [value, setValue] = React.useState<T | null>(
    props.initialValue ?? null,
  );
  const loading = open && options == null;

  const isError = React.useCallback((): [boolean, string] => {
    if (props.validator == undefined) return [false, ""];

    const validatorValue = props.validator(value);
    return [validatorValue !== null, validatorValue ?? ""];
  }, [props, value]);

  React.useImperativeHandle(
    ref,
    () => ({
      validate: () => !isError()[0],
      field: props.label,
      title: props.label,
    }),
    [isError, props.label],
  );

  const handleInitialSearch = React.useCallback(async () => {
    if (props.initialSearch) {
      const initialSearchResponse = await props.initialSearch(
        props.initialValueSearch,
      );

      setValue(initialSearchResponse);
    }
  }, [props]);

  React.useEffect(() => {
    void handleInitialSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const debouncedFetch = debounce(async (q: string, isOpen: boolean) => {
      if (!isOpen) return;
      const result = await props.search(q);
      setOptions(result ?? null);
    }, 400);

    if (open) {
      setOptions(null);
      void debouncedFetch(text, open);
    }
    return () => debouncedFetch.cancel();
  }, [text, open, props]);

  const error = isError();

  return (
    <Autocomplete
      {...props}
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      value={value}
      onChange={(event, newValue) => {
        props.onSelected(newValue);
        setValue(newValue);
      }}
      inputValue={text}
      onInputChange={(_, newInput) => {
        setText(newInput);
      }}
      filterOptions={(x) => x}
      isOptionEqualToValue={props.isOptionEqualToValue}
      options={options ?? []}
      getOptionLabel={props.getOptionLabel}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          {...props.inputProps}
          error={!props.disabled ? error[0] : undefined}
          helperText={!props.disabled ? error[1] : undefined}
          label={props.label}
          slotProps={{
            inputLabel: {
              sx: {
                display: props.hideLabel == true ? "none" : undefined,
              },
              shrink: props.hideLabel == true ? false : true,
            },
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  {/** On Navigate */}
                  {props.onNavigate && (
                    <Tooltip title="Ver">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onNavigate?.(value);
                        }}
                      >
                        <LinkIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Icono para crear nuevo */}
                  {props.onCreate != undefined && (
                    <Tooltip title="Crear nuevo">
                      <IconButton
                        disabled={props.disabled}
                        size="small"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (props.onCreate) {
                            const result = props.onCreate();

                            const newValue =
                              result instanceof Promise ? await result : result;

                            props.onSelected(newValue);
                            setValue(newValue);
                          }
                        }}
                      >
                        <AddCircleIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              ),
              endAdornment: (
                <React.Fragment>
                  {loading && <CircularProgress color="inherit" size={20} />}

                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            },
          }}
        />
      )}
    />
  );
}

const AsyncAutocomplete = React.forwardRef(AsyncAutocompleteInt) as <
  T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  K = any,
>(
  props: Omit<AsyncAutocompleteInputProps<T, K>, "ref"> & {
    ref?:
      | React.ForwardedRef<AsyncAutocompleteRefParams>
      | ((el: AsyncAutocompleteRefParams | null | undefined) => void);
  },
) => ReturnType<typeof AsyncAutocompleteInt>;

export default AsyncAutocomplete;
