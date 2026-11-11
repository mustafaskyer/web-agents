/** The cart beside every page: items, totals, and the cart's tools (promo, clear, place order). */
import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@webmcp-agents/examples-ui/components/card";
import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import { useCart } from "../hooks/use-cart";
import { money } from "../lib/money";
import { ApplyPromoForm } from "./apply-promo-form";
import { CartTotals } from "./cart-totals";
import { ClearCartButton } from "./clear-cart-button";
import { PlaceOrderButton } from "./place-order-button";

export function CartPanel() {
  const { items, promo, totals, count, isEmpty, showTotals, lastOrder } = useCart();

  return (
    <aside aria-label="Cart" className="lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Cart <Badge variant="secondary">{count}</Badge>
          </CardTitle>
          <CardAction>
            <ClearCartButton />
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">Empty.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {items.map((i) => (
                <li key={i.sku} className="flex justify-between gap-2">
                  <span>
                    {i.qty} × {i.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{money(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
          )}

          {showTotals && <CartTotals promo={promo} totals={totals} />}
          <Separator />
          <ApplyPromoForm />
          <PlaceOrderButton />
        </CardContent>

        {lastOrder && (
          <CardFooter className="text-sm text-muted-foreground">
            Last order: {lastOrder.id} · {money(lastOrder.total)}
            {lastOrder.promo ? ` (promo ${lastOrder.promo})` : ""}
          </CardFooter>
        )}
      </Card>
    </aside>
  );
}
