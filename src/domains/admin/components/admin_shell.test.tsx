import dictionary from "@/dictionary/es.json";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AdminShell } from "./admin_shell";

jest.mock("next/navigation", () => ({ usePathname: () => "/admin/productos" }));
const user: CurrentUserDto = {
  id: "user",
  authUserId: "auth",
  email: "admin@example.invalid",
  role: "admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Daniel", lastName: null },
};
let desktop = true;
const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  jest.useFakeTimers();
  desktop = true;
  window.matchMedia = jest.fn((media) => ({
    matches: desktop,
    media,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});
afterEach(() => {
  jest.useRealTimers();
  window.matchMedia = originalMatchMedia;
});
function setup() {
  render(
    <ThemeProvider theme={createTheme()}>
      <AdminShell dictionary={dictionary} currentUser={user}>
        <div />
      </AdminShell>
    </ThemeProvider>,
  );
}
it("opens contextual help without replacing an unsaved editing tab", () => {
  setup();
  const help = screen.getByRole("link", {
    name: dictionary.admin.guide.contextHelp,
  });
  expect(help).toHaveAttribute("href", "/admin/guia?tema=productos");
  expect(help).toHaveAttribute("target", "_blank");
  expect(help).toHaveAttribute("rel", "noopener noreferrer");
  expect(
    screen.getByRole("link", { name: dictionary.admin.navigation.guide }),
  ).toHaveAttribute("href", "/admin/guia");
});
it("labels collapsed links and shows their tooltip on desktop hover", () => {
  setup();
  const products = screen.getByRole("link", {
    name: dictionary.admin.navigation.products,
    exact: true,
  });
  expect(products).toHaveAttribute("aria-current", "page");
  fireEvent.mouseOver(products);
  act(() => {
    jest.advanceTimersByTime(400);
  });
  expect(screen.getByRole("tooltip")).toHaveTextContent(
    dictionary.admin.navigation.products,
  );
});
it("shows tooltips for keyboard focus without changing the link name", () => {
  setup();
  const orders = screen.getByRole("link", {
    name: dictionary.admin.navigation.orders,
    exact: true,
  });
  fireEvent.keyDown(document.body, { key: "Tab" });
  act(() => {
    orders.focus();
    jest.advanceTimersByTime(400);
  });
  expect(screen.getByRole("tooltip")).toHaveTextContent(
    dictionary.admin.navigation.orders,
  );
  expect(orders).toHaveAccessibleName(dictionary.admin.navigation.orders);
});
it("does not suppress desktop tooltips based on the primary pointer type", () => {
  setup();
  expect(window.matchMedia).toHaveBeenCalledWith("(min-width:900px)");
  expect(
    jest
      .mocked(window.matchMedia)
      .mock.calls.every(
        ([query]) => !query.includes("pointer") && !query.includes("hover"),
      ),
  ).toBe(true);
  fireEvent.mouseOver(
    screen.getByRole("link", {
      name: dictionary.admin.navigation.categories,
      exact: true,
    }),
  );
  act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(screen.getByRole("tooltip")).toHaveTextContent(
    dictionary.admin.navigation.categories,
  );
});
it("does not show redundant tooltips when the desktop drawer is expanded", () => {
  setup();
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.admin.layout.menu }),
  );
  fireEvent.mouseOver(
    screen.getByRole("link", {
      name: dictionary.admin.navigation.products,
      exact: true,
    }),
  );
  act(() => {
    jest.advanceTimersByTime(800);
  });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});
it("disables navigation tooltips for mobile/touch even on hover or long press", () => {
  desktop = false;
  setup();
  const orders = screen.getByRole("link", {
    name: dictionary.admin.navigation.orders,
    exact: true,
  });
  fireEvent.mouseOver(orders);
  fireEvent.touchStart(orders);
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});
