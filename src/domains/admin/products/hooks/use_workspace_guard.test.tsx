import dictionary from "@/dictionary/es.json";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EditorGuardDialog } from "../components/editor_guard_dialog";
import { useWorkspaceGuard } from "./use_workspace_guard";

function GuardProbe({
  dirty,
  busy = false,
}: {
  dirty: boolean;
  busy?: boolean;
}) {
  const guard = useWorkspaceGuard({ dirty, busy });
  return <EditorGuardDialog dictionary={dictionary} guard={guard} />;
}

describe("workspace history and unload protection", () => {
  const original = Object.getOwnPropertyDescriptor(window, "navigation");
  afterEach(() => {
    jest.restoreAllMocks();
    if (original) Object.defineProperty(window, "navigation", original);
    else Reflect.deleteProperty(window, "navigation");
  });

  it("blocks a browser history traversal until discard is confirmed", () => {
    class NavigationTarget extends EventTarget {
      currentEntry = { index: 3 };
    }
    const navigation = new NavigationTarget();
    Object.defineProperty(window, "navigation", {
      configurable: true,
      value: navigation,
    });
    const go = jest.spyOn(window.history, "go").mockImplementation(() => {});
    render(<GuardProbe dirty />);
    const event = Object.assign(new Event("navigate", { cancelable: true }), {
      navigationType: "traverse",
      destination: { url: "http://localhost/admin/productos", index: 2 },
    });
    act(() => {
      navigation.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(go).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.admin.products.workspace.discard,
      }),
    );
    expect(go).toHaveBeenCalledWith(-1);
    const continuation = Object.assign(
      new Event("navigate", { cancelable: true }),
      {
        navigationType: "traverse",
        destination: { url: "http://localhost/admin/productos", index: 2 },
      },
    );
    act(() => {
      navigation.dispatchEvent(continuation);
    });
    expect(continuation.defaultPrevented).toBe(false);
  });

  it("removes native unload protection after leaving the workspace", () => {
    const view = render(<GuardProbe dirty />);
    const before = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(true);
    view.unmount();
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("does not block clean navigation or clean unload", () => {
    render(<GuardProbe dirty={false} />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
