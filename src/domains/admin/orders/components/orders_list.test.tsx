import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrderVariantPicker } from "./order_variant_picker";
import { OrdersList } from "./orders_list";
jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn() },
}));
const get = jest.mocked(apiService.get),
  c = dictionary.admin.orders;
beforeEach(() => jest.clearAllMocks());
it("renders honest empty state and sends typed search query without blank search", async () => {
  get.mockResolvedValue({ orders: [], nextCursor: null });
  render(<OrdersList dictionary={dictionary} />);
  await screen.findByText(c.empty);
  expect(get).toHaveBeenCalledWith("/admin/orders", {});
  fireEvent.change(screen.getByRole("textbox", { name: c.search }), {
    target: { value: "Cliente QA" },
  });
  fireEvent.click(screen.getByRole("button", { name: c.searchAction }));
  await waitFor(() =>
    expect(get).toHaveBeenLastCalledWith("/admin/orders", {
      search: "Cliente QA",
      cursor: undefined,
    }),
  );
  expect(screen.getByRole("link", { name: c.new })).toHaveAttribute(
    "href",
    "/admin/pedidos/nuevo",
  );
});
it("uses real catalog photo/stock/SKU and refreshes selected variant price explicitly", async () => {
  const variant = {
    id: "v",
    productId: "p",
    productName: "Aurora",
    sku: "QA-A",
    attributes: "Arena",
    priceCents: 18900000,
    stock: 3,
    imageUrl: "https://example.com/catalog/aurora.webp",
  };
  get.mockResolvedValue({ variants: [variant], nextCursor: null });
  const add = jest.fn(),
    refresh = jest.fn();
  render(
    <OrderVariantPicker
      dictionary={dictionary}
      disabled={false}
      selectedIds={["v"]}
      onAdd={add}
      onRefreshPrice={refresh}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: c.searchAction }));
  await screen.findByText("Aurora");
  expect(screen.getByRole("img", { name: "Aurora" })).toHaveAttribute(
    "src",
    variant.imageUrl,
  );
  fireEvent.click(screen.getByRole("button", { name: c.updatePrice }));
  expect(refresh).toHaveBeenCalledWith(variant);
  expect(add).not.toHaveBeenCalled();
});
