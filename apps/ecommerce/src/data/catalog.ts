/**
 * The store's catalogue: seeded mock data and pure, synchronous queries.
 * No React, no DOM, so tools, pages and the node tests share them.
 * Prices are integer cents, so totals never drift.
 */
import categoriesJson from "./categories.json";
import productsJson from "./products.json";

export interface Category {
  slug: string;
  name: string;
  blurb: string;
}

/**
 * A product image: an Unsplash photo (free under the Unsplash License, loaded straight from images.unsplash.com),
 * over a generated gradient tile that shows while it loads and stays if it fails (offline, blocked).
 */
export interface Art {
  hue: number;
  angle: number;
  /** Unsplash photo id, e.g. "photo-1514228742587-6b1558fcca3d". */
  photo?: string;
}

export interface Product {
  slug: string;
  name: string;
  category: string;
  /** Cents. */
  price: number;
  description: string;
  details: { fit: string; fabric: string; care: string };
  /** One option axis at most (size, colour or format): enough for a demo. */
  variants?: { name: string; options: string[] };
  stock: number;
  images: Art[];
}

const PRODUCTS: readonly Product[] = productsJson;
const CATEGORIES: readonly Category[] = categoriesJson;

export const categorySlugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export const allProducts = (): readonly Product[] => PRODUCTS;
export const allCategories = (): readonly Category[] => CATEGORIES;

export const findProduct = (slug: string): Product | undefined => PRODUCTS.find((p) => p.slug === slug);

/** Throws a readable error for an unknown slug: it becomes the agent's answer. */
export function getProduct(slug: string): Product {
  const product = findProduct(slug);
  if (!product) throw new Error(`Unknown product "${slug}". Try search_products to find the right one.`);
  return product;
}

export const getCategory = (slug: string): Category | undefined => CATEGORIES.find((c) => c.slug === slug);

export interface SearchOptions {
  category?: string;
  /** Default: every match. */
  limit?: number;
}

/** Case-insensitive match on name, description and category; name prefixes first, then other name matches, then the rest. */
export function searchProducts(query: string, { category, limit }: SearchOptions = {}): Product[] {
  const q = query.trim().toLowerCase();
  const rank = (p: Product): number => {
    const name = p.name.toLowerCase();
    if (!q) return 3;
    if (name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) return 0;
    if (name.includes(q)) return 1;
    if (p.description.toLowerCase().includes(q) || p.category.includes(q)) return 2;
    return -1;
  };
  return PRODUCTS.filter((p) => !category || p.category === category)
    .map((p) => ({ p, r: rank(p) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ p }) => p);
}

export const listByCategory = (slug: string): Product[] => PRODUCTS.filter((p) => p.category === slug);

/** Same category first, then the rest; never the product itself. */
export function related(slug: string, n = 4): Product[] {
  const self = getProduct(slug);
  return PRODUCTS.filter((p) => p.slug !== slug)
    .toSorted((a, b) => Number(b.category === self.category) - Number(a.category === self.category))
    .slice(0, n);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
/** `4800` → `$48.00`. */
export const money = (cents: number): string => usd.format(cents / 100);

/** "- Ocean Tee [ocean-tee]: $48.00" — one row of a product list for the agent. */
export const productLine = (p: Product): string => `- ${p.name} [${p.slug}]: ${money(p.price)}${p.stock === 0 ? " (sold out)" : ""}`;

/** "Ocean Tee ($48.00). Size: S, M, L." — how tools describe a product to the agent. */
export function describeProduct(p: Product): string {
  const options = p.variants ? ` ${p.variants.name}: ${p.variants.options.join(", ")}.` : "";
  const stock = p.stock === 0 ? " Sold out." : p.stock <= 5 ? ` Only ${p.stock} left.` : "";
  return `${p.name} (${money(p.price)}).${options}${stock}`;
}
