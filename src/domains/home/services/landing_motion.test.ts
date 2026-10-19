import { observeLandingReveals } from "./landing_motion";

describe("progressive landing scroll motion", () => {
  let notify: IntersectionObserverCallback | undefined;
  let root: HTMLDivElement;
  const observe = jest.fn();
  const unobserve = jest.fn();
  const disconnect = jest.fn();
  const observer: IntersectionObserver = {
    root: null,
    rootMargin: "0px",
    thresholds: [0],
    observe,
    unobserve,
    disconnect,
    takeRecords: () => [],
  };
  const animate = jest.fn(() => ({ cancel: jest.fn(), onfinish: null }));
  const preference = {
    matches: false,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
  const originalObserver = window.IntersectionObserver;
  const originalAnimate = Element.prototype.animate;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.clearAllMocks();
    preference.matches = false;
    window.IntersectionObserver = class implements IntersectionObserver {
      root = null;
      rootMargin = "0px";
      thresholds = [0];
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
      takeRecords = () => [];
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
    };
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    window.matchMedia = jest.fn(() => preference);
    root = document.createElement("div");
    root.innerHTML =
      '<section id="story"><div data-reveal="image"><a href="#story">Story</a></div><p data-reveal="row" data-reveal-delay="500">Copy</p></section>';
    document.body.append(root);
  });
  afterEach(() => {
    root.remove();
    window.IntersectionObserver = originalObserver;
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: originalAnimate,
    });
    window.matchMedia = originalMatchMedia;
    window.history.replaceState(null, "", "/");
  });

  function enter(element: Element, isIntersecting = true): void {
    notify?.(
      [
        {
          target: element,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: 0,
        },
      ],
      observer,
    );
  }

  it("keeps SSR content visible and animates an entering block only once", () => {
    const cleanup = observeLandingReveals(root);
    const image = root.querySelector("div");
    expect(root.innerHTML).not.toMatch(/opacity|visibility|hidden/);
    expect(observe).toHaveBeenCalledTimes(2);
    if (!image) throw new Error("Missing fixture");
    enter(image, false);
    expect(animate).not.toHaveBeenCalled();
    enter(image);
    expect(animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 650, fill: "backwards" }),
    );
    expect(image.dataset.revealState).toBe("running");
    enter(image);
    expect(animate).toHaveBeenCalledTimes(1);
    cleanup();
    expect(disconnect).toHaveBeenCalled();
    expect(animate.mock.results[0].value.cancel).toHaveBeenCalled();
  });

  it("caps row staggering and cancels motion when focus enters", () => {
    const cleanup = observeLandingReveals(root);
    const row = root.querySelector("p");
    const image = root.querySelector("div");
    if (!row || !image) throw new Error("Missing fixture");
    enter(row);
    expect(animate).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 420, delay: 210 }),
    );
    enter(image);
    root.querySelector("a")?.focus();
    expect(image.dataset.revealState).toBe("complete");
    expect(animate.mock.results[1].value.cancel).toHaveBeenCalled();
    cleanup();
  });

  it("does not animate reduced-motion visitors", () => {
    preference.matches = true;
    const cleanup = observeLandingReveals(root);
    expect(observe).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    cleanup();
  });

  it("finishes active and pending blocks if reduced motion is enabled later", () => {
    const cleanup = observeLandingReveals(root);
    const image = root.querySelector("div");
    if (!image) throw new Error("Missing fixture");
    enter(image);
    preference.matches = true;
    const listener = preference.addEventListener.mock.calls[0]?.[1];
    if (typeof listener === "function") listener();
    expect(animate.mock.results[0].value.cancel).toHaveBeenCalled();
    expect(root.querySelector("p")?.dataset.revealState).toBe("complete");
    cleanup();
    expect(preference.removeEventListener).toHaveBeenCalled();
  });

  it("bypasses motion for a directly linked section", () => {
    window.history.replaceState(null, "", "/#story");
    const cleanup = observeLandingReveals(root);
    expect(observe).not.toHaveBeenCalled();
    expect(root.querySelector("div")?.dataset.revealState).toBe("complete");
    cleanup();
  });

  it("leaves a readable fallback without Web Animations", () => {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: undefined,
    });
    const cleanup = observeLandingReveals(root);
    expect(observe).not.toHaveBeenCalled();
    expect(root.textContent).toContain("Copy");
    cleanup();
  });
});
