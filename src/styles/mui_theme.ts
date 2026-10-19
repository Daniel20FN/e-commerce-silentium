import { Theme, ThemeOptions, alpha } from "@mui/material";
import { brandColors } from "./brand_colors";
import { displayFont, textFont } from "./brand_fonts";

const coreThemeObj: ThemeOptions = {
  typography: {
    fontFamily: textFont.style.fontFamily,
    h1: {
      fontFamily: displayFont.style.fontFamily,
      fontWeight: 600,
    },
    h2: {
      fontFamily: displayFont.style.fontFamily,
      fontWeight: 600,
    },
    h3: {
      fontFamily: displayFont.style.fontFamily,
      fontWeight: 600,
    },
    h4: {
      fontFamily: displayFont.style.fontFamily,
      fontWeight: 600,
    },
    h5: {
      fontFamily: displayFont.style.fontFamily,
      fontWeight: 600,
    },
    h6: {
      fontFamily: displayFont.style.fontFamily,
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: textFont.style.fontFamily,
    },
    subtitle2: {
      fontFamily: textFont.style.fontFamily,
    },
    body1: {
      fontFamily: textFont.style.fontFamily,
    },
    body2: {
      fontFamily: textFont.style.fontFamily,
    },
    button: {
      fontFamily: textFont.style.fontFamily,
    },
    overline: {
      fontFamily: textFont.style.fontFamily,
    },
    caption: {
      fontFamily: textFont.style.fontFamily,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        html: { colorScheme: theme.palette.mode },
        body: { caretColor: theme.palette.primary.main },
        "::selection": {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        },
        "a:focus-visible, button:focus-visible": {
          outline: `3px solid ${theme.palette.primary.main}`,
          outlineOffset: 3,
        },
      }),
    },
    MuiAppBar: {
      defaultProps: {
        position: "static",
        style: {
          background: "transparent",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        },
        sx: {
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        },
        elevation: 0,
      },
    },
    MuiToolbar: {
      defaultProps: {
        sx: { flexWrap: "wrap" },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            transform: "scale(1.05)",
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          letterSpacing: 0,
          transition: "all 0.2s ease",
        },
        sizeLarge: {
          paddingInline: 28,
          paddingBlock: 12,
          fontSize: "1rem",
        },
        outlined: ({ theme }: { theme: Theme }) => ({
          borderColor: alpha(theme.palette.info.main, 0.5),
          color: theme.palette.info.main,
          "&:hover": {
            borderColor: theme.palette.info.main,
            backgroundColor: alpha(theme.palette.info.main, 0.06),
          },
        }),
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
          "& .MuiDataGrid-cell": {
            borderColor: alpha(theme.palette.primary.main, 0.05),
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          },
          "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            },
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
          "& .MuiTablePagination-root": {
            color: theme.palette.text.secondary,
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: theme.palette.background.paper,
          },
        }),
      },
    },
  },
};

export const lightTheme: ThemeOptions = {
  ...coreThemeObj,
  palette: {
    mode: "light",
    primary: {
      main: brandColors.brown,
      dark: brandColors.brownHover,
      contrastText: brandColors.ivory,
    },
    secondary: { main: brandColors.blue, contrastText: brandColors.brown },
    info: { main: brandColors.brown, contrastText: brandColors.ivory },
    background: { default: brandColors.ivory, paper: brandColors.ivory },
    text: { primary: brandColors.brown, secondary: brandColors.lightMuted },
    divider: alpha(brandColors.brown, 0.16),
  },
};

export const darkTheme: ThemeOptions = {
  ...coreThemeObj,
  palette: {
    mode: "dark",
    primary: { main: brandColors.blue, contrastText: brandColors.darkCanvas },
    secondary: {
      main: brandColors.beige,
      contrastText: brandColors.darkCanvas,
    },
    info: { main: brandColors.blue, contrastText: brandColors.darkCanvas },
    background: {
      default: brandColors.darkCanvas,
      paper: brandColors.darkSurface,
    },
    text: { primary: brandColors.ivory, secondary: brandColors.darkMuted },
    divider: alpha(brandColors.beige, 0.2),
  },
};
