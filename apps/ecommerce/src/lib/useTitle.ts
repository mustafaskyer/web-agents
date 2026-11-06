import { useEffect } from "react";

/** `Ocean Tee · Field Store` in the tab. */
export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Field Store` : "Field Store · web-agents demo";
  }, [title]);
}
