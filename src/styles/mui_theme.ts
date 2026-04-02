import { Theme, ThemeOptions, alpha } from "@mui/material";
import { Montserrat, Quicksand } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
});
const quicksand = Quicksand({ subsets: ["latin"] });

// Paleta de colores de la aplicación
const AppColors = {
  // Color primario - Azul oscuro profundo
  primary: "#001E3B",
  // Color secundario - Beige cálido
  secondary: "#ECDFD5",
  // Color de acento/logo - Marrón terracota
  accent: "#957662",
  // Variantes claras y oscuras
  primaryLight: "#0A3A5C",
  primaryDark: "#001228",
  secondaryLight: "#F5EBE5",
  secondaryDark: "#D4C4B8",
  accentLight: "#B08E7A",
  accentDark: "#7A5F4E",
} as const;

const coreThemeObj: ThemeOptions = {
  typography: {
    h1: {
      fontFamily: montserrat.style.fontFamily,
    },
    h2: {
      fontFamily: montserrat.style.fontFamily,
    },
    h3: {
      fontFamily: montserrat.style.fontFamily,
    },
    h4: {
      fontFamily: montserrat.style.fontFamily,
    },
    h5: {
      fontFamily: montserrat.style.fontFamily,
    },
    h6: {
      fontFamily: montserrat.style.fontFamily,
    },
    subtitle1: {
      fontFamily: quicksand.style.fontFamily,
    },
    subtitle2: {
      fontFamily: quicksand.style.fontFamily,
    },
    body1: {
      fontFamily: quicksand.style.fontFamily,
    },
    body2: {
      fontFamily: quicksand.style.fontFamily,
    },
    button: {
      fontFamily: quicksand.style.fontFamily,
    },
    overline: {
      fontFamily: quicksand.style.fontFamily,
    },
    caption: {
      fontFamily: quicksand.style.fontFamily,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
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
        root: () => ({
          color: AppColors.accent,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: alpha(AppColors.accent, 0.08),
            transform: "scale(1.05)",
          },
        }),
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: alpha(AppColors.primary, 0.03),
            borderBottom: `2px solid ${alpha(AppColors.primary, 0.1)}`,
          },
          "& .MuiDataGrid-cell": {
            borderColor: alpha(AppColors.primary, 0.05),
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: alpha(AppColors.primary, 0.02),
          },
          "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: alpha(AppColors.primary, 0.08),
            "&:hover": {
              backgroundColor: alpha(AppColors.primary, 0.12),
            },
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${alpha(AppColors.primary, 0.1)}`,
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

// Tema claro
export const lightTheme: ThemeOptions = {
  ...coreThemeObj,
  palette: {
    mode: "light",
    primary: {
      main: AppColors.primary,
      light: AppColors.primaryLight,
      dark: AppColors.primaryDark,
      contrastText: "#ffffff",
    },
    secondary: {
      main: AppColors.secondary,
      light: AppColors.secondaryLight,
      dark: AppColors.secondaryDark,
      contrastText: AppColors.primary,
    },
    // Color de acento disponible como tercer color
    info: {
      main: AppColors.accent,
      light: AppColors.accentLight,
      dark: AppColors.accentDark,
      contrastText: "#ffffff",
    },
    background: {
      default: "#F8F6F4",
      paper: "#ffffff",
    },
    text: {
      primary: AppColors.primary,
      secondary: alpha(AppColors.primary, 0.7),
    },
    divider: alpha(AppColors.primary, 0.12),
  },
};

// Tema oscuro
export const darkTheme: ThemeOptions = {
  ...coreThemeObj,
  palette: {
    mode: "dark",
    primary: {
      main: AppColors.secondary,
      light: AppColors.secondaryLight,
      dark: AppColors.secondaryDark,
      contrastText: AppColors.primary,
    },
    secondary: {
      main: AppColors.accent,
      light: AppColors.accentLight,
      dark: AppColors.accentDark,
      contrastText: "#ffffff",
    },
    // Color de acento disponible como tercer color
    info: {
      main: AppColors.accent,
      light: AppColors.accentLight,
      dark: AppColors.accentDark,
      contrastText: "#ffffff",
    },
    background: {
      default: AppColors.primaryDark,
      paper: AppColors.primary,
    },
    text: {
      primary: AppColors.secondary,
      secondary: alpha(AppColors.secondary, 0.7),
    },
    divider: alpha(AppColors.secondary, 0.12),
  },
};
