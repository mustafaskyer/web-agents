"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Functional scroll threshold only; no RAF, animation clock or polling. */
export const useScrollCompact = (
  threshold: number,
  container?: RefObject<HTMLElement | null>
) => {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const element = container?.current;
    const target = element ?? window;
    const update = () => {
      const next = (element ? element.scrollTop : window.scrollY) > threshold;
      setCompact((current) => (current === next ? current : next));
    };
    target.addEventListener("scroll", update, { passive: true });
    update();
    return () => target.removeEventListener("scroll", update);
  }, [container, threshold]);
  return compact;
};

/** Observe the actual pill, including compaction/density/embedded-container changes. */
export const useMobileNavigationFit = (
  frame: RefObject<HTMLDivElement | null>,
  trigger: RefObject<HTMLButtonElement | null>,
  onHidden: () => void
) => {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    const element = frame.current;
    if (!element) {
      return;
    }
    let previous: boolean | undefined;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      const measuredScale =
        element.offsetWidth > 0 ? bounds.width / element.offsetWidth : 1;
      const scale =
        Number.isFinite(measuredScale) && measuredScale > 0 ? measuredScale : 1;
      const logicalHeight = Math.max(
        0,
        (window.innerHeight - bounds.bottom) / scale
      );
      element.style.setProperty(
        "--velora-floating-menu-available",
        `${logicalHeight}px`
      );
      const next = Boolean(trigger.current?.getClientRects().length);
      if (previous && !next) {
        onHidden();
      }
      previous = next;
      setAvailable((current) => (current === next ? current : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      element.style.removeProperty("--velora-floating-menu-available");
    };
  }, [frame, onHidden, trigger]);
  return available;
};
