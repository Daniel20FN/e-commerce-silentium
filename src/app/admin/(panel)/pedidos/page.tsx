import { getDictionary } from "@/dictionary/services/get-dictionary";
import { OrdersList } from "@/domains/admin/orders/components/orders_list";
export default function OrdersPage() {
  return <OrdersList dictionary={getDictionary("es")} />;
}
