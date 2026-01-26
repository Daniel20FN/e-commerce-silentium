import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { HomePage } from "@/domains/home/components/home_page";
import { Box } from "@mui/material";

export default function Home() {
  // Hooks
  const dictionary = getDictionary("es");

  return (
    <Box>
      <Navbar dictionary={dictionary} />
      <HomePage dictionary={dictionary} />
      <Footer dictionary={dictionary} />
    </Box>
  );
}
