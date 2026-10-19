import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { StorefrontImage } from "@/domains/storefront/types/catalog";
import { Box, Button, Container, Typography } from "@mui/material";
import Image from "next/image";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function AboutSection({
  dictionary,
  image,
}: {
  dictionary: Dictionary;
  image?: StorefrontImage | null;
}) {
  const copy = dictionary.landing.about;
  return (
    <Box
      component="section"
      id="nosotros"
      aria-labelledby="about-title"
      tabIndex={-1}
      className={styles.about}
      sx={sectionAnchorSx}
    >
      <Container maxWidth="xl">
        <div className={styles.aboutLayout}>
          <div className={styles.aboutMedia} data-reveal="image">
            <Image
              src={image?.url ?? "/images/landing/refugio-marfil.webp"}
              alt={image?.alt ?? dictionary.landing.hero.imageAlt}
              fill
              sizes="(max-width: 899px) 90vw, 45vw"
            />
          </div>
          <div
            className={styles.aboutCopy}
            data-reveal="rise"
            data-reveal-delay={70}
          >
            <Typography component="h2" id="about-title" variant="h3">
              {copy.title}
            </Typography>
            <Typography>{copy.description}</Typography>
            <Typography>{copy.closing}</Typography>
            <ul>
              {copy.values.map((value) => (
                <li key={value.title}>
                  <Typography component="h3">{value.title}</Typography>
                  <Typography>{value.body}</Typography>
                </li>
              ))}
            </ul>
            <Button component="a" href="#contacto" variant="outlined">
              {copy.contact}
            </Button>
          </div>
        </div>
      </Container>
    </Box>
  );
}
