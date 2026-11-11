import { usePathname } from "@webmcp-agents/react";
import type { MouseEvent } from "react";

/**
 * A header link without a router: a plain click pushes history (usePathname and the provider's `match` see it), a
 * modified click is left to the browser so it can open a new tab. Returns what the `<a>` needs.
 */
export function useNavLink(to: string): {
  href: string;
  current: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
} {
  const current = usePathname() === to;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (!current) history.pushState(null, "", to);
  }

  return { href: to, current, onClick };
}
