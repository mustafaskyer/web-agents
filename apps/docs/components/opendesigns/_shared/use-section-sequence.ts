"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { useMotionPaused } from "./motion-boundary";
import { createSectionSequence } from "./section-sequence";

/** Keep one lifetime budget while updated consumer props repaint the current or final state. */
export const useSectionSequence = (
  root: RefObject<HTMLElement | null>,
  paint: (elapsedMs: number) => void,
  durationMs = 4600
) => {
  const paused = useMotionPaused();
  const pausedRef = useRef(paused);
  const paintRef = useRef(paint);
  const control = useRef<{ repaint: () => void; update: () => void } | null>(
    null
  );
  useEffect(() => {
    paintRef.current = paint;
    control.current?.repaint();
  }, [paint]);
  useEffect(() => {
    pausedRef.current = paused;
    control.current?.update();
  }, [paused]);
  useEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    let visible = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const sequence = createSectionSequence(
      (time) => paintRef.current(time),
      durationMs
    );
    const update = () => {
      if (reduced.matches) {
        sequence.finish();
      }
      sequence.setActive(
        visible && !document.hidden && !reduced.matches && !pausedRef.current
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    control.current = { repaint: sequence.repaint, update };
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    update();
    return () => {
      control.current = null;
      sequence.dispose();
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
    };
  }, [durationMs, root]);
};
