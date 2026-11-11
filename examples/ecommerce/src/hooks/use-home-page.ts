import { type Art, allCategories, allProducts, findProduct, listByCategory, type Product } from "../data/catalog";
import { useTitle } from "./use-title";

/** The hand-picked products and categories the home page features. */
const EDIT = ["ocean-tee", "stoneware-mug", "canvas-tote", "linen-throw"];
const FEATURED_CATEGORIES = ["apparel", "home"];
const HERO = ["linen-shirt", "stoneware-mug"];

export interface FeaturedCategory {
  slug: string;
  name: string;
  blurb: string;
  /** The category's first product image, for the tile. */
  art: Art | undefined;
}

export interface HomePage {
  /** The two hero images. */
  hero: { slug: string; name: string; art: Art }[];
  /** "The everyday edit". */
  edit: readonly Product[];
  categories: FeaturedCategory[];
}

/** The home page's featured products and categories, and its tab title. */
export function useHomePage(): HomePage {
  useTitle("");

  return {
    hero: HERO.map(findProduct).flatMap((p) => (p?.images[0] ? [{ slug: p.slug, name: p.name, art: p.images[0] }] : [])),
    edit: allProducts().filter((p) => EDIT.includes(p.slug)),
    categories: allCategories()
      .filter((c) => FEATURED_CATEGORIES.includes(c.slug))
      .map((c) => ({ ...c, art: listByCategory(c.slug)[0]?.images[0] })),
  };
}
