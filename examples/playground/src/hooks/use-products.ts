import { PRODUCTS, type Product } from "../data/products";

export type { Product } from "../data/products";

/** The storefront's products, one card each. A hook so the page reads data the way it reads the cart. */
export function useProducts(): { products: readonly Product[] } {
  return { products: PRODUCTS };
}
