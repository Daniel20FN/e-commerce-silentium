import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { ThemeProvider, useThemeMode } from "./theme_context";

function ThemeProbe() {
  const { themeMode, setThemeMode } = useThemeMode();
  return <button onClick={() => setThemeMode("light")}>{themeMode}</button>;
}

describe("ThemeProvider hydration", () => {
  afterEach(() => {
    document.cookie = "theme=; max-age=0; path=/";
  });

  it("uses the server snapshot first, then restores the saved theme without hydration errors", async () => {
    document.cookie = "theme=dark; path=/";
    const tree = (
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    const markup = renderToString(tree);
    expect(markup).toContain("light");

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
