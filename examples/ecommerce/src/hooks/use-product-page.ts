import { useParams } from "react-router";
import { findProduct, getCategory, type Product, related } from "../data/catalog";
import { useTitle } from "./use-title";

/** "Only 3 left" shows from this stock down. */
const LOW_STOCK = 5;

export interface ProductPage {
  product: Product;
  /** Shop › Category › Product. */
  breadcrumbs: { label: string; to?: string }[];
  /** False: the page shows Sold out instead of the add_to_cart form. */
  inStock: boolean;
  /** The stock left when it is low enough to say so, else null. */
  fewLeft: number | null;
  /** "You might also like": the same category first. */
  related: readonly Product[];
}

/** /product/:slug: the product and what its page derives from it; null for an unknown slug (the page shows Not found). */
export function useProductPage(): ProductPage | null {
  const { slug = "" } = useParams();
  const product = findProduct(slug);
  useTitle(product?.name ?? "Not found");
  if (!product) return null;

  const category = getCategory(product.category);
  return {
    product,
    breadcrumbs: [
      { label: "Shop", to: "/products" },
      ...(category ? [{ label: category.name, to: `/category/${category.slug}` }] : []),
      { label: product.name },
    ],
    inStock: product.stock > 0,
    fewLeft: product.stock > 0 && product.stock <= LOW_STOCK ? product.stock : null,
    related: related(product.slug, 4),
  };
}
