"use client";

// oxlint-disable promise/prefer-await-to-callbacks -- Native events/observers and shared frame scheduling use synchronous callbacks.
import { useEffect } from "react";
import type { RefObject } from "react";

import { frameScheduler } from "../_shared/frame-scheduler";
import { useMotionPaused } from "../_shared/motion-boundary";
import { wordmarkPointer } from "./graphic";

/** One SVG-local pointer sample, never an idle spring or global pointer loop. */
export const useWordmarkSpotlight = (root: RefObject<SVGSVGElement | null>) => {
  const paused = useMotionPaused();
  useEffect(() => {
    const svg = root.current;
    const spot = svg?.querySelector<SVGRadialGradientElement>(
      "[data-wordmark-spot]"
    );
    if (!(svg && spot) || paused) {
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    let visible = false;
    let enabled = false;
    let point: { x: number; y: number } | null = null;
    let frame: number | undefined;
    const reset = () => {
      if (frame !== undefined) {
        frameScheduler.cancel(frame);
        frame = undefined;
      }
      point = null;
      spot.cx.baseVal.valueAsString = "50%";
      spot.cy.baseVal.valueAsString = "50%";
      svg.style.removeProperty("--velora-wordmark-reveal");
    };
    const update = () => {
      enabled = visible && !document.hidden && !reduced.matches && fine.matches;
      if (!enabled) {
        reset();
      }
    };
    const paint = () => {
      frame = undefined;
      if (!enabled || !point || !svg.isConnected || root.current !== svg) {
        reset();
        return;
      }
      const position = wordmarkPointer(
        svg.getBoundingClientRect(),
        point.x,
        point.y
      );
      if (!position) {
        reset();
        return;
      }
      spot.cx.baseVal.valueAsString = `${position.x}%`;
      spot.cy.baseVal.valueAsString = `${position.y}%`;
      svg.style.setProperty("--velora-wordmark-reveal", "1");
    };
    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        reset();
        return;
      }
      if (!enabled || !svg.isConnected || root.current !== svg) {
        return;
      }
      point = { x: event.clientX, y: event.clientY };
      if (frame === undefined) {
        frame = frameScheduler.request(paint);
      }
    };
    const handleDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        reset();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    observer.observe(svg);
    svg.addEventListener("pointermove", handleMove, { passive: true });
    svg.addEventListener("pointerdown", handleDown, { passive: true });
    svg.addEventListener("pointerleave", reset);
    svg.addEventListener("pointercancel", reset);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    fine.addEventListener("change", update);
    update();
    return () => {
      reset();
      observer.disconnect();
      svg.removeEventListener("pointermove", handleMove);
      svg.removeEventListener("pointerdown", handleDown);
      svg.removeEventListener("pointerleave", reset);
      svg.removeEventListener("pointercancel", reset);
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      fine.removeEventListener("change", update);
    };
  }, [paused, root]);
};
