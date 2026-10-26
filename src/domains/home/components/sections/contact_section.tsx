import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  SALES_EMAIL,
  SALES_INSTAGRAM_HANDLE,
  SALES_INSTAGRAM_URL,
  SALES_PHONE_DISPLAY,
  SALES_WHATSAPP_PHONE,
  salesWhatsAppHref,
} from "@/values/sales_contact";
import Instagram from "@mui/icons-material/Instagram";
import WhatsApp from "@mui/icons-material/WhatsApp";
import { Box, Button, Container, Link, Stack, Typography } from "@mui/material";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function ContactSection({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.landing.contact;
  return (
    <Box
      component="section"
      id="contacto"
      aria-labelledby="contact-title"
      tabIndex={-1}
      className={styles.contact}
      sx={{
        ...sectionAnchorSx,
        py: { xs: 7, md: 11 },
        bgcolor: "action.hover",
      }}
    >
      <Container maxWidth="md">
        <Stack
          data-reveal="rise"
          spacing={3}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            textAlign: { xs: "left", sm: "center" },
          }}
        >
          <Typography
            component="h2"
            id="contact-title"
            variant="h3"
            sx={{
              fontSize: { xs: "1.75rem", md: "2.5rem" },
              textWrap: "balance",
            }}
          >
            {copy.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ maxWidth: 620, lineHeight: 1.9 }}
          >
            {copy.description}
          </Typography>
          <Button
            component="a"
            href={salesWhatsAppHref(copy.message)}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="large"
            startIcon={<WhatsApp />}
          >
            {copy.cta}
          </Button>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2.5, sm: 5 }}
            sx={{ minWidth: 0, maxWidth: "100%" }}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                {copy.phoneLabel}
              </Typography>
              <Link
                href={`tel:+${SALES_WHATSAPP_PHONE}`}
                color="text.primary"
                underline="hover"
              >
                {SALES_PHONE_DISPLAY}
              </Link>
            </Stack>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {copy.emailLabel}
              </Typography>
              <Link
                href={`mailto:${SALES_EMAIL}`}
                color="text.primary"
                underline="always"
                sx={{ overflowWrap: "anywhere" }}
              >
                {SALES_EMAIL}
              </Link>
            </Stack>
          </Stack>
          <Button
            component="a"
            href={SALES_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            startIcon={<Instagram />}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
          >
            {copy.instagramLabel.replace("{handle}", SALES_INSTAGRAM_HANDLE)}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {copy.note}
          </Typography>
          <Link href="#productos" color="text.primary">
            {copy.browse}
          </Link>
        </Stack>
      </Container>
    </Box>
  );
}
