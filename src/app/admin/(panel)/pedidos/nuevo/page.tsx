import { getDictionary } from "@/dictionary/services/get-dictionary";
import { OrderWorkspace } from "@/domains/admin/orders/components/order_workspace";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
export default async function NewOrderPage() {
  const actor = await requireAdminUser("/admin/pedidos/nuevo");
  return (
    <OrderWorkspace
      dictionary={getDictionary("es")}
      actorId={actor.authUserId}
    />
  );
}
