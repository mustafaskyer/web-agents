import { useEffect, useState } from "react";
import { CopyIcon } from "./icons";

const CONFIRM_MS = 1500;

/** Copies `text` (a function: built only on click); says "Copied" (politely, to screen readers too) for 1.5 s. */
export function CopyButton({
  text,
  label,
  children,
  className,
}: {
  text: () => string;
  label: string;
  children?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [state]);
  const said = state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "";
  return (
    <button
      type="button"
      className={`btn ${children ? "" : "icon ghost"} ${className ?? ""}`}
      aria-label={children ? undefined : label}
      title={children ? undefined : label}
      onClick={() =>
        // Needs a secure context and a user gesture; both hold for a click on localhost/https.
        navigator.clipboard?.writeText(text()).then(
          () => setState("copied"),
          () => setState("failed"),
        ) ?? setState("failed")
      }
    >
      <CopyIcon />
      {children && <span>{state === "idle" ? children : said}</span>}
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </button>
  );
}
