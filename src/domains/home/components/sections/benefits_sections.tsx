import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { Box, Container, Typography } from "@mui/material";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function BenefitsSection({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.landing.howTo;
  return (
    <Box
      component="section"
      id="como-comprar"
      aria-labelledby="how-to-title"
      className={styles.howTo}
      sx={sectionAnchorSx}
    >
      <Container maxWidth="xl">
        <div className={styles.howToLayout}>
          <Typography component="h2" id="how-to-title" variant="h3">
            {copy.title}
          </Typography>
          <ol>
            {copy.steps.map((step) => (
              <li key={step.title}>
                <Typography component="h3">{step.title}</Typography>
                <Typography>{step.body}</Typography>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Box>
  );
}
