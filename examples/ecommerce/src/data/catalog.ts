/**
 * The store's catalogue: seeded mock data and pure, synchronous queries.
 * No React, no DOM, so tools, pages and the node tests share them.
 * Prices are integer cents, so totals never drift.
 */
import { money } from "../lib/format.ts";
import categoriesJson from "./categories.json" with { type: "json" };
import productsJson from "./products.json" with { type: "json" };

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
  /** Words people search with that the name doesn't say ("bag" for the tote, "wallet" for the cardholder). */
  tags: string[];
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

/** Words that say nothing about which product: "a beautiful bag" searches for "bag". */
const STOP_WORDS = new Set(
  "a an the some any my me i we you for to of in on with and or is are want need looking find show get buy please one good nice beautiful pretty cool new best great cheap something thing product products item".split(
    " ",
  ),
);
/** Sizes are a product's options, not words in its name: "a large tee" searches for "tee". */
const SIZE_WORDS = new Set("size sizes sized xs small medium large xl xxl".split(" "));

/** Hyphens don't count: "tshirt" finds "t-shirt". */
const words = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map((w) => w.replace(/-/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !SIZE_WORDS.has(w));

/** "bags" finds "bag", "mugs" finds "mug". */
const singular = (w: string): string => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/**
 * Case-insensitive search, word by word: name, tags, category and description. The whole phrase at the start of a
 * name ranks first; a sentence works too ("I want a beautiful bag" finds the tote by its "bag" tag).
 */
export function searchProducts(query: string, { category, limit }: SearchOptions = {}): Product[] {
  const q = query.trim().toLowerCase();
  const terms = [...new Set(words(q).map(singular))];
  const score = (p: Product): number => {
    if (!q) return 1;
    const name = p.name.toLowerCase();
    let s = 0;
    if (name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) s += 20;
    else if (name.includes(q)) s += 10;
    const nameWords = words(name).map(singular);
    const tagWords = p.tags.flatMap((t) => words(t)).map(singular);
    const descriptionWords = words(p.description).map(singular);
    for (const t of terms) {
      if (nameWords.some((w) => w.startsWith(t))) s += 4;
      if (tagWords.includes(t)) s += 3;
      if (singular(p.category) === t) s += 2;
      if (descriptionWords.includes(t)) s += 1;
    }
    return s;
  };
  return PRODUCTS.filter((p) => !category || p.category === category)
    .map((p) => ({ p, s: score(p) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
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

/** "- Ocean Tee [ocean-tee]: $48.00" — one row of a product list for the agent. */
export const productLine = (p: Product): string => `- ${p.name} [${p.slug}]: ${money(p.price)}${p.stock === 0 ? " (sold out)" : ""}`;

/** "Ocean Tee ($48.00). Size: S, M, L." — how tools describe a product to the agent. */
export function describeProduct(p: Product): string {
  const options = p.variants ? ` ${p.variants.name}: ${p.variants.options.join(", ")}.` : "";
  const stock = p.stock === 0 ? " Sold out." : p.stock <= 5 ? ` Only ${p.stock} left.` : "";
  return `${p.name} (${money(p.price)}).${options}${stock}`;
}

/** One line per category with what's in it: where to look when a search finds nothing. */
export const categoryOverview = (): string =>
  CATEGORIES.map(
    (c) =>
      `- ${c.slug}: ${listByCategory(c.slug)
        .map((p) => p.name)
        .join(", ")}`,
  ).join("\n");

/** The words of `query` that match no product at all ("red" in "red tshirt"): worth telling the user. */
export function unmatchedWords(query: string): string[] {
  return [...new Set(words(query))].filter((w) => searchProducts(w).length === 0);
}
