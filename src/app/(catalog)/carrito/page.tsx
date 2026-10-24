import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CartPage } from "@/domains/cart/components/cart_page";
import {
  publicOrigin,
  SALES_WHATSAPP_PHONE,
} from "@/domains/cart/services/whatsapp";

export const metadata = {
  title: getDictionary("es").cart.title,
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <CartPage
      dictionary={{ cart: getDictionary("es").cart }}
      contact={{
        phone: SALES_WHATSAPP_PHONE,
        publicOrigin: publicOrigin(process.env.APP_PUBLIC_URL),
      }}
    />
  );
}
