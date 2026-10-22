import { getLandingSceneMotion } from "./landing_scene_motion";

export function observeLandingReveals(root: HTMLElement): () => void {
  if (
    typeof window === "undefined" ||
    typeof IntersectionObserver === "undefined" ||
    typeof Element.prototype.animate !== "function"
  ) {
    return () => {};
  }

  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches) return () => {};

  const pending = new Set(root.querySelectorAll<HTMLElement>("[data-reveal]"));
  const active = new Map<Element, Animation>();
  const finish = (element: HTMLElement) => {
    observer.unobserve(element);
    pending.delete(element);
    active.get(element)?.cancel();
    active.delete(element);
    for (const [child, animation] of active) {
      if (element.contains(child)) {
        animation.cancel();
        active.delete(child);
      }
    }
    element.dataset.revealState = "complete";
    const scene = element.closest<HTMLElement>('[data-reveal="scene"]');
    if (scene && ![...active.keys()].some((child) => scene.contains(child))) {
      scene.dataset.revealState = "complete";
    }
  };
  const finishTarget = () => {
    const target = root.querySelector(":target");
    if (!target) return;
    const section = target.closest("section");
    for (const element of [...pending, ...active.keys()]) {
      if (element instanceof HTMLElement && section?.contains(element)) {
        finish(element);
      }
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const element = entry.target;
        if (
          !entry.isIntersecting ||
          !(element instanceof HTMLElement) ||
          !pending.has(element)
        )
          continue;

        observer.unobserve(element);
        pending.delete(element);
        if (element.dataset.reveal === "scene") {
          element.dataset.revealState = "running";
          for (const part of element.querySelectorAll<HTMLElement>(
            "[data-scene-part]",
          )) {
            const motion = getLandingSceneMotion(part.dataset.scenePart);
            if (!motion) continue;
            const animation = part.animate([motion.from, motion.to], {
              duration: motion.duration,
              delay: motion.delay,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "backwards",
            });
            active.set(part, animation);
            animation.onfinish = () => {
              active.delete(part);
              if (
                ![...active.keys()].some((child) => element.contains(child))
              ) {
                element.dataset.revealState = "complete";
              }
            };
          }
          continue;
        }
        const image = element.dataset.reveal === "image";
        const row = element.dataset.reveal === "row";
        const delay = Math.min(
          210,
          Math.max(0, Number(element.dataset.revealDelay) || 0),
        );
        element.dataset.revealState = "running";
        const animation = element.animate(
          [
            {
              opacity: 0.35,
              transform: image
                ? "translateY(20px) scale(0.985)"
                : `translateY(${row ? 12 : 24}px)`,
            },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: image ? 650 : row ? 420 : 520,
            delay,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "backwards",
          },
        );
        active.set(element, animation);
        animation.onfinish = () => {
          active.delete(element);
          element.dataset.revealState = "complete";
        };
      }
    },
    { threshold: 0, rootMargin: "0px 0px -40px 0px" },
  );

  const finishAll = () => {
    for (const element of [...pending, ...active.keys()]) {
      if (element instanceof HTMLElement) finish(element);
    }
  };
  const handlePreference = () => {
    if (preference.matches) finishAll();
  };
  const handleFocus = (event: FocusEvent) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest<HTMLElement>("[data-reveal]");
    if (element) finish(element);
  };

  finishTarget();
  for (const element of pending) observer.observe(element);
  preference.addEventListener("change", handlePreference);
  window.addEventListener("hashchange", finishTarget);
  root.addEventListener("focusin", handleFocus);

  return () => {
    observer.disconnect();
    for (const animation of active.values()) animation.cancel();
    preference.removeEventListener("change", handlePreference);
    window.removeEventListener("hashchange", finishTarget);
    root.removeEventListener("focusin", handleFocus);
  };
}
