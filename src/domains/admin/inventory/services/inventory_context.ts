import type { Prisma } from "@prisma/client";
import "server-only";

export interface InventoryActor {
  id: string;
  label: string;
}
export interface InventoryContext {
  type: "initial" | "entry" | "exit" | "count" | "reversal" | "maintenance";
  actorId: string;
  actorLabel: string;
  reason: string;
  operationId?: string;
  reference?: string;
  reversesId?: string;
  variantId?: string;
}
export async function setInventoryContext(
  tx: Prisma.TransactionClient,
  context: InventoryContext,
): Promise<void> {
  const value = JSON.stringify(context);
  await tx.$queryRaw`SELECT set_config('app.inventory_context', ${value}, true)`;
}
