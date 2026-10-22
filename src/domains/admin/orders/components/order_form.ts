import { createOrderSchema } from "../services/order_schemas";
import type {
  OrderDetailDto,
  OrderDraftParams,
  OrderVariantDto,
} from "../types/api_params";
import { parsePrice, parseQuantity, priceInput } from "./order_format";
export interface DraftLine {
  variantId: string;
  productName: string;
  sku: string;
  attributes: string;
  quantity: string;
  unitPrice: string;
  catalogPriceCents: number;
  priceReason: string;
}
export interface OrderForm {
  customerName: string;
  customerPhone: string;
  delivery: "shipping" | "pickup";
  address: string;
  shipping: string;
  notes: string;
  lines: DraftLine[];
}
export const emptyOrderForm = (): OrderForm => ({
  customerName: "",
  customerPhone: "",
  delivery: "pickup",
  address: "",
  shipping: "0",
  notes: "",
  lines: [],
});
export function orderToForm(order: OrderDetailDto): OrderForm {
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    delivery: order.delivery,
    address: order.address ?? "",
    shipping: priceInput(order.shippingCents),
    notes: order.notes ?? "",
    lines: order.lines.map((l) => ({
      ...l,
      quantity: String(l.quantity),
      unitPrice: priceInput(l.unitPriceCents),
      priceReason: l.priceReason ?? "",
    })),
  };
}
export function variantToLine(v: OrderVariantDto): DraftLine {
  return {
    variantId: v.id,
    productName: v.productName,
    sku: v.sku,
    attributes: v.attributes,
    quantity: "1",
    unitPrice: priceInput(v.priceCents),
    catalogPriceCents: v.priceCents,
    priceReason: "",
  };
}
export function draftToForm(
  draft: OrderDraftParams,
  existing?: OrderDetailDto,
): OrderForm {
  return {
    ...draft,
    address: draft.address ?? "",
    shipping: priceInput(draft.shippingCents),
    notes: draft.notes ?? "",
    lines: draft.lines.map((l) => {
      const snapshot = existing?.lines.find((s) => s.variantId === l.variantId);
      return {
        ...l,
        quantity: String(l.quantity),
        unitPrice: priceInput(l.unitPriceCents),
        priceReason: l.priceReason ?? "",
        productName: snapshot?.productName ?? l.variantId,
        sku: snapshot?.sku ?? "",
        attributes: snapshot?.attributes ?? "",
      };
    }),
  };
}
export function formToDraft(form: OrderForm): OrderDraftParams | null {
  const shipping = parsePrice(form.shipping);
  if (shipping === null) return null;
  const lines = form.lines.map((l) => ({
    variantId: l.variantId,
    quantity: parseQuantity(l.quantity) ?? -1,
    unitPriceCents: parsePrice(l.unitPrice) ?? -1,
    catalogPriceCents: l.catalogPriceCents,
    ...(l.priceReason.trim() ? { priceReason: l.priceReason.trim() } : {}),
  }));
  const parsed = createOrderSchema.safeParse({
    operationId: "00000000-0000-4000-8000-000000000000",
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    delivery: form.delivery,
    ...(form.delivery === "shipping" ? { address: form.address } : {}),
    shippingCents: shipping,
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    lines,
  });
  if (!parsed.success) return null;
  const { operationId, ...draft } = parsed.data;
  void operationId;
  return draft;
}
