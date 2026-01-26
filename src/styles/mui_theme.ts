import { ThemeOptions } from "@mui/material";
import { Montserrat, Quicksand } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
});
const quicksand = Quicksand({ subsets: ["latin"] });
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
    // MuiIconButton: {
    //   styleOverrides: {
    //     root: () => ({
    //       color: AppColors.orangeSecondary,
    //       transition: "all 0.2s ease",
    //       "&:hover": {
    //         backgroundColor: alpha(AppColors.orangeSecondary, 0.08),
    //         transform: "scale(1.05)",
    //       },
    //     }),
    //   },
    // },
    // MuiDataGrid: {
    //   styleOverrides: {
    //     root: ({ theme }: { theme: Theme }) => ({
    //       "& .MuiDataGrid-columnHeaders": {
    //         backgroundColor: alpha(AppColors.redPrimary, 0.03),
    //         borderBottom: `2px solid ${alpha(AppColors.redPrimary, 0.1)}`,
    //       },
    //       "& .MuiDataGrid-cell": {
    //         borderColor: alpha(AppColors.redPrimary, 0.05),
    //       },
    //       "& .MuiDataGrid-row:hover": {
    //         backgroundColor: alpha(AppColors.redPrimary, 0.02),
    //       },
    //       "& .MuiDataGrid-row.Mui-selected": {
    //         backgroundColor: alpha(AppColors.redPrimary, 0.08),
    //         "&:hover": {
    //           backgroundColor: alpha(AppColors.redPrimary, 0.12),
    //         },
    //       },
    //       "& .MuiDataGrid-footerContainer": {
    //         borderTop: `1px solid ${alpha(AppColors.redPrimary, 0.1)}`,
    //       },
    //       "& .MuiTablePagination-root": {
    //         color: theme.palette.text.secondary,
    //       },
    //       "& .MuiDataGrid-virtualScroller": {
    //         backgroundColor: "#ffffff",
    //       },
    //     }),
    //   },
    // },
  },
};

export const lightTheme: ThemeOptions = {
  ...coreThemeObj,
  palette: {
    ...coreThemeObj.palette,
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9e9e9e",
    },
    background: {
      paper: "#ffffff",
    },
    mode: "light",
  },
};

export const darkTheme: ThemeOptions = {
  ...coreThemeObj,
  palette: {
    ...coreThemeObj.palette,
    primary: {
      main: "#ffffff",
    },
    secondary: {
      main: "#ffffff",
    },
    mode: "dark",
  },
};
