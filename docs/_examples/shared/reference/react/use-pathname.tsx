import { usePathname } from "@webmcp-agents/react";

// Mark the current page in a navigation, with any router.
export function Nav() {
  const path = usePathname();

  return (
    <nav>
      <a href="/" aria-current={path === "/" ? "page" : undefined}>
        Home
      </a>
      <a
        href="/orders"
        aria-current={path === "/orders" ? "page" : undefined}
      >
        Orders
      </a>
    </nav>
  );
}
