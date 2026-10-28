import { getDictionary } from "@/dictionary/services/get-dictionary";
import {
  isLegalSlug,
  LEGAL_DATE,
  LEGAL_SLUGS,
  LEGAL_VERSION,
} from "@/domains/legal/services/legal_release";
import { canonicalMetadata } from "@/domains/storefront/services/seo_rules";
import {
  Box,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  return {
    title: getDictionary("es").legal.documents[slug].title,
    ...canonicalMetadata(`/legal/${slug}`),
  };
}
function InlineText({ text }: { text: string }) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!match) return part;
    return (
      <Link key={i} href={match[2]}>
        {match[1]}
      </Link>
    );
  });
}
export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  const copy = getDictionary("es").legal;
  const document = copy.documents[slug];
  const links = LEGAL_SLUGS.map((key) => (
    <Link
      key={key}
      href={`/legal/${key}`}
      aria-current={key === slug ? "page" : undefined}
      fontWeight={key === slug ? 700 : 400}
    >
      {copy.documents[key].title}
    </Link>
  ));
  return (
    <Container maxWidth="lg">
      <Link href="/#inicio">{copy.back}</Link>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "240px minmax(0,1fr)" },
          gap: { xs: 4, md: 8 },
          mt: 4,
        }}
      >
        <Box component="nav" aria-label={copy.title}>
          <Box
            component="details"
            sx={{
              display: { xs: "block", md: "none" },
              "& summary": { cursor: "pointer", py: 1 },
            }}
          >
            <summary>{copy.title}</summary>
            <Stack spacing={2} sx={{ pt: 2 }}>
              {links}
            </Stack>
          </Box>
          <Stack
            spacing={1.5}
            sx={{
              display: { xs: "none", md: "flex" },
              position: { md: "sticky" },
              top: 110,
            }}
          >
            <Typography component="h2" variant="h6">
              {copy.title}
            </Typography>
            {links}
            <Divider />
            <Link
              href="https://www.sic.gov.co/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.sic}
            </Link>
          </Stack>
        </Box>
        <Box
          component="article"
          sx={{ minWidth: 0, maxWidth: "72ch", overflowWrap: "anywhere" }}
        >
          <Typography
            component="h1"
            variant="h3"
            sx={{
              fontSize: { xs: "2.25rem", md: "3rem" },
              textWrap: "balance",
              mb: 2,
            }}
          >
            {document.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.versionLabel
              .replace("{version}", LEGAL_VERSION)
              .replace("{date}", LEGAL_DATE)}
          </Typography>
          <Box component="nav" aria-label={copy.contents} sx={{ my: 4 }}>
            <Typography fontWeight={600}>{copy.contents}</Typography>
            <Box component="ul" sx={{ pl: 2.5 }}>
              {document.sections.map((section, index) => (
                <li key={section.title}>
                  <Link href={`#seccion-${index}`}>{section.title}</Link>
                </li>
              ))}
            </Box>
          </Box>
          {document.sections.map((section, index) => (
            <Box
              component="section"
              id={`seccion-${index}`}
              key={section.title}
              sx={{ mt: 5, scrollMarginTop: 110 }}
            >
              <Typography component="h2" variant="h5" sx={{ mb: 2 }}>
                {section.title}
              </Typography>
              {section.paragraphs.map((paragraph) => (
                <Typography key={paragraph} sx={{ mb: 2, lineHeight: 1.85 }}>
                  <InlineText text={paragraph} />
                </Typography>
              ))}
            </Box>
          ))}
          <Divider sx={{ my: 5 }} />
          <Link href="mailto:contacto@silentium-hogar.com">{copy.contact}</Link>
        </Box>
      </Box>
    </Container>
  );
}
