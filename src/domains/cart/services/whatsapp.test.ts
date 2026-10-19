import dictionary from "@/dictionary/es.json";
import type { CartQuote } from "../types/api_params";
import {
  buildWhatsAppSummary,
  MAX_WHATSAPP_URL_LENGTH,
  publicOrigin,
  SALES_WHATSAPP_PHONE,
} from "./whatsapp";

export const quote: CartQuote = {
  valid: true,
  subtotalCents: 43800000,
  lines: [
    {
      variantId: "v1",
      quantity: 2,
      status: "available",
      name: "Aurora & algodón",
      sku: "DEMO-3",
      attributes: "Doble / Marfil",
      slug: "aurora",
      image: { id: "i", url: "https://images.example.com/a.png", alt: "a" },
      priceCents: 21900000,
      subtotalCents: 43800000,
      maxQuantity: 4,
    },
  ],
};
const contact = {
  phone: SALES_WHATSAPP_PHONE,
  publicOrigin: "https://shop.example.com",
};
describe("WhatsApp human-reviewed request", () => {
  it("uses approved recipient and encodes all products, amounts, quantities and public links", () => {
    const summary = buildWhatsAppSummary(quote, contact, dictionary.cart);
    const url = new URL(summary.href);
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/573166218114");
    expect(url.searchParams.get("text")).toBe(summary.message);
    for (const value of [
      "Aurora & algodón",
      "Doble / Marfil",
      "DEMO-3",
      "Cantidad: 2",
      "219.000",
      "438.000",
      "https://shop.example.com/productos/aurora",
      "https://images.example.com/a.png",
    ])
      expect(summary.message).toContain(value);
    expect(summary.needsCopy).toBe(false);
  });
  it("omits product URLs when domain not configured, keeps public photos and SKU", () => {
    const summary = buildWhatsAppSummary(
      quote,
      { ...contact, publicOrigin: null },
      dictionary.cart,
    );
    expect(summary.missingOrigin).toBe(true);
    expect(summary.message).not.toContain("/productos/");
    expect(summary.message).toContain("Foto: https://");
  });
  it.each([
    "http://localhost:3000",
    "https://localhost",
    "https://127.0.0.1",
    "https://foo.local",
    "https://user:pass@shop.example.com",
    "javascript:alert(1)",
  ])("rejects nonpublic origin %s", (origin) =>
    expect(publicOrigin(origin)).toBeNull(),
  );
  it("never truncates a long request: full text remains copyable, opening uses short greeting", () => {
    const long = {
      ...quote,
      lines: Array.from({ length: 50 }, (_, i) => ({
        ...quote.lines[0],
        variantId: `v${i}`,
        name: `Producto ${i} ${"é".repeat(120)}`,
      })),
    };
    const summary = buildWhatsAppSummary(long, contact, dictionary.cart);
    expect(summary.needsCopy).toBe(true);
    expect(summary.message).toContain("Producto 49");
    expect(summary.href.length).toBeLessThan(MAX_WHATSAPP_URL_LENGTH);
    expect(new URL(summary.href).searchParams.get("text")).toBe(
      dictionary.cart.shortGreeting,
    );
  });
  it("rejects empty/invalid quote and malformed phone", () => {
    expect(() =>
      buildWhatsAppSummary(
        { ...quote, valid: false },
        contact,
        dictionary.cart,
      ),
    ).toThrow();
    expect(() =>
      buildWhatsAppSummary({ ...quote, lines: [] }, contact, dictionary.cart),
    ).toThrow();
    expect(() =>
      buildWhatsAppSummary(
        quote,
        { ...contact, phone: "1?text=evil" },
        dictionary.cart,
      ),
    ).toThrow();
  });
});
