/**
 * Cart rules as pure functions over plain data, so they're testable without
 * React. Each throws a readable error on bad input: the store passes it on to
 * the agent and the page as-is.
 */
import { money, type Product } from "../data/catalog";

export interface CartLine {
  slug: string;
  /** The chosen option (size, colour, format), or null for products without variants. */
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

export const PROMO_CODE = "WELCOME10";
export const PROMO_RATE = 0.1;
/** Cents: free shipping from $100 (after the discount). */
export const FREE_SHIPPING_FROM = 10_000;
export const SHIPPING = 800;
export const MAX_QTY = 20;

export function totalsFor(lines: readonly CartLine[], promo: string | null): Totals {
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const discount = promo === PROMO_CODE ? Math.round(subtotal * PROMO_RATE) : 0;
  const shipping = lines.length === 0 || subtotal - discount >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

const orList = (items: readonly string[]): string =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`;

/** The product's option matching `variant` (case-insensitive), or null for a product without variants. */
export function resolveVariant(product: Product, variant: string | null | undefined): string | null {
  const axis = product.variants;
  const wanted = variant?.trim();
  if (!axis) {
    if (wanted) throw new Error(`${product.name} has no options; leave the variant out.`);
    return null;
  }
  if (!wanted) throw new Error(`Choose a ${axis.name} for ${product.name}: ${axis.options.join(", ")}.`);
  const match = axis.options.find((o) => o.toLowerCase() === wanted.toLowerCase());
  if (!match) throw new Error(`"${wanted}" isn't a ${axis.name} of ${product.name}. Choose ${orList(axis.options)}.`);
  return match;
}

/** Whole number in 1…min(stock, MAX_QTY), counting what's already in the cart. */
export function checkQty(product: Product, qty: number, inCart = 0): void {
  if (product.stock === 0) throw new Error(`${product.name} is sold out.`);
  const max = Math.min(product.stock, MAX_QTY) - inCart;
  if (max < 1) throw new Error(`You already have the maximum of ${product.name} in the cart (${inCart}).`);
  if (!Number.isInteger(qty) || qty < 1 || qty > max) {
    const already = inCart ? ` (${inCart} already in the cart)` : "";
    throw new Error(`Quantity must be a whole number from 1 to ${max}${already}, got ${qty}.`);
  }
}

export const sameLine = (l: CartLine, slug: string, variant: string | null): boolean => l.slug === slug && l.variant === variant;

export function addLine(lines: readonly CartLine[], product: Product, variant: string | null, qty: number): CartLine[] {
  const existing = lines.find((l) => sameLine(l, product.slug, variant));
  checkQty(product, qty, existing?.qty ?? 0);
  if (existing) return lines.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l));
  return [...lines, { slug: product.slug, variant, qty, name: product.name, unitPrice: product.price }];
}

/** "Ocean Tee, size M" — how a line is named to people and agents. */
export const lineLabel = (l: Pick<CartLine, "name" | "variant">): string => (l.variant ? `${l.name} (${l.variant})` : l.name);

/** Find a line by slug, and by variant when the product has several lines; throws a readable error otherwise. */
export function findLine(lines: readonly CartLine[], slug: string, variant?: string | null): CartLine {
  const candidates = lines.filter((l) => l.slug === slug);
  if (candidates.length === 0) {
    const inCart = lines.map((l) => l.slug).join(", ") || "nothing";
    throw new Error(`"${slug}" isn't in the cart. The cart has: ${inCart}.`);
  }
  if (variant == null || variant === "") {
    if (candidates.length > 1)
      throw new Error(`The cart has ${slug} in ${orList(candidates.map((l) => l.variant ?? ""))}; pass the variant.`);
    return candidates[0]!;
  }
  const line = candidates.find((l) => l.variant?.toLowerCase() === variant.toLowerCase());
  if (!line) throw new Error(`The cart has no ${slug} in "${variant}". It has ${orList(candidates.map((l) => l.variant ?? "none"))}.`);
  return line;
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
