/**
 * The cart drawer. Its content and actions come from `useCartDrawer`; its tools, update_cart_item, remove_from_cart and
 * close_cart, are turned on by `useCartDrawerTools(open)` while it is open, so they exist exactly when their controls
 * are on screen. Each line's controls are named after it ("Quantity of Ocean Tee (M)", "Remove Ocean Tee (M)"): the
 * tools' targets build that name from the call.
 *
 * Not a modal <dialog>: showModal() puts it in the top layer, above any z-index, so the agent cursor (and the
 * devtools) would vanish under it. It's a dialog-role panel instead; Root makes the page behind it `inert`, which
 * gives the same focus containment.
 */
import { Button, buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { Progress } from "@webmcp-agents/examples-ui/components/progress";
import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { ShoppingBagIcon, Trash2Icon, XIcon } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router";
import { type DrawerLine, useCartDrawer } from "../hooks/use-cart-drawer";
import { useDialog } from "../hooks/use-dialog";
import { money } from "../lib/format";
import { useCartDrawerTools } from "../webmcp-agents/hooks/use-cart-drawer-tools";
import { EmptyState } from "./empty-state";
import { ProductArt } from "./product-art";
import { QtyStepper } from "./qty-stepper";
import { Totals } from "./totals";

function Line({ line }: { line: DrawerLine }) {
  return (
    <li className="grid grid-cols-[4.5rem_1fr_auto] gap-4 py-4">
      <div>{line.art && <ProductArt art={line.art} name={line.name} size="sm" />}</div>

      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <p className="truncate text-sm font-medium">{line.name}</p>
          {line.variant && <p className="text-xs text-muted-foreground">Size {line.variant}</p>}
        </div>
        <QtyStepper size="sm" value={line.qty} max={line.max} label={`Quantity of ${line.label}`} onChange={line.setQty} />
      </div>

      <div className="flex flex-col items-end justify-between">
        <p className="text-sm tabular-nums">{money(line.total)}</p>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${line.label}`} onClick={line.remove}>
          <Trash2Icon />
        </Button>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { open: cartOpen, close, count, lines, totals, promo, freeShipping } = useCartDrawer();
  const titleId = useId();
  const closeRef = useDialog(cartOpen, close);
  useCartDrawerTools(cartOpen);

  return (
    <div className={cn("fixed inset-0 z-50", !cartOpen && "pointer-events-none")}>
      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          "absolute inset-0 bg-black/20 transition-opacity duration-200 motion-reduce:transition-none supports-backdrop-filter:backdrop-blur-[2px]",
          cartOpen ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!cartOpen}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l bg-background shadow-2xl transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:max-w-md",
          // hidden once it has slid out: out of the accessibility tree and the cursor's reach
          cartOpen ? "visible translate-x-0" : "invisible translate-x-full",
        )}
      >
        <header className="flex items-center justify-between gap-4 px-5 py-4">
          <h2 id={titleId} className="font-serif text-2xl tracking-tight">
            Your cart{" "}
            <span className="font-sans text-sm text-muted-foreground tabular-nums">
              ({count} item{count === 1 ? "" : "s"})
            </span>
          </h2>
          <Button ref={closeRef} variant="ghost" size="icon" aria-label="Close cart" onClick={close}>
            <XIcon />
          </Button>
        </header>

        <Separator />

        {lines.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            body="Everything you add shows up here."
            icon={<ShoppingBagIcon />}
            action={
              <Link to="/products" className={cn(buttonVariants({ size: "lg" }))} onClick={close}>
                Browse products
              </Link>
            }
          />
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {lines.map((line) => (
                <Line key={line.key} line={line} />
              ))}
            </ul>

            <footer className="flex flex-col gap-4 border-t bg-muted/30 px-5 py-5 max-sm:pb-24">
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  {freeShipping.unlocked ? "Free shipping unlocked" : `${money(freeShipping.remaining)} away from free shipping`}
                </p>
                <Progress aria-hidden="true" value={freeShipping.progress} />
              </div>

              <Totals totals={totals} promo={promo} />

              <Link to="/checkout" className={cn(buttonVariants({ size: "lg", className: "h-11 w-full" }))} onClick={close}>
                Checkout
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
