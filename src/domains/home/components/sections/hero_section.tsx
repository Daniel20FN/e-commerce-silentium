import type { Dictionary } from "@/dictionary/services/get-dictionary";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Link, Typography } from "@mui/material";
import Image from "next/image";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function HeroSection({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.landing.hero;
  return (
    <Box
      component="section"
      id="inicio"
      aria-labelledby="landing-title"
      className={styles.hero}
      sx={sectionAnchorSx}
    >
      <div className={styles.heroMedia} aria-hidden="true">
        <Image
          src="/images/landing/refugio-marfil.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>
      <Container maxWidth="xl">
        <div className={styles.heroCopy}>
          <Typography component="h1" id="landing-title" variant="h1">
            {copy.title}
            <span>{copy.accent}</span>
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
