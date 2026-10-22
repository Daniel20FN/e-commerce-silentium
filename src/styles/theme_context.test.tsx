import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { ThemeProvider, useThemeMode } from "./theme_context";

function ThemeProbe() {
  const { themeMode, setThemeMode } = useThemeMode();
  return <button onClick={() => setThemeMode("light")}>{themeMode}</button>;
}

describe("ThemeProvider hydration", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });
  afterEach(() => {
    document.cookie = "theme=; max-age=0; path=/";
    jest.restoreAllMocks();
  });

  it("defaults to light even when the operating system prefers dark", () => {
    const preference = jest.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(preference).not.toHaveBeenCalled();
  });

  it("defaults to light for an invalid saved choice", () => {
    document.cookie = "theme=invalid; path=/";
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("light");
  });

  it("hydrates the validated server theme without a forced-light first paint", async () => {
    document.cookie = "theme=dark; path=/";
    const tree = (
      <ThemeProvider initialTheme="dark">
        <ThemeProbe />
      </ThemeProvider>
    );
    const markup = renderToString(tree);
    expect(markup).toContain("dark");

    const container = document.createElement("div");
    container.innerHTML = markup;
    const onRecoverableError = jest.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError });
    });
    expect(container.textContent).toBe("dark");
    expect(onRecoverableError).not.toHaveBeenCalled();
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(container.textContent).toBe("light");
    expect(document.cookie).toContain("theme=light");
    await act(async () => root?.unmount());
  });
});
