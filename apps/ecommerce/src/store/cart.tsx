/**
 * The cart: lines, promo code and placed orders, persisted to sessionStorage so
 * a reload keeps a demo going. Every action returns a sentence for the agent
 * and throws a readable error on bad input (see cartRules.ts).
 *
 * Actions read and write a ref, not the render's state: two calls in the same
 * tick (an agent, then the person) must both see each other's changes.
 */
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getProduct, money } from "../data/catalog";
import {
  addLine,
  type CartLine,
  describeLines,
  findLine,
  lineLabel,
  PROMO_CODE,
  PROMO_RATE,
  resolveVariant,
  sameLine,
  type Totals,
  totalsFor,
} from "./cartRules";

export interface Contact {
  email: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  note?: string;
}

export interface Order {
  id: string;
  lines: CartLine[];
  totals: Totals;
  promo: string | null;
  contact: Contact;
  placedAt: number;
}

export interface CartApi {
  lines: readonly CartLine[];
  promo: string | null;
  totals: Totals;
  /** Items, not lines: 2 × tee + 1 × mug = 3. */
  count: number;
  orders: readonly Order[];
  add(slug: string, qty: number, variant?: string | null): string;
  /** Qty 0 removes the line. */
  setQty(slug: string, variant: string | null | undefined, qty: number): string;
  remove(slug: string, variant?: string | null): string;
  applyPromo(code: string): string;
  removePromo(): string;
  /** Throws on an empty cart. */
  placeOrder(contact: Contact): Order;
  /** Human summary for get_cart. */
  describe(): string;
}

interface CartState {
  lines: CartLine[];
  promo: string | null;
  orders: Order[];
}

const STORAGE_KEY = "field-store:cart";
const EMPTY: CartState = { lines: [], promo: null, orders: [] };

function load(): CartState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as CartState | null;
    return saved && Array.isArray(saved.lines) ? { ...EMPTY, ...saved } : EMPTY;
  } catch {
    return EMPTY;
  }
}

const orderId = (): string => `FS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/** Stable across renders: they read and write the ref. */
type Actions = Pick<CartApi, "add" | "setQty" | "remove" | "applyPromo" | "removePromo" | "placeOrder" | "describe">;

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  const latest = useRef(state);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const actions = useMemo<Actions>(() => {
    const commit = (next: Partial<CartState>): CartState => {
      latest.current = { ...latest.current, ...next };
      setState(latest.current);
      return latest.current;
    };
    const remove = (slug: string, variant?: string | null): string => {
      const line = findLine(latest.current.lines, slug, variant);
      const { lines } = commit({ lines: latest.current.lines.filter((l) => !sameLine(l, line.slug, line.variant)) });
      if (lines.length === 0) return `Removed ${lineLabel(line)}. The cart is empty.`;
      return `Removed ${lineLabel(line)}. ${lines.length} line${lines.length === 1 ? "" : "s"} left.`;
    };
    return {
      add(slug, qty, variant) {
        const product = getProduct(slug);
        const option = resolveVariant(product, variant);
        const { lines, promo } = commit({ lines: addLine(latest.current.lines, product, option, qty) });
        const count = lines.reduce((n, l) => n + l.qty, 0);
        return `Added ${qty} × ${lineLabel({ name: product.name, variant: option })} to the cart. The cart has ${count} item${count === 1 ? "" : "s"}, total ${money(totalsFor(lines, promo).total)}.`;
      },
      setQty(slug, variant, qty) {
        const line = findLine(latest.current.lines, slug, variant);
        if (qty === 0) return remove(slug, line.variant);
        const product = getProduct(slug);
        // Re-add from zero, so the stock check covers the new quantity.
        const updated = addLine([], product, line.variant, qty)[0]!;
        const { lines, promo } = commit({ lines: latest.current.lines.map((l) => (l === line ? updated : l)) });
        return `${lineLabel(line)} quantity is now ${qty}. Cart total ${money(totalsFor(lines, promo).total)}.`;
      },
      remove,
      applyPromo(input) {
        const code = input.trim().toUpperCase();
        if (!code) throw new Error("Enter a promo code.");
        if (code !== PROMO_CODE) throw new Error(`Promo code "${input.trim()}" is not valid.`);
        const { lines } = commit({ promo: code });
        const after = totalsFor(lines, code);
        return lines.length
          ? `Promo ${code} applied: ${PROMO_RATE * 100}% off. New total ${money(after.total)} (saved ${money(after.discount)}).`
          : `Promo ${code} applied: ${PROMO_RATE * 100}% off your order.`;
      },
      removePromo() {
        commit({ promo: null });
        return "Promo code removed.";
      },
      placeOrder(contact) {
        const { lines, promo, orders } = latest.current;
        if (lines.length === 0) throw new Error("The cart is empty. Add something before checking out.");
        const order: Order = { id: orderId(), lines, totals: totalsFor(lines, promo), promo, contact, placedAt: Date.now() };
        const next = commit({ lines: [], promo: null, orders: [...orders, order] });
        // Now, not in the effect: the order page may read storage before the effect runs.
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return order;
      },
      describe: () => describeLines(latest.current.lines, latest.current.promo),
    };
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      ...actions,
      lines: state.lines,
      promo: state.promo,
      totals: totalsFor(state.lines, state.promo),
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      orders: state.orders,
    }),
    [state, actions],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  return cart;
}
