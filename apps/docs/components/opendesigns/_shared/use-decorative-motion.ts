"use client";
// oxlint-disable promise/prefer-await-to-callbacks -- Browser observers and timers use callback contracts.
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export const DECORATIVE_MOTION_LIMIT_MS = 5000;
export interface AutoplayScheduler {
  now: () => number;
  schedule: (callback: () => void, milliseconds: number) => number;
  cancel: (id: number) => void;
}
/** A finite visible-time budget; suspending never resets or extends its allowance. */
export const createAutoplayBudget = (
  scheduler: AutoplayScheduler,
  settle: () => void,
  durationMs = DECORATIVE_MOTION_LIMIT_MS
) => {
  let remaining = Math.max(0, Math.min(durationMs, DECORATIVE_MOTION_LIMIT_MS));
  let started: number | undefined;
  let timer: number | undefined;
  let disposed = false;
  let finished = false;
  const suspend = () => {
    if (started !== undefined) {
      remaining = Math.max(0, remaining - (scheduler.now() - started));
      started = undefined;
    }
    if (timer !== undefined) {
      scheduler.cancel(timer);
      timer = undefined;
    }
  };
  return {
    dispose() {
      suspend();
      disposed = true;
    },
    setActive(active: boolean) {
      if (disposed || finished) {
        return;
      }
      if (!active) {
        suspend();
        return;
      }
      if (started !== undefined) {
        return;
      }
      if (remaining <= 0) {
        finished = true;
        settle();
        return;
      }
      started = scheduler.now();
      timer = scheduler.schedule(() => {
        timer = undefined;
        started = undefined;
        remaining = 0;
        finished = true;
        settle();
      }, remaining);
    },
  };
};

/** Decorative autoplay starts automatically, then rests. Functional interaction is independent. */
export const useDecorativeMotion = ({
  enabled = true,
  root,
  durationMs = DECORATIVE_MOTION_LIMIT_MS,
}: {
  enabled?: boolean;
  root?: RefObject<HTMLElement | null>;
  durationMs?: number;
} = {}) => {
  const [active, setActive] = useState(enabled);
  const [settled, setSettled] = useState(false);
  const enabledRef = useRef(enabled);
  const control = useRef<(() => void) | null>(null);
  useEffect(() => {
    enabledRef.current = enabled;
    control.current?.();
  }, [enabled]);
  useEffect(() => {
    let visible = !root;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const budget = createAutoplayBudget(
      {
        cancel: (id) => window.clearTimeout(id),
        now: () => performance.now(),
        schedule: (callback, milliseconds) =>
          window.setTimeout(callback, milliseconds),
      },
      () => {
        setSettled(true);
        setActive(false);
      },
      durationMs
    );
    const update = () => {
      const running =
        enabledRef.current && visible && !document.hidden && !media.matches;
      setActive(running);
      budget.setActive(running);
    };
    control.current = update;
    const observer = root?.current
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? false;
          update();
        })
      : undefined;
    if (root?.current) {
      observer?.observe(root.current);
    }
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      control.current = null;
      budget.dispose();
      observer?.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [durationMs, root]);
  return enabled && active && !settled;
};
