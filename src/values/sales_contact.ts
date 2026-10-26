export const SALES_WHATSAPP_PHONE = "573166218114";
export const SALES_PHONE_DISPLAY = "+57 316 6218114";
export const SALES_EMAIL = "contacto@silentium-hogar.com";
export const SALES_INSTAGRAM_URL = "https://www.instagram.com/silentium.hogar/";
export const SALES_INSTAGRAM_HANDLE = "@silentium.hogar";

export function salesWhatsAppHref(message: string): string {
  return `https://wa.me/${SALES_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
