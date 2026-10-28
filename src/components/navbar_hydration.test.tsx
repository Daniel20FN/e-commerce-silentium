import dictionary from "@/dictionary/es.json";
import {
  currentUserAtom,
  hasResolvedCurrentUserAtom,
} from "@/domains/auth/states/current_user_atom";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Navbar } from "./navbar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock("@/styles/theme_context", () => ({
  useThemeMode: () => ({ themeMode: "light", setThemeMode: jest.fn() }),
}));
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: { post: jest.fn() },
    isPending: () => false,
  }),
}));

const user: CurrentUserDto = {
  id: "customer",
  authUserId: "auth",
  email: "cliente@example.com",
  role: "customer",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: null },
};

it.each([null, user])(
  "hydrates delayed navigation when auth bootstrap has already resolved: %s",
  async (currentUser) => {
    const store = createStore();
    const element = (
      <Provider store={store}>
        <Navbar dictionary={dictionary} immersive />
      </Provider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    store.set(currentUserAtom, currentUser);
    store.set(hasResolvedCurrentUserAtom, true);
    const recover = jest.fn();
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, element, { onRecoverableError: recover });
      });
      expect(
        within(container).getByRole("button", {
          name: dictionary.landing.sessionMenu,
        }),
      ).toBeInTheDocument();
      if (currentUser) expect(within(container).getByText("Ana")).toBeVisible();
      expect(recover).not.toHaveBeenCalled();
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  },
);

it.each([null, user])(
  "exposes the session menu state and its controlling button: %s",
  async (currentUser) => {
    const store = createStore();
    store.set(currentUserAtom, currentUser);
    store.set(hasResolvedCurrentUserAtom, true);
    render(
      <Provider store={store}>
        <Navbar dictionary={dictionary} />
      </Provider>,
    );
    const trigger = screen.getByRole("button", {
      name: dictionary.landing.sessionMenu,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).not.toHaveAttribute("aria-controls");
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", menu.id);
    expect(menu).toHaveAttribute("aria-labelledby", trigger.id);
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false"),
    );
    expect(trigger).not.toHaveAttribute("aria-controls");
  },
);

it("exposes the mobile navigation dialog state and controls", async () => {
  render(<Navbar dictionary={dictionary} />);
  const trigger = screen.getByRole("button", {
    name: dictionary.storefront.openNavigation,
  });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", {
    name: dictionary.landing.mainNavigation,
  });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(trigger).toHaveAttribute("aria-controls", dialog.id);
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.storefront.closeNavigation }),
  );
  await waitFor(() =>
    expect(trigger).toHaveAttribute("aria-expanded", "false"),
  );
  expect(trigger).not.toHaveAttribute("aria-controls");
});
