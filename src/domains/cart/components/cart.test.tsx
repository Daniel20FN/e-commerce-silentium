import dictionary from "@/dictionary/es.json";
import type { StorefrontVariant } from "@/domains/storefront/types/catalog";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { fetchCartQuote } from "../services/cart_client";
import { CART_KEY } from "../services/cart_rules";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
} from "../states/cart_state";
import type { CartQuote } from "../types/api_params";
import { AddToCart } from "./add_to_cart";
import { CartBootstrap } from "./cart_bootstrap";
import { CartNav } from "./cart_nav";
import { CartPage } from "./cart_page";

jest.mock("../services/cart_client", () => ({ fetchCartQuote: jest.fn() }));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) =>
    jest
      .requireActual<typeof import("react")>("react")
      .createElement("img", { src, alt }),
}));
const copy = dictionary.cart;
const variant: StorefrontVariant = {
  id: "v1",
  sku: "DEMO",
  stock: 4,
  priceCents: 21900000,
  compareAtPriceCents: null,
  isDefault: true,
  optionValueIds: [],
  images: [],
};
const line = {
  variantId: "v1",
  quantity: 1,
  status: "available",
  name: "Aurora",
  sku: "DEMO",
  attributes: "Doble / Marfil",
  slug: "aurora",
  image: {
    id: "img",
    url: "https://images.example.com/a.png",
    alt: "Aurora foto",
  },
  priceCents: 21900000,
  subtotalCents: 21900000,
  maxQuantity: 4,
} satisfies CartQuote["lines"][number];
const quote: CartQuote = {
  lines: [line],
  valid: true,
  subtotalCents: 21900000,
};
const contact = { phone: "573166218114", publicOrigin: null };
function setup(items = [{ variantId: "v1", quantity: 1 }]) {
  const store = createStore();
  store.set(cartReadyAtom, true);
  store.set(cartItemsAtom, items);
  return store;
}
describe("guest cart UI and persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(fetchCartQuote).mockResolvedValue(quote);
  });
  it("hydrates once without overwriting storage with an empty cart, syncs other tabs", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ version: 1, items: [{ variantId: "v1", quantity: 2 }] }),
    );
    const store = createStore();
    render(
      <Provider store={store}>
        <CartBootstrap />
        <CartNav dictionary={dictionary} />
      </Provider>,
    );
    expect(
      await screen.findByRole("link", {
        name: copy.navCount.replace("{count}", "2"),
      }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(CART_KEY) ?? "{}").items,
    ).toHaveLength(1);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CART_KEY,
          newValue: JSON.stringify({
            version: 1,
            items: [{ variantId: "v1", quantity: 3 }],
          }),
          storageArea: localStorage,
        }),
      ),
    );
    expect(store.get(cartItemsAtom)[0].quantity).toBe(3);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CART_KEY,
          newValue: null,
          storageArea: localStorage,
        }),
      ),
    );
    expect(store.get(cartItemsAtom)).toEqual([]);
  });
  it("recovers corrupt storage and works in memory when writes fail", async () => {
    localStorage.setItem(CART_KEY, "broken");
    const store = createStore();
    const { unmount } = render(
      <Provider store={store}>
        <CartBootstrap />
      </Provider>,
    );
    expect(store.get(cartNoticeAtom)).toBe("recovered");
    unmount();
    const write = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    render(
      <Provider store={store}>
        <AddToCart variant={variant} dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.add }));
    expect(await screen.findByText(copy.storageWarning)).toBeInTheDocument();
    expect(store.get(cartItemsAtom)).toEqual([
      { variantId: "v1", quantity: 1 },
    ]);
    write.mockRestore();
  });
  it("adds exact variant only after server validation, stores no price or personal data", async () => {
    const store = setup([]);
    render(
      <Provider store={store}>
        <AddToCart variant={variant} dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.add }));
    expect(await screen.findByText(copy.added)).toBeInTheDocument();
    expect(fetchCartQuote).toHaveBeenCalledWith([
      { variantId: "v1", quantity: 1 },
    ]);
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? "{}")).toEqual({
      version: 1,
      items: [{ variantId: "v1", quantity: 1 }],
    });
  });
  it("does not lose a concurrent cart change while add validation is pending", async () => {
    let finish: (value: CartQuote) => void = () => {};
    jest.mocked(fetchCartQuote).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const store = setup([]);
    render(
      <Provider store={store}>
        <AddToCart variant={variant} dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.add }));
    act(() => store.set(cartItemsAtom, [{ variantId: "other", quantity: 1 }]));
    await act(async () => finish(quote));
    expect(store.get(cartItemsAtom)).toEqual([
      { variantId: "other", quantity: 1 },
    ]);
    expect(screen.getByText(copy.quantityError)).toBeInTheDocument();
  });
  it("disables incomplete/out-of-stock variants and invalid quantities", () => {
    const store = setup([]);
    const view = render(
      <Provider store={store}>
        <AddToCart variant={null} dictionary={dictionary} />
      </Provider>,
    );
    expect(screen.getByRole("button", { name: copy.add })).toBeDisabled();
    view.rerender(
      <Provider store={store}>
        <AddToCart variant={{ ...variant, stock: 0 }} dictionary={dictionary} />
      </Provider>,
    );
    expect(screen.getByRole("button", { name: copy.add })).toBeDisabled();
    view.rerender(
      <Provider store={store}>
        <AddToCart variant={variant} dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "1.5" },
    });
    expect(screen.getByRole("button", { name: copy.add })).toBeDisabled();
  });
  it("renders empty guest cart without authentication", () => {
    render(
      <Provider store={setup([])}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    expect(screen.getByText(copy.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.explore })).toHaveAttribute(
      "href",
      "/productos",
    );
  });
  it("shows real image/amount and opens a human-reviewed WhatsApp link without clearing cart", async () => {
    const store = setup();
    render(
      <Provider store={store}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    expect(
      await screen.findByRole("img", { name: "Aurora foto" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.buy }));
    const dialog = await screen.findByRole("dialog");
    const link = within(dialog).getByRole("link", { name: copy.openWhatsApp });
    expect(link.getAttribute("href")).toContain(
      "https://wa.me/573166218114?text=",
    );
    expect(within(dialog).getByDisplayValue(/Cantidad: 1/)).toBeInTheDocument();
    expect(within(dialog).getByText(copy.missingOrigin)).toBeInTheDocument();
    expect(store.get(cartItemsAtom)).toHaveLength(1);
    expect(fetchCartQuote).toHaveBeenCalledTimes(2);
  });
  it("blocks invalid stock and allows removal; clear requires confirmation", async () => {
    jest.mocked(fetchCartQuote).mockResolvedValue({
      ...quote,
      valid: false,
      subtotalCents: 0,
      lines: [
        {
          ...line,
          status: "insufficient_stock",
          maxQuantity: 0,
          subtotalCents: null,
        },
      ],
    });
    const store = setup();
    render(
      <Provider store={store}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    await screen.findByText(copy.invalidLines);
    expect(screen.getByRole("button", { name: copy.buy })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.clear }));
    expect(store.get(cartItemsAtom)).toHaveLength(1);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: copy.cancel,
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: copy.remove }));
    expect(await screen.findByText(copy.empty)).toBeInTheDocument();
    expect(store.get(cartItemsAtom)).toEqual([]);
  });
  it("preserves lines on network errors and retries", async () => {
    jest.mocked(fetchCartQuote).mockRejectedValueOnce(new Error("offline"));
    const store = setup();
    render(
      <Provider store={store}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    await screen.findByText(copy.error);
    expect(store.get(cartItemsAtom)).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: copy.retry })[0]);
    expect(
      await screen.findByRole("img", { name: "Aurora foto" }),
    ).toBeInTheDocument();
  });
  it("prevents an old quote from reviving removed lines", async () => {
    let finish: (value: CartQuote) => void = () => {};
    jest.mocked(fetchCartQuote).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const store = setup();
    render(
      <Provider store={store}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.remove }));
    await act(async () => finish(quote));
    expect(screen.getByText(copy.empty)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("requires fixing invalid quantity drafts before preparing a message", async () => {
    render(
      <Provider store={setup()}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    const input = await screen.findByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(
      screen.getByText(copy.quantityRange.replace("{count}", "4")),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.buy })).toBeDisabled();
    fireEvent.change(input, { target: { value: "1" } });
    expect(screen.getByRole("button", { name: copy.buy })).toBeEnabled();
  });
  it("shows price changes discovered during final revalidation", async () => {
    jest
      .mocked(fetchCartQuote)
      .mockResolvedValueOnce(quote)
      .mockResolvedValue({
        ...quote,
        subtotalCents: 22000000,
        lines: [{ ...line, priceCents: 22000000, subtotalCents: 22000000 }],
      });
    render(
      <Provider store={setup()}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    await screen.findByRole("img");
    fireEvent.click(screen.getByRole("button", { name: copy.buy }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(copy.priceChanged)).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(/220.000/)).toBeInTheDocument();
  });
  it("invalidates an open review when refreshed prices change", async () => {
    const store = setup();
    render(
      <Provider store={store}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    await screen.findByRole("img");
    fireEvent.click(screen.getByRole("button", { name: copy.buy }));
    await screen.findByRole("dialog");
    jest.mocked(fetchCartQuote).mockResolvedValue({
      ...quote,
      subtotalCents: 22000000,
      lines: [{ ...line, priceCents: 22000000, subtotalCents: 22000000 }],
    });
    fireEvent(document, new Event("visibilitychange"));
    await screen.findByText(copy.reviewExpired);
    expect(
      screen.getByRole("button", { name: copy.openWhatsApp }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: copy.openWhatsApp }),
    ).not.toHaveAttribute("href");
  });
  it("persists valid quantity changes and confirmed clear", async () => {
    const store = setup();
    jest.mocked(fetchCartQuote).mockImplementation(async (items) => ({
      ...quote,
      lines: [{ ...line, quantity: items[0]?.quantity ?? 1 }],
    }));
    render(
      <Provider store={store}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    const input = await screen.findByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.blur(input);
    expect(store.get(cartItemsAtom)).toEqual([
      { variantId: "v1", quantity: 2 },
    ]);
    expect(
      JSON.parse(localStorage.getItem(CART_KEY) ?? "{}").items[0].quantity,
    ).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: copy.clear }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: copy.clear,
      }),
    );
    expect(store.get(cartItemsAtom)).toEqual([]);
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? "{}").items).toEqual(
      [],
    );
  });
  it("offers a full copy fallback for long messages and manual copying if clipboard fails", async () => {
    const long = { ...quote, lines: [{ ...line, name: "é".repeat(5000) }] };
    jest.mocked(fetchCartQuote).mockResolvedValue(long);
    render(
      <Provider store={setup()}>
        <CartPage dictionary={dictionary} contact={contact} />
      </Provider>,
    );
    await screen.findByRole("img");
    fireEvent.click(screen.getByRole("button", { name: copy.buy }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(copy.longMessage)).toBeInTheDocument();
    const href = within(dialog)
      .getByRole("link", { name: copy.openWhatsApp })
      .getAttribute("href");
    expect(href).not.toBeNull();
    expect(new URL(href ?? "").searchParams.get("text")).toBe(
      copy.shortGreeting,
    );
    fireEvent.click(within(dialog).getByRole("button", { name: copy.copy }));
    expect(await screen.findByText(copy.copyFailed)).toBeInTheDocument();
  });
});
