import { getDictionary } from "@/dictionary/services/get-dictionary";
import { OrderWorkspace } from "@/domains/admin/orders/components/order_workspace";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { orderId } = await params;
  const actor = await requireAdminUser(`/admin/pedidos/${orderId}`);
  const { returnTo } = await searchParams;
  return (
    <OrderWorkspace
      key={orderId}
      dictionary={getDictionary("es")}
      actorId={actor.authUserId}
      orderId={orderId}
      returnTo={returnTo}
    />
  );
}
