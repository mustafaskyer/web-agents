import { useEffect, useRef } from "react";

/**
 * A non-modal dialog's keyboard and focus behaviour (the cart drawer): while open, focus moves to its close button and
 * Escape closes it; on close, focus goes back where it was. Never `showModal()`: the top layer would hide the agent
 * cursor, so the page behind is made `inert` by Root instead.
 *
 * Returns the ref for the dialog's close button.
 */
export function useDialog(open: boolean, close: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [open, close]);

  return closeRef;
}
