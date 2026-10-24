import type { Dictionary } from "@/dictionary/services/get-dictionary";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Link, Typography } from "@mui/material";
import Image, { getImageProps } from "next/image";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function HeroSection({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.landing.hero;
  const { props: phoneImage } = getImageProps({
    src: "/images/landing/entre-telas-room-800.webp",
    alt: "",
    fill: true,
    sizes: "100vw",
  });
  return (
    <Box
      component="section"
      id="inicio"
      aria-labelledby="landing-title"
      className={styles.hero}
      sx={sectionAnchorSx}
    >
      <link
        rel="preload"
        as="image"
        imageSrcSet="/images/landing/entre-telas-curtain-480.webp 1x, /images/landing/entre-telas-curtain-800.webp 2x"
        media="(max-width: 599.95px)"
        fetchPriority="high"
      />
      <div className={styles.heroMedia} aria-hidden="true">
        <picture>
          <source
            media="(max-width: 599.95px)"
            srcSet={phoneImage.srcSet}
            sizes="100vw"
          />
          <Image
            src="/images/landing/refugio-marfil.webp"
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
          />
        </picture>
      </div>
      <div className={styles.heroCurtain} aria-hidden="true">
        <div className={styles.heroCurtainFabric} />
      </div>
      <Container maxWidth="xl">
        <div className={styles.heroCopy}>
          <Typography component="h1" id="landing-title" variant="h1">
            {copy.title}
          </Typography>
          <Typography>{copy.description}</Typography>
          <div className={styles.heroActions}>
            <Button
              component="a"
              href="#productos"
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
            >
              {copy.explore}
            </Button>
            <Link href="#nosotros">{copy.about}</Link>
          </div>
        </div>
      </Container>
    </Box>
  );
}
