/** The header: the store's name and the two pages. Links push history; the provider follows the URL by itself. */
import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import type { ReactNode } from "react";
import { useNavLink } from "../hooks/use-nav-link";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const { href, current, onClick } = useNavLink(to);

  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={buttonVariants({ variant: current ? "secondary" : "ghost" })}
    >
      {children}
    </a>
  );
}

export function SiteNav() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-semibold">Playground</span>
        <nav aria-label="Sections" className="flex gap-1">
          <NavLink to="/">Shop</NavLink>
          <NavLink to="/orders">Orders</NavLink>
        </nav>
      </div>
    </header>
  );
}
