import { RouteLoading } from "@/components/route_loading";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { Box } from "@mui/material";

export function PageLoading() {
  return (
    <Box component="main" id="contenido" sx={{ pt: { xs: 12, md: 15 } }}>
      <RouteLoading label={getDictionary("es").general.loading} />
    </Box>
  );
}
