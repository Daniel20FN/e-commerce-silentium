import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { Box } from "@mui/material";
import { getPublicNavigationDictionary } from "../services/public_navigation";

export function CatalogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const dictionary = getDictionary("es");
  return (
    <Box>
      <Navbar dictionary={getPublicNavigationDictionary(dictionary)} />
      <Box
        component="main"
        id="contenido"
        tabIndex={-1}
        sx={{
          pt: { xs: 12, md: 15 },
          pb: { xs: 7, md: 12 },
          minHeight: "65vh",
        }}
      >
        {children}
      </Box>
      <Footer dictionary={dictionary} />
    </Box>
  );
}
