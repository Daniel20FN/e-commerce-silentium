import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { operationProduct as product } from "../__fixtures__/catalog_operations";
import { DuplicateProductDialog } from "./duplicate_product_dialog";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: { post: jest.fn(), get: jest.fn() },
}));
const post = jest.mocked(apiService.post),
  get = jest.mocked(apiService.get);
const copy = dictionary.admin.products.operations;
const setup = () =>
  render(
    <DuplicateProductDialog
      dictionary={dictionary}
      product={product}
      open
      returnTo="/admin/productos?search=QA"
      onClose={jest.fn()}
      onBusyChange={jest.fn()}
    />,
  );
beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

it("defaults costs off, retains the operation across retries and links to the created draft", async () => {
  post
    .mockRejectedValueOnce(new Error("network_error"))
    .mockResolvedValueOnce({ productId: "copy", skippedCategories: 1 });
  setup();
  expect(
    screen.getByRole("checkbox", { name: copy.copyCosts }),
  ).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: copy.confirmCopy }));
  await screen.findByText(copy.error);
  expect(screen.getByRole("checkbox", { name: copy.copyCosts })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: copy.confirmCopy }));
  await screen.findByText(copy.copied);
  expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
  expect(post.mock.calls[0][1]).toMatchObject({
    copyCosts: false,
    expectedUpdatedAt: product.updatedAt,
    operationId: expect.any(String),
  });
  expect(screen.getByRole("link", { name: copy.openCopy })).toHaveAttribute(
    "href",
    "/admin/productos/copy?section=information&returnTo=%2Fadmin%2Fproductos%3Fsearch%3DQA",
  );
  expect(
    sessionStorage.getItem(`catalog-duplication:${product.id}`),
  ).toBeNull();
});
it("copies costs only after explicit selection", async () => {
  post.mockResolvedValue({ productId: "copy", skippedCategories: 0 });
  setup();
  fireEvent.click(screen.getByRole("checkbox", { name: copy.copyCosts }));
  fireEvent.click(screen.getByRole("button", { name: copy.confirmCopy }));
  await screen.findByText(copy.copied);
  expect(post.mock.calls[0][1]).toMatchObject({ copyCosts: true });
});
it("restores an unfinished intent after remount instead of silently creating a new one", async () => {
  const intent = {
    operationId: "14170c9c-9785-4e50-bcb0-5b697316701e",
    copyCosts: true,
    expectedUpdatedAt: product.updatedAt,
  };
  sessionStorage.setItem(
    `catalog-duplication:${product.id}`,
    JSON.stringify(intent),
  );
  post.mockResolvedValue({ productId: "copy", skippedCategories: 0 });
  setup();
  expect(screen.getByRole("checkbox", { name: copy.copyCosts })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: copy.confirmCopy }));
  await screen.findByText(copy.copied);
  expect(post.mock.calls[0][1]).toEqual(intent);
});
it("only prepares a fresh intent after explicit conflict recovery and a fresh server read", async () => {
  post
    .mockRejectedValueOnce(new Error("product_revision_conflict"))
    .mockResolvedValueOnce({ productId: "copy", skippedCategories: 0 });
  get.mockResolvedValue({
    product: { ...product, updatedAt: "2026-10-21T00:00:00.000Z" },
  });
  setup();
  fireEvent.click(screen.getByRole("button", { name: copy.confirmCopy }));
  await screen.findByText(copy.copyConflict);
  fireEvent.click(screen.getByRole("button", { name: copy.newAttempt }));
  await waitFor(() =>
    expect(
      screen.getByRole("checkbox", { name: copy.copyCosts }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: copy.confirmCopy }));
  await screen.findByText(copy.copied);
  expect(post.mock.calls[1][1]).toMatchObject({
    expectedUpdatedAt: "2026-10-21T00:00:00.000Z",
  });
  expect(post.mock.calls[1][1]).not.toEqual(post.mock.calls[0][1]);
});
