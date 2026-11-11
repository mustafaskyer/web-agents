import { usePathname } from "@webmcp-agents/react";

/** The playground's two pages. */
export type Page = "shop" | "orders";

/**
 * Which page the URL shows. The playground has no router: the path is read from history (`usePathname`, the same
 * signal the provider follows for `match`), so a nav link's `pushState` switches the page and list_orders together.
 */
export function usePage(): { page: Page } {
  const path = usePathname();
  return { page: path === "/orders" ? "orders" : "shop" };
}
