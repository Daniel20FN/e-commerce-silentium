import dictionary from "@/dictionary/es.json";
import {
  currentUserAtom,
  hasResolvedCurrentUserAtom,
} from "@/domains/auth/states/current_user_atom";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { lightTheme } from "@/styles/mui_theme";
import { createTheme, ThemeProvider } from "@mui/material";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { Navbar } from "./navbar";
const mockPathname = jest.fn(() => "/");
const mockPush = jest.fn();
const mockPost = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}));
jest.mock("@/styles/theme_context", () => ({
  useThemeMode: () => ({ themeMode: "light", setThemeMode: jest.fn() }),
}));
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: { post: mockPost },
    isPending: () => false,
  }),
}));
function setup(user: CurrentUserDto | null = null) {
  const store = createStore();
  store.set(currentUserAtom, user);
  store.set(hasResolvedCurrentUserAtom, true);
  return store;
}
const user: CurrentUserDto = {
  id: "customer",
  authUserId: "auth",
  email: "qa@example.com",
  role: "customer",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: null },
};

describe("public landing navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue("/");
    mockPost.mockResolvedValue({ redirectTo: "/" });
  });
  it("overrides the theme inline AppBar style and becomes opaque after scrolling in immersive mode", () => {
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      value: 0,
    });
    const { container } = render(
      <Provider store={setup()}>
        <ThemeProvider theme={createTheme(lightTheme)}>
          <Navbar dictionary={dictionary} immersive />
        </ThemeProvider>
      </Provider>,
    );
    const header = container.querySelector("header");
    expect(header?.style.backdropFilter).toBe("none");
    expect(container.querySelectorAll(".MuiToolbar-root")).toHaveLength(1);
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      value: 120,
    });
    fireEvent.scroll(window);
    expect(header).toHaveStyle({ backgroundColor: "rgb(0, 30, 59)" });
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      value: 0,
    });
  });
  it("uses same-document anchors on landing and preserves cart/auth entry points", () => {
    const { container } = render(
      <Provider store={setup()}>
        <Navbar dictionary={dictionary} />
      </Provider>,
    );
    const nav = screen.getByRole("navigation", {
      name: dictionary.landing.mainNavigation,
    });
    for (const target of [
      "inicio",
      "productos",
      "colecciones",
      "nosotros",
      "ayuda",
      "contacto",
    ])
      expect(nav.querySelector(`a[href="#${target}"]`)).not.toBeNull();
    expect(container.querySelector('a[href="/carrito"]')).not.toBeNull();
    expect(
      screen.getByRole("link", { name: dictionary.landing.skipLink }),
    ).toHaveAttribute("href", "#contenido");
    expect(
      container.querySelector(
        'a[href="/nosotros"],a[href="/contacto"],a[href^="/account"]',
      ),
    ).toBeNull();
  });
  it("returns to landing anchors from product/cart pages", () => {
    mockPathname.mockReturnValue("/carrito");
    const { container } = render(
      <Provider store={setup()}>
        <Navbar dictionary={dictionary} />
      </Provider>,
    );
    expect(container.querySelector('a[href="/#nosotros"]')).not.toBeNull();
    expect(container.querySelector('a[href="/#contacto"]')).not.toBeNull();
  });
  it("closes mobile navigation when a section is chosen", async () => {
    render(
      <Provider store={setup()}>
        <Navbar dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.storefront.openNavigation,
      }),
    );
    const nav = screen.getByRole("navigation", {
      name: dictionary.landing.mainNavigation,
    });
    fireEvent.click(
      within(nav).getByRole("link", { name: dictionary.navigation.contact }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: dictionary.storefront.closeNavigation,
        }),
      ).not.toBeInTheDocument(),
    );
  });
  it("keeps customer logout but never links to unimplemented account/orders/wishlist", async () => {
    const store = setup(user);
    const { container } = render(
      <Provider store={store}>
        <Navbar dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.landing.sessionMenu }),
    );
    expect(
      screen.queryByRole("menuitem", { name: dictionary.auth.navbar.orders }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="/account"]')).toBeNull();
    fireEvent.click(
      screen.getByRole("menuitem", { name: dictionary.auth.navbar.logout }),
    );
    await waitFor(() => expect(store.get(currentUserAtom)).toBeNull());
    expect(mockPush).toHaveBeenCalledWith("/");
  });
  it("keeps the real admin panel entry for eligible staff", () => {
    render(
      <Provider store={setup({ ...user, role: "admin" })}>
        <Navbar dictionary={dictionary} />
      </Provider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.landing.sessionMenu }),
    );
    expect(
      screen.getByRole("menuitem", { name: dictionary.admin.navigation.panel }),
    ).toHaveAttribute("href", "/admin");
  });
});
