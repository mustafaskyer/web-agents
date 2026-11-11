import { useEffect } from "react";

/** `London → Dubai · Skyline` in the tab. */
export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Skyline` : "Skyline · web-agents demo";
  }, [title]);
}
