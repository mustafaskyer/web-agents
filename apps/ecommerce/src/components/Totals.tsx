import type { ReactNode } from "react";
import { money } from "../data/catalog";
import type { Totals as TotalsData } from "../store/cartRules";
import styles from "./Totals.module.css";

/** Subtotal, promo, shipping and total: the cart drawer and the checkout summary. */
export function Totals({ totals, promo, promoAction }: { totals: TotalsData; promo: string | null; promoAction?: ReactNode }) {
  return (
    <dl className={styles.totals}>
      <div>
        <dt>Subtotal</dt>
        <dd className="tabular">{money(totals.subtotal)}</dd>
      </div>
      {promo && (
        <div>
          <dt>
            Promo <code>{promo}</code> {promoAction}
          </dt>
          <dd className="tabular">−{money(totals.discount)}</dd>
        </div>
      )}
      <div>
        <dt>Shipping</dt>
        <dd className="tabular">{totals.shipping ? money(totals.shipping) : "Free"}</dd>
      </div>
      <div className={styles.total}>
        <dt>Total</dt>
        <dd className="tabular">{money(totals.total)}</dd>
      </div>
    </dl>
  );
}
