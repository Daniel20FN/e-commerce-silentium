import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { OrderDetailDto } from "../types/api_params";
import {
  canCancelOrder,
  canReturnOrder,
  nextOrderFulfillment,
} from "./order_action_dialog";
import { emptyOrderForm, formToDraft } from "./order_form";
import { parsePrice } from "./order_format";
import {
  clearOrderPending,
  readOrderPending,
  saveOrderPending,
} from "./order_pending_intent";
import { OrderWorkspace } from "./order_workspace";
jest.setTimeout(30000);
jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
const push = jest.fn(),
  replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
const get = jest.mocked(apiService.get),
  post = jest.mocked(apiService.post);
const c = dictionary.admin.orders;
it("labels and preserves an internal priority return destination", async () => {
  render(
    <OrderWorkspace
      dictionary={dictionary}
      actorId="admin"
      returnTo="/admin/pendientes?group=unpaid"
    />,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: dictionary.admin.dashboard.operations.backToQueue,
    }),
  );
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/admin/pendientes?group=unpaid"),
  );
});
const order: OrderDetailDto = {
  id: "order-a",
  number: 12,
  revision: 3,
  status: "draft",
  payment: "pending",
  delivery: "pickup",
  fulfillment: "pending",
  customerName: "Cliente QA",
  customerPhone: "+573166218114",
  subtotalCents: 18900000,
  shippingCents: 0,
  totalCents: 18900000,
  createdAt: "2026-10-21T10:00:00Z",
  updatedAt: "2026-10-21T10:00:00Z",
  address: null,
  notes: null,
  createdByLabel: "Daniel",
  lines: [
    {
      id: "line-a",
      variantId: "variant-a",
      productId: "product-a",
      productName: "Aurora QA",
      sku: "QA-A",
      attributes: "Doble / Arena",
      quantity: 1,
      unitPriceCents: 18900000,
      catalogPriceCents: 18900000,
      priceReason: null,
      received: 0,
      resellable: 0,
    },
  ],
  events: [
    {
      id: "event-a",
      kind: "created",
      actorLabel: "Daniel",
      reason: null,
      from: null,
      to: "draft",
      createdAt: "2026-10-21T10:00:00Z",
      returns: [],
    },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  jest
    .spyOn(crypto, "randomUUID")
    .mockReturnValue("11111111-1111-4111-8111-111111111111");
  get.mockResolvedValue(order);
});
afterEach(() => jest.restoreAllMocks());
async function setup(value = order) {
  get.mockResolvedValue(value);
  render(
    <OrderWorkspace
      dictionary={dictionary}
      actorId="actor"
      orderId={value.id}
    />,
  );
  await screen.findByText("Pedido #12");
}
async function confirm() {
  fireEvent.click(screen.getByRole("button", { name: c.confirm }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(c.confirmHint)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: c.apply }));
}
it("requires explicit confirmation and sends revision-bound stock action once", async () => {
  post.mockResolvedValue({ orderId: "order-a", operationId: "done" });
  await setup();
  await confirm();
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1]).toMatchObject({
    kind: "confirm",
    expectedRevision: 3,
  });
  await screen.findByText(c.saved);
});
it("shows normal progress instead of recovery controls while the write is still running", async () => {
  post.mockReturnValue(new Promise(() => {}));
  await setup();
  await confirm();
  expect(await screen.findByRole("status")).toHaveTextContent(c.saving);
  expect(
    screen.queryByRole("button", { name: c.retry }),
  ).not.toBeInTheDocument();
});
it("freezes ambiguous response and replays exact body, including across remount", async () => {
  post.mockRejectedValue(new Error("Failed to fetch"));
  await setup();
  await confirm();
  await screen.findByText(c.unknown);
  const body = post.mock.calls[0][1];
  expect(screen.getByRole("button", { name: c.save })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: c.retry }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  expect(post.mock.calls[1][1]).toEqual(body);
  const recovered = readOrderPending("actor", "order-a");
  expect(recovered?.payload).toEqual(body);
});
it("distinguishes recorded mutation from failed detail refresh", async () => {
  await setup();
  post.mockResolvedValue({ orderId: "order-a", operationId: "done" });
  get.mockRejectedValue(new Error("network"));
  await confirm();
  await screen.findByText(c.refreshFailed);
  expect(
    screen.queryByRole("button", { name: c.retry }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: c.confirm })).toBeDisabled();
  expect(readOrderPending("actor", "order-a")).toBeNull();
});
it("preserves editable proposal on stale revision until explicit rebase", async () => {
  await setup();
  fireEvent.change(screen.getByRole("textbox", { name: c.customerName }), {
    target: { value: "Propuesta conservada" },
  });
  const put = jest.mocked(apiService.put);
  put.mockRejectedValue(new Error("order_conflict"));
  fireEvent.click(screen.getByRole("button", { name: c.save }));
  await screen.findByText(c.conflict);
  expect(screen.getByRole("textbox", { name: c.customerName })).toHaveValue(
    "Propuesta conservada",
  );
  expect(screen.getByRole("button", { name: c.save })).toBeDisabled();
  get.mockResolvedValue({ ...order, revision: 4 });
  fireEvent.click(screen.getByRole("button", { name: c.rebase }));
  await screen.findByText(c.rebased);
  expect(screen.getByRole("textbox", { name: c.customerName })).toHaveValue(
    "Propuesta conservada",
  );
  expect(screen.getByRole("button", { name: c.save })).not.toBeDisabled();
});
it("shows immutable confirmed lines and independent payment action", async () => {
  await setup({ ...order, status: "confirmed", payment: "paid" });
  expect(screen.getByText(c.lockedHint)).toBeInTheDocument();
  expect(
    screen.queryByRole("textbox", { name: c.customerName }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: c.markPending }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: c.apply }));
  expect(post).not.toHaveBeenCalled();
  expect(within(dialog).getByText(c.validation)).toBeInTheDocument();
});
it("binds persisted pending to actor/order/tab and strictly validates payload", () => {
  const payload = {
    operationId: crypto.randomUUID(),
    expectedRevision: 3,
    kind: "confirm" as const,
  };
  saveOrderPending("actor", "order-a", { mode: "mutate", payload });
  expect(readOrderPending("actor", "order-a")?.payload).toEqual(payload);
  expect(readOrderPending("other", "order-a")).toBeNull();
  expect(readOrderPending("actor", "other")).toBeNull();
  sessionStorage.setItem(
    "orders-tab-scope",
    "22222222-2222-4222-8222-222222222222",
  );
  expect(readOrderPending("actor", "order-a")).toBeNull();
  clearOrderPending("actor", "order-a");
  expect(sessionStorage.getItem("orders-pending:actor:order-a")).toBeNull();
});
it("parses COP cents exactly and rejects malformed money or negotiation without motive", () => {
  expect(parsePrice("189000,25")).toBe(18900025);
  expect(parsePrice("1e4")).toBeNull();
  expect(parsePrice("10.001")).toBeNull();
  expect(formToDraft(emptyOrderForm())).toBeNull();
});
it("cancels only before physical exit and records returns after it", () => {
  expect(
    canCancelOrder({ ...order, status: "confirmed", fulfillment: "ready" }),
  ).toBe(true);
  expect(
    canCancelOrder({ ...order, status: "confirmed", fulfillment: "shipped" }),
  ).toBe(false);
  expect(
    canReturnOrder({
      ...order,
      status: "confirmed",
      delivery: "shipping",
      fulfillment: "shipped",
    }),
  ).toBe(true);
  expect(
    canReturnOrder({
      ...order,
      status: "confirmed",
      delivery: "pickup",
      fulfillment: "ready",
    }),
  ).toBe(false);
  expect(
    nextOrderFulfillment({
      ...order,
      status: "confirmed",
      fulfillment: "preparing",
    }),
  ).toBe("ready");
});
it("keeps new order editable after known rejected price or catalog operation", async () => {
  saveOrderPending("actor", "new", {
    mode: "create",
    payload: {
      operationId: crypto.randomUUID(),
      customerName: "Cliente QA",
      customerPhone: "+573166218114",
      delivery: "pickup",
      shippingCents: 0,
      lines: [
        {
          variantId: "variant-a",
          quantity: 1,
          unitPriceCents: 18900000,
          catalogPriceCents: 18900000,
        },
      ],
    },
  });
  post.mockRejectedValue(new Error("order_price_changed"));
  render(<OrderWorkspace dictionary={dictionary} actorId="actor" />);
  fireEvent.click(await screen.findByRole("button", { name: c.retry }));
  await screen.findByText(c.priceChanged);
  expect(
    screen.getByRole("textbox", { name: c.customerName }),
  ).not.toBeDisabled();
  expect(screen.getByRole("button", { name: c.save })).not.toBeDisabled();
  expect(
    screen.queryByRole("button", { name: c.reload }),
  ).not.toBeInTheDocument();
  expect(readOrderPending("actor", "new")).toBeNull();
});
