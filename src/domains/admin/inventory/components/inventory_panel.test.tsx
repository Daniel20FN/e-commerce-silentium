import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { InventoryData } from "../types/api_params";
import { InventoryPanel } from "./inventory_panel";
jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
const get = jest.mocked(apiService.get),
  post = jest.mocked(apiService.post),
  patch = jest.mocked(apiService.patch);
const copy = dictionary.admin.inventory;
const data: InventoryData = {
  readOnly: false,
  variants: [
    {
      id: "a",
      sku: "QA-A",
      stock: 5,
      revision: 2,
      minimum: 6,
      inTrash: false,
      active: true,
    },
    {
      id: "b",
      sku: "QA-B",
      stock: 0,
      revision: 1,
      minimum: null,
      inTrash: false,
      active: false,
    },
  ],
  movements: [
    {
      id: "m",
      variantId: "a",
      sku: "QA-A",
      type: "entry",
      delta: 5,
      before: 0,
      after: 5,
      actorLabel: "Administración",
      reason: "Compra proveedor",
      reference: null,
      reversedById: null,
      createdAt: "2026-10-20T10:00:00Z",
    },
  ],
  nextCursor: null,
};
const state = jest.fn();
async function setup(value = data) {
  get.mockResolvedValue(value);
  render(
    <InventoryPanel
      dictionary={dictionary}
      productId="product"
      onStateChange={state}
    />,
  );
  await screen.findAllByText("QA-A");
}
async function draft() {
  fireEvent.click(screen.getAllByRole("button", { name: copy.add })[0]);
  fireEvent.change(
    screen.getByRole("textbox", { name: `${copy.quantity} — QA-A` }),
    { target: { value: "2" } },
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: `${copy.reason} — QA-A` }),
    { target: { value: "Entrega proveedor" } },
  );
}
async function submit() {
  fireEvent.click(screen.getByRole("button", { name: copy.review }));
  const dialog = await screen.findByRole("dialog", { name: copy.reviewTitle });
  expect(
    within(dialog).getByText(`${copy.before}: 5 / ${copy.after}: 7`),
  ).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: copy.apply }));
}
beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  jest
    .spyOn(crypto, "randomUUID")
    .mockReturnValue("11111111-1111-4111-8111-111111111111");
});
afterEach(() => jest.restoreAllMocks());
it("shows distinct zero/low states and submits reviewed revision-bound movements", async () => {
  post.mockResolvedValue({ operationId: "done" });
  await setup();
  expect(screen.getByText(copy.low)).toBeInTheDocument();
  expect(screen.getByText(copy.out)).toBeInTheDocument();
  await draft();
  await submit();
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1]).toMatchObject({
    kind: "entry",
    rows: [
      {
        variantId: "a",
        expectedRevision: 2,
        quantity: 2,
        reason: "Entrega proveedor",
      },
    ],
  });
  await screen.findByText(copy.saved);
});
it("preserves drafts and same operation payload after an ambiguous failure", async () => {
  post
    .mockRejectedValueOnce(new Error("network_error"))
    .mockResolvedValueOnce({ operationId: "done" });
  await setup();
  await draft();
  await submit();
  await screen.findByText(copy.error);
  const first = post.mock.calls[0][1];
  expect(
    screen.getByRole("textbox", { name: `${copy.quantity} — QA-A` }),
  ).toHaveValue("2");
  fireEvent.click(screen.getByRole("button", { name: copy.retry }));
  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: copy.apply,
    }),
  );
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  expect(post.mock.calls[1][1]).toEqual(first);
  await screen.findByText(copy.saved);
});
it("rebases conflicts without losing proposals and reconfirms fresh revision", async () => {
  post
    .mockRejectedValueOnce(new Error("inventory_revision_conflict"))
    .mockResolvedValueOnce({ operationId: "done" });
  await setup();
  await draft();
  await submit();
  await screen.findByText(copy.conflict);
  get.mockResolvedValue({
    ...data,
    variants: [
      { ...data.variants[0], stock: 9, revision: 3 },
      data.variants[1],
    ],
  });
  fireEvent.click(screen.getByRole("button", { name: copy.reload }));
  await screen.findByText(copy.rebased);
  expect(
    screen.getByRole("textbox", { name: `${copy.quantity} — QA-A` }),
  ).toHaveValue("2");
  fireEvent.click(screen.getByRole("button", { name: copy.review }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(`${copy.before}: 9 / ${copy.after}: 11`),
  ).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: copy.apply }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  expect(post.mock.calls[1][1]).toMatchObject({
    rows: [{ expectedRevision: 3, quantity: 2 }],
  });
  await screen.findByText(copy.saved);
});
it("keeps archived inventory and trashed variants read-only", async () => {
  await setup({ ...data, readOnly: true });
  expect(
    screen.queryByRole("button", { name: copy.add }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: copy.reverse }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(copy.readonly)).toBeInTheDocument();
});
it("saves an explicit optional minimum using stock revision", async () => {
  patch.mockResolvedValue({ operationId: "min" });
  await setup();
  fireEvent.click(screen.getAllByRole("button", { name: copy.editMinimum })[0]);
  const dialog = await screen.findByRole("dialog", { name: copy.minimumTitle });
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: copy.minimum }),
    { target: { value: "" } },
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: copy.saveMinimum }),
  );
  await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  expect(patch.mock.calls[0][1]).toMatchObject({
    variantId: "a",
    expectedRevision: 2,
    minimum: null,
  });
});
it("prepares a full reversal and requires a new reason", async () => {
  post.mockResolvedValue({ operationId: "reverse" });
  await setup();
  fireEvent.click(screen.getByRole("button", { name: copy.reverse }));
  expect(screen.getByRole("button", { name: copy.review })).toBeDisabled();
  fireEvent.change(
    screen.getByRole("textbox", { name: `${copy.reason} — QA-A` }),
    { target: { value: "Entrega duplicada" } },
  );
  fireEvent.click(screen.getByRole("button", { name: copy.review }));
  const dialog = await screen.findByRole("dialog", { name: copy.reverseTitle });
  expect(
    within(dialog).getByText(`${copy.before}: 5 / ${copy.after}: 0`),
  ).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: copy.apply }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1]).toMatchObject({
    kind: "reversal",
    rows: [
      {
        variantId: "a",
        reversesId: "m",
        quantity: 5,
        reason: "Entrega duplicada",
      },
    ],
  });
});

it("restores an ambiguous submission after remount and reuses its exact key", async () => {
  post
    .mockRejectedValueOnce(new Error("network_error"))
    .mockResolvedValueOnce({ operationId: "done" });
  get.mockResolvedValue(data);
  const view = render(
    <InventoryPanel
      dictionary={dictionary}
      productId="product"
      onStateChange={state}
    />,
  );
  await screen.findAllByText("QA-A");
  await draft();
  await submit();
  await screen.findByText(copy.error);
  const original = post.mock.calls[0][1];
  view.unmount();
  render(
    <InventoryPanel
      dictionary={dictionary}
      productId="product"
      onStateChange={state}
    />,
  );
  await screen.findByText(copy.retryHelp);
  expect(
    screen.getByRole("textbox", { name: `${copy.quantity} — QA-A` }),
  ).toHaveValue("2");
  expect(screen.getByRole("button", { name: copy.reload })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: copy.retry }));
  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: copy.apply,
    }),
  );
  await screen.findByText(copy.saved);
  expect(post.mock.calls[1][1]).toEqual(original);
});
it("never offers retrying a confirmed write when its refresh fails", async () => {
  post.mockResolvedValue({ operationId: "done" });
  await setup();
  await draft();
  get.mockRejectedValue(new Error("network_error"));
  await submit();
  await screen.findByText(copy.savedRefreshError);
  expect(
    screen.queryByRole("button", { name: copy.retry }),
  ).not.toBeInTheDocument();
  expect(sessionStorage.getItem("inventory-pending:batch:product")).toBeNull();
});
