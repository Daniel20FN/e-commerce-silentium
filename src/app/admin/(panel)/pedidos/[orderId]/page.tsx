import { getDictionary } from "@/dictionary/services/get-dictionary";
import { OrderWorkspace } from "@/domains/admin/orders/components/order_workspace";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const actor = await requireAdminUser(`/admin/pedidos/${orderId}`);
  return (
    <OrderWorkspace
      key={orderId}
      dictionary={getDictionary("es")}
      actorId={actor.authUserId}
      orderId={orderId}
    />
  );
}
