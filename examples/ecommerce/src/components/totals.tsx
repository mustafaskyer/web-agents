import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import type { ReactNode } from "react";
import { money } from "../lib/format";
import type { Totals as TotalsData } from "../store/cart-rules";

export interface TotalsProps {
  totals: TotalsData;
  promo: string | null;
  /** Next to the promo code: checkout's "Remove". */
  promoAction?: ReactNode;
}

/** Subtotal, promo, shipping and total: the cart drawer and the checkout summary. */
export function Totals({ totals, promo, promoAction }: TotalsProps) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums">{money(totals.subtotal)}</dd>
      </div>

      {promo && (
        <div className="flex justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span>
              Promo <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">{promo}</code>
            </span>
            {promoAction}
          </dt>
          <dd className="tabular-nums">−{money(totals.discount)}</dd>
        </div>
      )}

      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="tabular-nums">{totals.shipping ? money(totals.shipping) : "Free"}</dd>
      </div>

      <Separator className="my-1" />

      <div className="flex justify-between gap-4 text-base font-medium">
        <dt>Total</dt>
        <dd className="tabular-nums">{money(totals.total)}</dd>
      </div>
    </dl>
  );
}
