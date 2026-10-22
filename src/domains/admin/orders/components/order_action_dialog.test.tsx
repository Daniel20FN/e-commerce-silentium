import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen } from "@testing-library/react";
import type { OrderDetailDto } from "../types/api_params";
import { OrderActionDialog } from "./order_action_dialog";
const order: OrderDetailDto = {
  id: "a",
  number: 1,
  revision: 2,
  status: "confirmed",
  payment: "paid",
  delivery: "shipping",
  fulfillment: "shipped",
  customerName: "QA Client",
  customerPhone: "3166218114",
  subtotalCents: 100000,
  shippingCents: 50000,
  totalCents: 150000,
  createdAt: "2026-10-21T10:00:00Z",
  updatedAt: "2026-10-21T10:00:00Z",
  address: "Calle QA 10",
  notes: null,
  createdByLabel: "Admin",
  lines: [
    {
      id: "l",
      variantId: "v",
      productId: "p",
      productName: "Aurora",
      sku: "QA",
      attributes: "Arena",
      quantity: 3,
      unitPriceCents: 100000,
      catalogPriceCents: 100000,
      priceReason: null,
      received: 1,
      resellable: 1,
    },
  ],
  events: [],
};
const c = dictionary.admin.orders;
it("returns only newly received resale units, rejects greater than remaining or resale greater than received", () => {
  const apply = jest.fn();
  render(
    <OrderActionDialog
      dictionary={dictionary}
      order={order}
      action="return"
      busy={false}
      onClose={jest.fn()}
      onApply={apply}
    />,
  );
  expect(screen.getByText(c.refundWarning)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: c.reason }), {
    target: { value: "Recepción física parcial" },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: `${c.received} · QA` }),
    { target: { value: "3" } },
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: `${c.resellable} · QA` }),
    { target: { value: "3" } },
  );
  fireEvent.click(screen.getByRole("button", { name: c.apply }));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.change(
    screen.getByRole("textbox", { name: `${c.received} · QA` }),
    { target: { value: "2" } },
  );
  fireEvent.click(screen.getByRole("button", { name: c.apply }));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.change(
    screen.getByRole("textbox", { name: `${c.resellable} · QA` }),
    { target: { value: "1" } },
  );
  fireEvent.click(screen.getByRole("button", { name: c.apply }));
  expect(apply).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "return",
      expectedRevision: 2,
      reason: "Recepción física parcial",
      rows: [{ lineId: "l", received: 2, resellable: 1 }],
    }),
  );
});
