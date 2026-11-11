"use client";
// oxlint-disable promise/prefer-await-to-callbacks -- Browser frame callbacks are synchronous scheduling APIs.
import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";

import { useMotionPaused } from "./motion-boundary";
import { createMotionClock } from "./motion-clock";
import { useDecorativeMotion } from "./use-decorative-motion";

export const useMotionClock = (root: RefObject<HTMLElement | null>) => {
  const clock = useMemo(() => createMotionClock(), []);
  const inherited = useMotionPaused();
  const autoplay = useDecorativeMotion({ enabled: !inherited, root });
  const paused = inherited || !autoplay;
  const pauseValue = useRef(paused);
  const updateControl = useRef<(() => void) | null>(null);
  useEffect(() => {
    pauseValue.current = paused;
    updateControl.current?.();
  }, [paused]);
  useEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    clock.start();
    let visible = false;
    let contextLost = false;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const invalidate = () => {
      if (visible && !document.hidden && !contextLost) {
        clock.invalidate();
      }
    };
    const update = () => {
      clock.setActive(
        visible &&
          !document.hidden &&
          !media.matches &&
          !pauseValue.current &&
          !contextLost
      );
      invalidate();
    };
    const resize = new ResizeObserver(invalidate);
    const theme = new MutationObserver(invalidate);
    resize.observe(element);
    theme.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme"],
      attributes: true,
    });
    updateControl.current = update;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    const lost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      element.dataset.graphics = "unavailable";
      update();
    };
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    media.addEventListener("change", update);
    element.addEventListener("webglcontextlost", lost, true);
    element.addEventListener("pointermove", invalidate, { passive: true });
    element.addEventListener("input", invalidate);
    return () => {
      updateControl.current = null;
      clock.dispose();
      observer.disconnect();
      resize.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", update);
      media.removeEventListener("change", update);
      element.removeEventListener("webglcontextlost", lost, true);
      element.removeEventListener("pointermove", invalidate);
      element.removeEventListener("input", invalidate);
    };
  }, [clock, root]);
  return clock;
};
