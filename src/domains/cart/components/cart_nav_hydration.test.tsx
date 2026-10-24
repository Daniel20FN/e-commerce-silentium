import dictionary from "@/dictionary/es.json";
import { act, within } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
} from "../states/cart_state";
import { AddToCart } from "./add_to_cart";
import { CartNav } from "./cart_nav";
import { CartPage } from "./cart_page";

jest.mock("../services/cart_client", () => ({
  fetchCartQuote: jest.fn(async () => ({
    lines: [],
    valid: false,
    subtotalCents: 0,
  })),
}));

it.each(["navigation", "page", "add"])(
  "hydrates a delayed %s island after cart bootstrap restores saved data",
  async (kind) => {
    const store = createStore();
    const element = (
      <Provider store={store}>
        {kind === "navigation" ? (
          <CartNav dictionary={dictionary} />
        ) : kind === "page" ? (
          <CartPage
            dictionary={dictionary}
            contact={{ phone: "573166218114", publicOrigin: null }}
          />
        ) : (
          <AddToCart
            dictionary={dictionary}
            variant={{
              id: "saved",
              sku: "saved",
              stock: 5,
              priceCents: 100,
              compareAtPriceCents: null,
              isDefault: true,
              optionValueIds: [],
              images: [],
            }}
          />
        )}
      </Provider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    store.set(cartItemsAtom, [{ variantId: "saved", quantity: 2 }]);
    store.set(cartReadyAtom, true);
    store.set(cartNoticeAtom, "recovered");
    const recover = jest.fn();
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, element, { onRecoverableError: recover });
      });
      if (kind === "navigation")
        expect(
          within(container).getByRole("link", {
            name: dictionary.cart.navCount.replace("{count}", "2"),
          }),
        ).toBeInTheDocument();
      else
        expect(
          within(container).getByText(dictionary.cart.recoveredWarning),
        ).toBeInTheDocument();
      expect(recover).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
    }
  },
);
