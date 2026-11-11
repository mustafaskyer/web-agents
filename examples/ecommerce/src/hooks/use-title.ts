import { useEffect } from "react";

/** `Ocean Tee · Field Store` in the tab; an empty title is the home page's. */
export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Field Store` : "Field Store · web-agents demo";
  }, [title]);
}
