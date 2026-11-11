"use client";
// oxlint-disable unicorn/prefer-dom-node-dataset -- Imperative host markers use DOM methods so React does not mistake dataset assignment for mutation of a hook argument.
import { useEffect } from "react";
import type { EffectCallback, RefObject } from "react";

/** Initializes an effect when its real host enters the viewport; SSR content stays intact. */
export const useVisibleEffect = (
  root: RefObject<HTMLElement | null>,
  initialize: EffectCallback,
  refreshKey?: string | number
) => {
  useEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    let cleanup: ReturnType<EffectCallback>;
    element.setAttribute(
      "data-effect-revision",
      String(refreshKey ?? "default")
    );
    element.setAttribute("data-effect-initialized", "pending");
    let initialized = false;
    let disposed = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (disposed || initialized || !entry?.isIntersecting) {
        return;
      }
      initialized = true;
      observer.disconnect();
      cleanup = initialize();
      element.setAttribute("data-effect-initialized", "ready");
    });
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [root, initialize, refreshKey]);
};
