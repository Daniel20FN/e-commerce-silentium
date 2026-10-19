import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { Box, Container, Typography } from "@mui/material";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";
import { LandingDisclosures } from "../landing_disclosures";

export function HelpSection({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.landing.help;
  return (
    <Box
      component="section"
      id="ayuda"
      aria-labelledby="help-title"
      tabIndex={-1}
      className={styles.help}
      sx={sectionAnchorSx}
    >
      <Container maxWidth="xl">
        <div className={styles.helpLayout}>
          <div>
            <Typography component="h2" id="help-title" variant="h3">
              {copy.title}
            </Typography>
            <Typography sx={{ mt: 3 }}>{copy.description}</Typography>
          </div>
          <LandingDisclosures items={copy.items} />
        </div>
      </Container>
    </Box>
  );
}
