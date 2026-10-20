import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  operationProduct as product,
  operationVariants as variants,
} from "../__fixtures__/catalog_operations";
import { PriceBatchEditor } from "./price_batch_editor";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: { patch: jest.fn(), get: jest.fn() },
}));
const patch = jest.mocked(apiService.patch),
  get = jest.mocked(apiService.get);
const copy = dictionary.admin.products.operations;
const state = jest.fn(),
  saved = jest.fn();
function setup() {
  return render(
    <PriceBatchEditor
      dictionary={dictionary}
      productId={product.id}
      revision={product.updatedAt}
      variants={variants}
      onStateChange={state}
      onSaved={saved}
    />,
  );
}
const price = (sku = "QA-A") =>
  screen.getByRole("textbox", { name: `${copy.price} — ${sku}` });
const compare = (sku = "QA-A") =>
  screen.getByRole("textbox", { name: `${copy.compare} — ${sku}` });
async function confirm() {
  fireEvent.click(screen.getByRole("button", { name: copy.review }));
  const dialog = await screen.findByRole("dialog", { name: copy.reviewTitle });
  fireEvent.click(within(dialog).getByRole("button", { name: copy.apply }));
}
beforeEach(() => jest.clearAllMocks());
it("reviews old/new values and saves only changed prices with revisions, not stock", async () => {
  patch.mockResolvedValue({ updated: 2 });
  setup();
  expect(screen.getByRole("button", { name: copy.review })).toBeDisabled();
  fireEvent.change(price(), { target: { value: "1234,56" } });
  fireEvent.change(price("QA-B"), { target: { value: "0" } });
  await confirm();
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(patch.mock.calls[0][1]).toEqual({
    expectedProductUpdatedAt: product.updatedAt,
    rows: [
      {
        variantId: "variant-A",
        expectedUpdatedAt: variants[0].updatedAt,
        priceCents: 123456,
        compareAtPriceCents: null,
      },
      {
        variantId: "variant-B",
        expectedUpdatedAt: variants[1].updatedAt,
        priceCents: 0,
        compareAtPriceCents: null,
      },
    ],
  });
});
it("disables review for invalid money and compare-at values", () => {
  setup();
  fireEvent.change(price(), { target: { value: "1.234" } });
  expect(screen.getByText(copy.invalidPrice)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: copy.review })).toBeDisabled();
  fireEvent.change(price(), { target: { value: "200" } });
  fireEvent.change(compare(), { target: { value: "100" } });
  expect(screen.getByText(copy.invalidCompare)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: copy.review })).toBeDisabled();
});
it("preserves proposed fields on conflict and rebase, but refreshes untouched fields and revisions", async () => {
  patch
    .mockRejectedValueOnce(new Error("variant_revision_conflict"))
    .mockResolvedValueOnce({ updated: 1 });
  get.mockImplementation(async (url) =>
    url.endsWith("/variants")
      ? {
          items: [
            {
              ...variants[0],
              compareAtPriceCents: 30000,
              updatedAt: "2026-10-21T00:00:00.000Z",
            },
            variants[1],
          ],
        }
      : { product: { ...product, updatedAt: "2026-10-21T00:00:00.000Z" } },
  );
  setup();
  fireEvent.change(price(), { target: { value: "250" } });
  await confirm();
  await screen.findByText(copy.conflict);
  expect(price()).toHaveValue("250");
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: copy.reload }));
  await screen.findByText(copy.rebased);
  expect(price()).toHaveValue("250");
  expect(compare()).toHaveValue("300.00");
  await confirm();
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(patch.mock.calls[1][1]).toMatchObject({
    expectedProductUpdatedAt: "2026-10-21T00:00:00.000Z",
    rows: [
      {
        variantId: "variant-A",
        expectedUpdatedAt: "2026-10-21T00:00:00.000Z",
        priceCents: 25000,
        compareAtPriceCents: 30000,
      },
    ],
  });
});
it("keeps a retired row proposal visible until explicitly removed", async () => {
  get.mockImplementation(async (url) =>
    url.endsWith("/variants") ? { items: [variants[1]] } : { product },
  );
  setup();
  fireEvent.change(price(), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: copy.reload }));
  await screen.findByText(copy.rebased);
  expect(price()).toHaveValue("250");
  expect(screen.getByText(copy.unavailable)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: copy.review })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: copy.removeRow }));
  expect(screen.queryByText(copy.unavailable)).not.toBeInTheDocument();
});
