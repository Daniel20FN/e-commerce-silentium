import { BrandLogo } from "@/components/brand_logo";
import NavigationLink from "@/components/navigation_link";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { LEGAL_SLUGS } from "@/domains/legal/services/legal_release";
import { CompanyValues } from "@/values/app_values";
import {
  SALES_INSTAGRAM_HANDLE,
  SALES_INSTAGRAM_URL,
} from "@/values/sales_contact";
import Instagram from "@mui/icons-material/Instagram";
import {
  Box,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";

export function Footer({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.landing.footer;
  const sections = [
    {
      title: copy.catalog,
      links: [
        { label: copy.products, href: "/#productos" },
        { label: copy.collections, href: "/#colecciones" },
      ],
    },
    {
      title: copy.company,
      links: [
        { label: copy.about, href: "/#nosotros" },
        { label: copy.contact, href: "/#contacto" },
        { label: copy.howTo, href: "/#como-comprar" },
      ],
    },
    {
      title: copy.help,
      links: [
        { label: copy.shipping, href: "/#envios" },
        { label: copy.payments, href: "/#pagos" },
        { label: copy.support, href: "/#cambios" },
        { label: copy.browserData, href: "/#datos-navegador" },
      ],
    },
  ];
  return (
    <Box
      component="footer"
      sx={{ bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            py: { xs: 5, md: 7 },
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2,minmax(0,1fr))",
              md: "minmax(0,1.5fr) repeat(3,minmax(0,1fr))",
            },
            gap: { xs: 4, md: 5 },
          }}
        >
          <Stack
            spacing={2}
            sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, minWidth: 0 }}
          >
            <Link
              component={NavigationLink}
              aria-label={CompanyValues.name}
              href="/#inicio"
              underline="none"
              color="text.primary"
              sx={{
                fontWeight: 700,
                fontSize: "1.25rem",
                alignSelf: "flex-start",
              }}
            >
              <BrandLogo variant="signature" width={244} />
            </Link>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 300, lineHeight: 1.8 }}
            >
              {copy.description}
            </Typography>
            <Link
              href={SALES_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              color="text.primary"
              underline="always"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                minHeight: 44,
                fontSize: "0.875rem",
                alignSelf: "flex-start",
              }}
            >
              <Instagram fontSize="small" />
              {dictionary.landing.contact.instagramLabel.replace(
                "{handle}",
                SALES_INSTAGRAM_HANDLE,
              )}
            </Link>
          </Stack>
          {sections.map((section) => (
            <Box
              component="nav"
              aria-label={section.title}
              key={section.title}
              sx={{ minWidth: 0 }}
            >
              <Typography
                component="h2"
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {section.title}
              </Typography>
              <Stack spacing={1}>
                {section.links.map((link) => (
                  <Link
                    component={NavigationLink}
                    key={link.href}
                    href={link.href}
                    underline="hover"
                    color="text.secondary"
                    sx={{
                      fontSize: "0.875rem",
                      py: 0.5,
                      overflowWrap: "anywhere",
                      "&:focus-visible": {
                        outline: "2px solid",
                        outlineColor: "info.main",
                        outlineOffset: 3,
                      },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
        <Stack
          component="nav"
          aria-label={dictionary.legal.title}
          direction="row"
          useFlexGap
          flexWrap="wrap"
          spacing={2}
          sx={{ pb: 3 }}
        >
          {LEGAL_SLUGS.map((slug) => (
            <Link
              component={NavigationLink}
              key={slug}
              href={`/legal/${slug}`}
              rel={
                slug === "privacidad"
                  ? "privacy-policy"
                  : slug === "terminos"
                    ? "terms-of-service"
                    : undefined
              }
              sx={{ fontSize: "0.875rem", py: 1 }}
            >
              {dictionary.legal.documents[slug].title}
            </Link>
          ))}
          <Link
            href="https://www.sic.gov.co/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontSize: "0.875rem", py: 1 }}
          >
            {dictionary.legal.sic}
          </Link>
        </Stack>
        <Divider />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ py: 3, justifyContent: "space-between" }}
        >
          <Typography variant="body2" color="text.secondary">
            {copy.copyright
              .replace("{year}", String(new Date().getFullYear()))
              .replace("{brand}", CompanyValues.name)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dictionary.cart.salesChannel}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
