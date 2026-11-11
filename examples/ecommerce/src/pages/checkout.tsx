import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@webmcp-agents/examples-ui/components/card";
import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import { ShoppingBagIcon } from "lucide-react";
import { Link } from "react-router";
import { ApplyPromoForm } from "../components/apply-promo-form";
import { CheckoutForm } from "../components/checkout-form";
import { EmptyState } from "../components/empty-state";
import { ProductArt } from "../components/product-art";
import { Totals } from "../components/totals";
import { useCheckoutPage } from "../hooks/use-checkout-page";
import { money } from "../lib/format";

export function Checkout() {
  const { lines, totals, promo, placed, onPlaced, removePromo } = useCheckoutPage();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="sr-only">Checkout</h1>
        <EmptyState
          title="Your cart is empty"
          body="Add something first, then come back to check out."
          icon={<ShoppingBagIcon />}
          action={
            <Link to="/products" className={cn(buttonVariants())}>
              Browse products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-10 font-serif text-4xl tracking-tight sm:text-5xl">Checkout</h1>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
        <CheckoutForm total={totals.total} onPlaced={onPlaced} />

        <aside aria-labelledby="summary-title" className="lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 id="summary-title" className="font-serif text-2xl font-normal tracking-tight">
                  Order summary
                </h2>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              <ul className="flex flex-col gap-4">
                {lines.map((line) => (
                  <li key={line.key} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
                    <div className="relative">
                      {line.art && <ProductArt art={line.art} name={line.name} size="sm" />}
                      <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-[11px] text-background tabular-nums">
                        {line.qty}
                      </span>
                    </div>
                    <p>{line.label}</p>
                    <p className="tabular-nums">{money(line.total)}</p>
                  </li>
                ))}
              </ul>

              <Separator />

              {!placed && <ApplyPromoForm />}

              <Totals
                totals={totals}
                promo={promo}
                promoAction={
                  !placed && (
                    <button
                      type="button"
                      className="text-xs underline underline-offset-4 hover:text-foreground"
                      onClick={removePromo}
                      aria-label={`Remove promo ${promo}`}
                    >
                      Remove
                    </button>
                  )
                }
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
