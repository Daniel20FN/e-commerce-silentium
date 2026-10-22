import { BrandLogo } from "@/components/brand_logo";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { Box, Container, Typography } from "@mui/material";
import Image from "next/image";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function AboutSection({ dictionary }: { dictionary: Dictionary }) {
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
        <Typography
          component="h2"
          id="about-title"
          variant="h3"
          className={styles.editorialTitle}
        >
          <span>{copy.titleLead} </span>
          <span>{copy.titleTail}</span>
        </Typography>
        <div className={styles.editorialSpread} data-reveal="scene">
          <div
            className={styles.editorialMain}
            data-scene-part="editorial-main"
          >
            <Image
              src="/images/landing/story-white-bedding.jpg"
              alt={copy.photoAlt}
              fill
              sizes="(max-width: 599px) 65vw, 62vw"
              loading="lazy"
            />
            <div
              className={styles.editorialCurtain}
              data-scene-part="editorial-curtain"
              aria-hidden="true"
            />
          </div>
          <div
            className={styles.editorialSide}
            data-scene-part="editorial-side"
          >
            <Image
              src="/images/landing/story-bedroom.jpg"
              alt={copy.roomAlt}
              fill
              sizes="(max-width: 599px) 29vw, 30vw"
              loading="lazy"
            />
          </div>
        </div>
        <div className={styles.editorialSignature}>
          <Typography>{copy.statement}</Typography>
          <BrandLogo width={155} />
        </div>
        <details className={styles.photoCredits}>
          <summary>{copy.credits}</summary>
          <a href="https://www.pexels.com/photo/white-bed-linen-and-pillows-9893931/">
            Ofir Eliav / Pexels
          </a>
          {" · "}
          <a href="https://www.pexels.com/photo/a-white-linen-with-pillows-on-the-bed-near-the-wooden-table-13158870/">
            Andrea Davis / Pexels
          </a>
        </details>
      </Container>
    </Box>
  );
}
