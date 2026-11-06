import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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

export interface CartApi {
  items: CartItem[];
  orders: Order[];
  /** The promo code currently applied to the cart, if any. */
  promo: string | null;
  totals: Totals;
  /** Each action returns a human-readable result for the agent and throws on bad input. */
  add(sku: string, qty: number): string;
  clear(): string;
  applyPromo(code: string): string;
  removePromo(): string;
  placeOrder(): string;
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

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promo, setPromo] = useState<string | null>(null);

  const api = useMemo<CartApi>(() => {
    const totals = totalsFor(items, promo);
    return {
      items,
      orders,
      promo,
      totals,
      add(sku, qty) {
        const product = PRODUCTS.find((p) => p.sku === sku);
        if (!product) throw new Error(`Unknown SKU "${sku}"`);
        if (!Number.isInteger(qty) || qty < 1) throw new Error(`Quantity must be a whole number ≥ 1, got ${qty}`);
        setItems((prev) => {
          const existing = prev.find((i) => i.sku === sku);
          return existing ? prev.map((i) => (i.sku === sku ? { ...i, qty: i.qty + qty } : i)) : [...prev, { ...product, qty }];
        });
        return `Added ${qty} × ${product.name} to the cart.`;
      },
      clear() {
        setItems([]);
        return "Cart cleared.";
      },
      applyPromo(input) {
        const code = input.trim();
        if (!code) throw new Error("Enter a promo code.");
        if (code !== PROMO_CODE) throw new Error(`Promo code "${code}" is not valid.`);
        setPromo(code);
        const after = totalsFor(items, code);
        return items.length > 0
          ? `Promo ${code} applied: ${PROMO_DISCOUNT * 100}% off. New total ${money(after.total)} (was ${money(after.subtotal)}).`
          : `Promo ${code} applied: ${PROMO_DISCOUNT * 100}% off your order.`;
      },
      removePromo() {
        setPromo(null);
        return "Promo code removed.";
      },
      placeOrder() {
        if (items.length === 0) throw new Error("The cart is empty.");
        const order: Order = {
          id: `ORD-${Date.now().toString(36).toUpperCase()}`,
          total: totals.total,
          promo,
          items,
        };
        setOrders((prev) => [...prev, order]);
        setItems([]);
        setPromo(null); // a code is used up by the order it applied to
        return promo
          ? `Order ${order.id} placed for ${money(order.total)} with promo ${promo} (saved ${money(totals.discount)}).`
          : `Order ${order.id} placed for ${money(order.total)}.`;
      },
    };
  }, [items, orders, promo]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  return cart;
}

/** Run a tool action and turn a throw into a readable result for the agent. */
export function settle(action: () => string): Promise<string> {
  try {
    return Promise.resolve(action());
  } catch (err) {
    return Promise.resolve(`Error: ${errorMessage(err)}`);
  }
}

export const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
