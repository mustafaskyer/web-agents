import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { Button, buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { ShoppingBagIcon, UserIcon } from "lucide-react";
import { Link, NavLink } from "react-router";
import { useHeader } from "../hooks/use-header";
import { SearchBox } from "./search-box";

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
    isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
  );

/**
 * The bar on every page: the logo (go_to_page home clicks it), the shop's links (browse_category clicks a category's),
 * the search (search_products types into it) and the cart button (open_cart presses it, by its name "Cart, 2 items").
 */
export function Header() {
  const { categories, count, cartLabel, openCart } = useHeader();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:grid-cols-[auto_1fr_auto_auto] lg:gap-x-8">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl tracking-tight">
          <span className="size-3.5 rounded-[3px] bg-foreground" aria-hidden="true" />
          Field Store
        </Link>

        <nav
          aria-label="Shop"
          className="col-span-full row-start-2 -mx-4 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-6 sm:px-5 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:px-0"
        >
          <NavLink to="/products" end className={navLink}>
            All products
          </NavLink>
          {categories.map((c) => (
            <NavLink key={c.slug} to={`/category/${c.slug}`} className={navLink}>
              {c.name}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0 justify-self-end max-lg:w-full max-lg:max-w-xs lg:col-start-3">
          <SearchBox />
        </div>

        <div className="flex items-center gap-1 lg:col-start-4">
          <a
            href="#account"
            aria-label="Account (demo)"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "max-sm:hidden")}
          >
            <UserIcon />
          </a>

          <Button variant="ghost" size="icon-lg" className="relative" aria-label={cartLabel} onClick={openCart}>
            <ShoppingBagIcon />
            {count > 0 && (
              <Badge aria-hidden="true" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] tabular-nums">
                {count}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
