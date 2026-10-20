"use client";

import type { AdminEditorState } from "@/domains/admin/components/admin_editor_surface";
import { useCallback, useEffect, useRef, useState } from "react";

interface HistoryNavigation extends Event {
  navigationType: "traverse";
  destination: { url: string; index: number };
}

function isHistoryNavigation(event: Event): event is HistoryNavigation {
  return (
    "navigationType" in event &&
    event.navigationType === "traverse" &&
    "destination" in event &&
    typeof event.destination === "object" &&
    event.destination !== null &&
    "url" in event.destination &&
    typeof event.destination.url === "string" &&
    "index" in event.destination &&
    typeof event.destination.index === "number"
  );
}

export function useWorkspaceGuard(state: AdminEditorState) {
  const current = useRef(state);
  const bypass = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  const [prompt, setPrompt] = useState<"busy" | "dirty" | null>(null);
  if (prompt === "busy" && !state.busy) setPrompt(null);
  useEffect(() => {
    current.current = state;
  }, [state]);

  const request = useCallback((action: () => void) => {
    if (current.current.busy) {
      setPrompt("busy");
      return;
    }
    if (current.current.dirty) {
      pending.current = action;
      setPrompt("dirty");
    } else action();
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!bypass.current && (current.current.dirty || current.current.busy)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        (!current.current.dirty && !current.current.busy)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      request(() => {
        bypass.current = true;
        window.location.assign(link.href);
      });
    };
    const navigation =
      "navigation" in window && window.navigation instanceof EventTarget
        ? window.navigation
        : null;
    const traverse = (event: Event) => {
      if (
        bypass.current ||
        !event.cancelable ||
        !isHistoryNavigation(event) ||
        (!current.current.dirty && !current.current.busy)
      )
        return;
      const entry =
        navigation && "currentEntry" in navigation
          ? navigation.currentEntry
          : null;
      const index =
        entry &&
        typeof entry === "object" &&
        "index" in entry &&
        typeof entry.index === "number"
          ? entry.index
          : null;
      if (index === null) return;
      const delta = event.destination.index - index;
      event.preventDefault();
      request(() => {
        bypass.current = true;
        window.history.go(delta);
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    navigation?.addEventListener("navigate", traverse);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      navigation?.removeEventListener("navigate", traverse);
    };
  }, [request]);

  return {
    prompt,
    request,
    stay: () => {
      pending.current = null;
      setPrompt(null);
    },
    discard: () => {
      if (current.current.busy) return;
      const action = pending.current;
      pending.current = null;
      setPrompt(null);
      action?.();
    },
  };
}
