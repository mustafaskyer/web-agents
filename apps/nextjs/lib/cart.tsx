"use client";
/**
 * The cart, as a client-side store persisted to sessionStorage. Every action returns a sentence for the agent and
 * throws a readable error on bad input. Actions read and write a ref, not the render's state: two calls in the same
 * tick (an agent, then the person) must both see each other's changes.
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getProduct, money, type Product } from "./catalog";

export interface CartLine {
  slug: string;
  variant: string | null;
  qty: number;
  name: string;
  /** Cents. */
  unitPrice: number;
}
export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}
export interface Contact {
  email: string;
  name: string;
  address: string;
}
export interface Order {
  id: string;
  lines: CartLine[];
  totals: Totals;
  promo: string | null;
  contact: Contact;
}

export const PROMO_CODE = "WELCOME10";
const PROMO_RATE = 0.1;
const FREE_SHIPPING_FROM = 10_000;
const SHIPPING = 800;
export const MAX_QTY = 20;
const KEY = "field-store-next:cart";

export function totalsFor(lines: readonly CartLine[], promo: string | null): Totals {
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const discount = promo === PROMO_CODE ? Math.round(subtotal * PROMO_RATE) : 0;
  const shipping = lines.length === 0 || subtotal - discount >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

export const lineLabel = (l: Pick<CartLine, "name" | "variant">): string => (l.variant ? `${l.name} (${l.variant})` : l.name);

function resolveVariant(product: Product, variant: string | null | undefined): string | null {
  const axis = product.variants;
  const wanted = variant?.trim();
  if (!axis) {
    if (wanted) throw new Error(`${product.name} has no options; leave the variant out.`);
    return null;
  }
  if (!wanted) throw new Error(`Choose a ${axis.name} for ${product.name}: ${axis.options.join(", ")}.`);
  const match = axis.options.find((o) => o.toLowerCase() === wanted.toLowerCase());
  if (!match) throw new Error(`"${wanted}" isn't a ${axis.name} of ${product.name}. Choose ${axis.options.join(" or ")}.`);
  return match;
}

export function describeLines(lines: readonly CartLine[], promo: string | null): string {
  if (lines.length === 0) return promo ? `The cart is empty. Promo ${promo} is applied.` : "The cart is empty.";
  const t = totalsFor(lines, promo);
  const rows = lines.map(
    (l) => `- ${l.qty} × ${lineLabel(l)} [slug ${l.slug}${l.variant ? `, variant ${l.variant}` : ""}]: ${money(l.unitPrice * l.qty)}`,
  );
  if (promo) rows.push(`Promo ${promo}: −${money(t.discount)}`);
  rows.push(`Shipping: ${t.shipping ? money(t.shipping) : "free"}`);
  rows.push(`Total: ${money(t.total)}`);
  return rows.join("\n");
}

export interface CartApi {
  lines: readonly CartLine[];
  promo: string | null;
  totals: Totals;
  count: number;
  orders: readonly Order[];
  add(slug: string, qty: number, variant?: string | null): string;
  remove(slug: string): string;
  applyPromo(code: string): string;
  placeOrder(contact: Contact): Order;
  describe(): string;
}

interface State {
  lines: CartLine[];
  promo: string | null;
  orders: Order[];
}
const EMPTY: State = { lines: [], promo: null, orders: [] };

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const ref = useRef(state);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        const parsed = { ...EMPTY, ...(JSON.parse(saved) as Partial<State>) };
        ref.current = parsed;
        setState(parsed);
      }
    } catch {
      // fresh cart
    }
  }, []);
  const commit = useCallback((next: State): void => {
    ref.current = next;
    setState(next);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage blocked: the cart lives in memory
    }
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      lines: state.lines,
      promo: state.promo,
      totals: totalsFor(state.lines, state.promo),
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      orders: state.orders,
      add(slug, qty, variant) {
        const product = getProduct(slug);
        const chosen = resolveVariant(product, variant);
        const { lines } = ref.current;
        const existing = lines.find((l) => l.slug === slug && l.variant === chosen);
        const max = Math.min(product.stock, MAX_QTY) - (existing?.qty ?? 0);
        if (product.stock === 0) throw new Error(`${product.name} is sold out.`);
        if (!Number.isInteger(qty) || qty < 1 || qty > max)
          throw new Error(`Quantity must be a whole number from 1 to ${max}, got ${qty}.`);
        const next = existing
          ? lines.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l))
          : [...lines, { slug, variant: chosen, qty, name: product.name, unitPrice: product.price }];
        commit({ ...ref.current, lines: next });
        const line = next.find((l) => l.slug === slug && l.variant === chosen)!;
        return `Added ${qty} × ${lineLabel(line)} to the cart (now ${line.qty}). ${describeLines(next, ref.current.promo)}`;
      },
      remove(slug) {
        const { lines } = ref.current;
        if (!lines.some((l) => l.slug === slug)) throw new Error(`"${slug}" isn't in the cart.`);
        const next = lines.filter((l) => l.slug !== slug);
        commit({ ...ref.current, lines: next });
        return `Removed ${slug}. ${describeLines(next, ref.current.promo)}`;
      },
      applyPromo(code) {
        const trimmed = code.trim().toUpperCase();
        if (trimmed !== PROMO_CODE) throw new Error(`"${code}" isn't a valid promo code.`);
        commit({ ...ref.current, promo: trimmed });
        return `Applied ${trimmed}: 10% off. ${describeLines(ref.current.lines, trimmed)}`;
      },
      placeOrder(contact) {
        const { lines, promo, orders } = ref.current;
        if (lines.length === 0) throw new Error("The cart is empty.");
        const order: Order = {
          id: `FS-${(1000 + orders.length).toString(36).toUpperCase()}`,
          lines,
          totals: totalsFor(lines, promo),
          promo,
          contact,
        };
        commit({ lines: [], promo: null, orders: [...orders, order] });
        return order;
      },
      describe: () => describeLines(ref.current.lines, ref.current.promo),
    }),
    [state, commit],
  );
  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  return cart;
}
