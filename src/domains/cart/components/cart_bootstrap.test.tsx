import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { CART_KEY } from "../services/cart_constants";
import { readCart } from "../services/cart_rules";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
} from "../states/cart_atoms";
import { CartBootstrap } from "./cart_bootstrap";

jest.mock("../services/cart_rules", () => {
  const actual = jest.requireActual<typeof import("../services/cart_rules")>(
    "../services/cart_rules",
  );
  return { ...actual, readCart: jest.fn(actual.readCart) };
});

const persisted = JSON.stringify({
  version: 1,
  items: [{ variantId: "linen", quantity: 2 }],
});
function setup() {
  const store = createStore();
  const view = render(
    <Provider store={store}>
      <CartBootstrap />
    </Provider>,
  );
  return { store, ...view };
}
function storage(newValue: string | null, key: string | null = CART_KEY) {
  fireEvent(
    window,
    new StorageEvent("storage", { key, newValue, storageArea: localStorage }),
  );
}
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});
afterEach(() => jest.restoreAllMocks());

it("initializes an empty browser without parsing", () => {
  const { store } = setup();
  expect(store.get(cartReadyAtom)).toBe(true);
  expect(store.get(cartItemsAtom)).toEqual([]);
  expect(readCart).not.toHaveBeenCalled();
});
it("validates persisted items before enabling the cart", async () => {
  localStorage.setItem(CART_KEY, persisted);
  const { store } = setup();
  expect(store.get(cartReadyAtom)).toBe(false);
  await waitFor(() => expect(store.get(cartReadyAtom)).toBe(true));
  expect(store.get(cartItemsAtom)).toEqual([
    { variantId: "linen", quantity: 2 },
  ]);
});
it("recovers malformed persisted input without trusting its fields", async () => {
  localStorage.setItem(
    CART_KEY,
    '{"version":1,"items":[{"variantId":"x","quantity":-1}]}',
  );
  const { store } = setup();
  await waitFor(() => expect(store.get(cartReadyAtom)).toBe(true));
  expect(store.get(cartItemsAtom)).toEqual([]);
  expect(store.get(cartNoticeAtom)).toBe("recovered");
});
it.each([CART_KEY, null])(
  "does not overwrite a newer clear event (%s) with a pending restore",
  async (key) => {
    localStorage.setItem(CART_KEY, persisted);
    const { store } = setup();
    storage(null, key);
    await act(async () => {});
    expect(store.get(cartReadyAtom)).toBe(true);
    expect(store.get(cartItemsAtom)).toEqual([]);
  },
);
it("applies the latest cross-tab value and ignores unrelated storage", async () => {
  const { store } = setup();
  storage(persisted, "unrelated");
  expect(store.get(cartItemsAtom)).toEqual([]);
  storage(persisted);
  storage(
    JSON.stringify({ version: 1, items: [{ variantId: "new", quantity: 3 }] }),
  );
  await waitFor(() =>
    expect(store.get(cartItemsAtom)).toEqual([
      { variantId: "new", quantity: 3 },
    ]),
  );
});
it("does not update shared atoms after unmount", async () => {
  localStorage.setItem(CART_KEY, persisted);
  const { store, unmount } = setup();
  unmount();
  await act(async () => {});
  expect(store.get(cartReadyAtom)).toBe(false);
  expect(store.get(cartItemsAtom)).toEqual([]);
});
it("keeps the cart usable when storage is unavailable", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  const { store } = setup();
  expect(store.get(cartReadyAtom)).toBe(true);
  expect(store.get(cartNoticeAtom)).toBe("storage");
});
