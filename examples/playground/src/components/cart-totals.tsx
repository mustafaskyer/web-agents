/** The cart's subtotal, applied promo (with its Remove button) and total. */
import type { Totals } from "../hooks/use-cart";
import { money } from "../lib/money";
import { RemovePromoButton } from "./remove-promo-button";

export function CartTotals({ promo, totals }: { promo: string | null; totals: Totals }) {
  return (
    <dl className="grid gap-1 text-sm tabular-nums">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{money(totals.subtotal)}</dd>
      </div>

      {promo && (
        <div className="flex items-baseline justify-between text-emerald-700 dark:text-emerald-400">
          <dt className="flex items-baseline gap-2">
            Promo <code className="rounded bg-emerald-500/10 px-1">{promo}</code>
            <RemovePromoButton code={promo} />
          </dt>
          <dd>−{money(totals.discount)}</dd>
        </div>
      )}

      <div className="flex justify-between text-base font-semibold">
        <dt>Total</dt>
        <dd>{money(totals.total)}</dd>
      </div>
    </dl>
  );
}
