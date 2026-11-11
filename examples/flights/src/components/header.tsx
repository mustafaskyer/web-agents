import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { PlaneTakeoffIcon, TicketIcon } from "lucide-react";
import { Link, NavLink } from "react-router";
import { Page } from "./page";

const navLink = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Page className="flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
            <PlaneTakeoffIcon className="size-4.5" />
          </span>
          Skyline
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={({ isActive }) => cn(navLink, isActive && "text-foreground")}>
            Home
          </NavLink>
          <a href="/#routes" className={navLink}>
            Deals
          </a>
          <a href="/#why" className={navLink}>
            Support
          </a>
        </nav>

        <Link to="/bookings" className={cn(buttonVariants({ variant: "outline" }), "ml-auto")}>
          <TicketIcon />
          My bookings
        </Link>
      </Page>
    </header>
  );
}
