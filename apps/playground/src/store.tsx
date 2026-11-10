/**
 * The cart: one store for the page, outside React. Components read it with `useCart()`; tools import `cart` and read
 * or change it directly, so a catalog tool needs nothing passed in. Every action returns a sentence for the agent
 * and throws a readable error on bad input. Actions read and write the latest state, so an agent's calls in quick
 * succession see each other's changes.
 */
import { useSyncExternalStore } from "react";

export interface Product {
  sku: string;
  name: string;
  price: number;
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string;
  total: number;
  promo: string | null;
  items: CartItem[];
}

export interface Totals {
  subtotal: number;
  discount: number;
  total: number;
}

/** What the cart holds right now. */
export interface CartState {
  items: CartItem[];
  orders: Order[];
  /** The promo code currently applied to the cart, if any. */
  promo: string | null;
  totals: Totals;
}

/** The only promo code that applies a discount. */
export const PROMO_CODE = "123";
const PROMO_DISCOUNT = 0.1;

export const PRODUCTS: readonly Product[] = [
  { sku: "mug-01", name: "Enamel mug", price: 18 },
  { sku: "tee-02", name: "Logo tee", price: 29 },
  { sku: "cap-03", name: "Wool cap", price: 24 },
];

export const money = (n: number): string => `$${n.toFixed(2)}`;

function totalsFor(items: CartItem[], promo: string | null): Totals {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const discount = promo === PROMO_CODE ? subtotal * PROMO_DISCOUNT : 0;
  return { subtotal, discount, total: subtotal - discount };
}

let state: CartState = { items: [], orders: [], promo: null, totals: totalsFor([], null) };
const listeners = new Set<() => void>();

function commit(next: Partial<Omit<CartState, "totals">>): CartState {
  const merged = { ...state, ...next };
  state = { ...merged, totals: totalsFor(merged.items, merged.promo) };
  for (const listener of listeners) listener();
  return state;
}

/** The cart's actions, and its state right now (`cart.state`). */
export const cart = {
  get state(): CartState {
    return state;
  },
  add(sku: string, qty: number): string {
    const product = PRODUCTS.find((p) => p.sku === sku);
    if (!product) throw new Error(`Unknown SKU "${sku}"`);
    if (!Number.isInteger(qty) || qty < 1) throw new Error(`Quantity must be a whole number ≥ 1, got ${qty}`);
    const existing = state.items.find((i) => i.sku === sku);
    commit({
      items: existing ? state.items.map((i) => (i.sku === sku ? { ...i, qty: i.qty + qty } : i)) : [...state.items, { ...product, qty }],
    });
    return `Added ${qty} × ${product.name} to the cart.`;
  },
  clear(): string {
    commit({ items: [] });
    return "Cart cleared.";
  },
  applyPromo(input: string): string {
    const code = input.trim();
    if (!code) throw new Error("Enter a promo code.");
    if (code !== PROMO_CODE) throw new Error(`Promo code "${code}" is not valid.`);
    const { items, totals } = commit({ promo: code });
    return items.length > 0
      ? `Promo ${code} applied: ${PROMO_DISCOUNT * 100}% off. New total ${money(totals.total)} (was ${money(totals.subtotal)}).`
      : `Promo ${code} applied: ${PROMO_DISCOUNT * 100}% off your order.`;
  },
  removePromo(): string {
    commit({ promo: null });
    return "Promo code removed.";
  },
  placeOrder(): string {
    const { items, promo, totals, orders } = state;
    if (items.length === 0) throw new Error("The cart is empty.");
    const order: Order = { id: `ORD-${Date.now().toString(36).toUpperCase()}`, total: totals.total, promo, items };
    // a code is used up by the order it applied to
    commit({ orders: [...orders, order], items: [], promo: null });
    return promo
      ? `Order ${order.id} placed for ${money(order.total)} with promo ${promo} (saved ${money(totals.discount)}).`
      : `Order ${order.id} placed for ${money(order.total)}.`;
  },
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = (): CartState => state;

/** The cart's state, re-rendering on every change. The actions are on `cart`. */
export function useCart(): CartState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
