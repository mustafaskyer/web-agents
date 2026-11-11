import { useEffect, useRef, useState } from "react";

/**
 * A non-modal bottom sheet's behaviour (a portal, never `showModal()`: the top layer would hide the agent cursor).
 * While open: focus moves to its close button, Escape closes it, the page behind it is `inert`; on close, focus goes
 * back where it was.
 *
 * Returns `open`, `show`, `hide` and `closeRef` for the sheet's close button.
 */
export function useSheet() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const page = document.getElementById("root");
    page?.setAttribute("inert", "");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      page?.removeAttribute("inert");
      previous?.focus();
    };
  }, [open]);

  return { open, show: () => setOpen(true), hide: () => setOpen(false), closeRef };
}
