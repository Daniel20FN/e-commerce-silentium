import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { StorefrontProductCard } from "@/domains/storefront/types/catalog";
import { priceFormatter } from "@/utils/price_formatter";
import { Box, Container, Typography } from "@mui/material";
import Image from "next/image";
import { sectionAnchorSx } from "../../services/landing_links";
import styles from "../landing.module.css";

export function BenefitsSection({
  dictionary,
  product,
}: {
  dictionary: Dictionary;
  product?: StorefrontProductCard;
}) {
  const copy = dictionary.landing.howTo;
  const name = product?.name ?? copy.empty;
  const price = product
    ? `${product.hasMultiplePrices ? `${dictionary.storefront.from} ` : ""}${priceFormatter(product.priceCents / 100)}`
    : copy.emptyDetail;
  return (
    <Box
      component="section"
      id="como-comprar"
      aria-labelledby="how-to-title"
      className={styles.howTo}
      sx={sectionAnchorSx}
    >
      <Container maxWidth="xl">
        <Typography
          component="h2"
          id="how-to-title"
          variant="h3"
          className={styles.journeyTitle}
        >
          <span>{copy.titleLead} </span>
          <span>{copy.titleTail}</span>
        </Typography>
        <figure className={styles.journeyFigure}>
          <div className={styles.journeyScene} data-reveal="scene">
            <div className={styles.journeyRoom} data-scene-part="room">
              <Image
                src="/images/landing/story-white-bedding.jpg"
                alt={dictionary.landing.about.photoAlt}
                fill
                sizes="(max-width: 599px) 90vw, 75vw"
                loading="lazy"
              />
            </div>
            <div
              className={styles.journeyCurtain}
              data-scene-part="curtain"
              aria-hidden="true"
            />
            <div className={styles.productSlip} data-scene-part="product">
              {product?.image ? (
                <div className={styles.slipPhoto}>
                  <Image
                    src={product.image.url}
                    alt={product.image.alt}
                    fill
                    sizes="(max-width: 599px) 125px, 200px"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <strong>{name}</strong>
              <span>{price}</span>
            </div>
            <div className={styles.selectionSlip} data-scene-part="receipt">
              <span>{copy.selection}</span>
              <strong>{name}</strong>
              <span>{copy.quantity}</span>
              <div>
                <span>{copy.price}</span>
                <strong>{price}</strong>
              </div>
            </div>
            <div className={styles.messageSlip} data-scene-part="message">
              <span>{copy.messageLabel}</span>
              <p>{copy.message}</p>
            </div>
          </div>
          <figcaption>
            <strong>{copy.caption}</strong>
            <small>{copy.example}</small>
          </figcaption>
        </figure>
        <ol className={styles.journeySteps}>
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              data-reveal="row"
              data-reveal-delay={index * 70}
            >
              <Typography component="h3">{step.title}</Typography>
              <Typography>{step.body}</Typography>
            </li>
          ))}
        </ol>
      </Container>
    </Box>
  );
}
