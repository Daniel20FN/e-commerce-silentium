import { Theme, useMediaQuery } from "@mui/material";

export function useIsMobile() {
  return useMediaQuery<Theme>((theme) => theme.breakpoints.down("md"));
}
