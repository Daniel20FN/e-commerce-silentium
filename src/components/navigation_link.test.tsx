import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import NavigationLink, { NavigationFeedbackProvider } from "./navigation_link";

let mockPending = false;
jest.mock("next/link", () => ({
  ...jest.requireActual<typeof import("next/link")>("next/link"),
  useLinkStatus: () => ({ pending: mockPending }),
}));
beforeEach(() => {
  mockPending = false;
});

function Example() {
  return (
    <NavigationFeedbackProvider label={dictionary.general.loading}>
      <NavigationLink href="/productos">
        {dictionary.navigation.products}
      </NavigationLink>
    </NavigationFeedbackProvider>
  );
}

it("does not display progress for idle or already resolved links", () => {
  render(<Example />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("announces a real pending transition outside the link and removes feedback when finished", () => {
  mockPending = true;
  const { rerender } = render(<Example />);
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent(dictionary.general.loading);
  expect(status).toHaveAttribute("aria-live", "polite");
  expect(screen.getByRole("link")).not.toContainElement(status);
  mockPending = false;
  rerender(<Example />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("preserves the anchor ref, href and native click handlers used by MUI and drawers", () => {
  const ref = createRef<HTMLAnchorElement>();
  const click = jest.fn((event) => event.preventDefault());
  render(
    <NavigationLink ref={ref} href="/#colecciones" onClick={click}>
      {dictionary.navigation.collections}
    </NavigationLink>,
  );
  const link = screen.getByRole("link");
  expect(ref.current).toBe(link);
  expect(link).toHaveAttribute("href", "/#colecciones");
  fireEvent.click(link);
  expect(click).toHaveBeenCalledTimes(1);
});
