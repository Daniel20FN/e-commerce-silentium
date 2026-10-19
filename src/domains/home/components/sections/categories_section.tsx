import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { StorefrontCategory } from "@/domains/storefront/types/catalog";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { Box, Container, Typography } from "@mui/material";
import { sectionAnchorSx } from "../../services/landing_links";
import { CategoryEditorialImage } from "../category_editorial_image";
import styles from "../landing.module.css";

export function CategoriesSection({
  dictionary,
  categories,
}: {
  dictionary: Dictionary;
  categories: StorefrontCategory[];
}) {
  const copy = dictionary.storefront;
  return (
    <Box
      component="section"
      id="colecciones"
      aria-labelledby="collections-title"
      tabIndex={-1}
      className={styles.collections}
      sx={sectionAnchorSx}
    >
      <Container maxWidth="xl">
        <div className={styles.sectionIntro}>
          <Typography component="h2" id="collections-title" variant="h3">
            {copy.categoriesTitle}
          </Typography>
          <Typography>{copy.categoriesDescription}</Typography>
        </div>
        {categories.length ? (
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <a
                key={category.id}
                href={`/categorias/${category.slug}`}
                className={styles.category}
              >
                <CategoryEditorialImage
                  key={category.imageUrl ?? category.id}
                  src={category.imageUrl}
                  alt={category.name}
                  fallbackAlt={dictionary.landing.hero.imageAlt}
                  fallbackNote={dictionary.landing.imageryNote}
                />
                <div className={styles.categoryCopy}>
                  <div>
                    <Typography component="h3">{category.name}</Typography>
                    <Typography>{copy.explore}</Typography>
                  </div>
                  <ArrowForward aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <Typography role="status">{copy.emptyCategories}</Typography>
        )}
      </Container>
    </Box>
  );
}
