import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { priceFormatter } from "@/utils/price_formatter";
import type { CartContact, CartQuote } from "../types/api_params";

export const SALES_WHATSAPP_PHONE = "573166218114";
export const MAX_WHATSAPP_URL_LENGTH = 7000;

export function publicOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname) ||
      url.hostname.endsWith(".localhost") ||
      url.hostname.endsWith(".local") ||
      /^\d+(\.\d+){3}$/.test(url.hostname)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

function publicImageUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return publicOrigin(url.origin) ? url.href : null;
  } catch {
    return null;
  }
}

export function buildWhatsAppSummary(
  quote: CartQuote,
  contact: CartContact,
  copy: Dictionary["cart"],
): {
  message: string;
  href: string;
  needsCopy: boolean;
  missingOrigin: boolean;
} {
  if (!quote.valid || !quote.lines.length || !/^\d{8,15}$/.test(contact.phone))
    throw new Error("cart_invalid");
  const origin = publicOrigin(contact.publicOrigin ?? undefined);
  const money = (cents: number) => `${priceFormatter(cents / 100)} COP`;
  const lines = quote.lines.map((line, index) => {
    if (
      line.priceCents === null ||
      line.subtotalCents === null ||
      !line.name ||
      !line.sku ||
      !line.slug
    )
      throw new Error("cart_invalid");
    const image = publicImageUrl(line.image?.url);
    return [
      `${index + 1}. ${line.name}`,
      ...(line.attributes ? [line.attributes] : []),
      `${copy.sku}: ${line.sku}`,
      `${copy.quantity}: ${line.quantity}`,
      `${copy.unitPrice}: ${money(line.priceCents)}`,
      `${copy.lineSubtotal}: ${money(line.subtotalCents)}`,
      ...(origin
        ? [
            `${copy.productLink}: ${origin}/productos/${encodeURIComponent(line.slug)}`,
          ]
        : []),
      ...(image ? [`${copy.photoLink}: ${image}`] : []),
    ].join("\n");
  });
  const message = [
    copy.messageGreeting,
    ...lines,
    `${copy.subtotal}: ${money(quote.subtotalCents)}`,
    copy.messageClosing,
  ].join("\n\n");
  const fullHref = `https://wa.me/${contact.phone}?text=${encodeURIComponent(message)}`;
  const needsCopy = fullHref.length > MAX_WHATSAPP_URL_LENGTH;
  return {
    message,
    needsCopy,
    missingOrigin: !origin,
    href: needsCopy
      ? `https://wa.me/${contact.phone}?text=${encodeURIComponent(copy.shortGreeting)}`
      : fullHref,
  };
}
