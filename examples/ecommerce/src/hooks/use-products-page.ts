import { useSearchParams } from "react-router";
import { allProducts, type Product, searchProducts } from "../data/catalog";
import { useTitle } from "./use-title";

export interface ProductsPage {
  /** The search in the URL (`?q=`), trimmed; empty lists everything. */
  query: string;
  /** "All products", or "Results for “bag”". */
  title: string;
  products: readonly Product[];
}

/** /products: every product, or the results for the URL's `?q=` (search_products and the header's search put it there). */
export function useProductsPage(): ProductsPage {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const title = query ? `Results for “${query}”` : "All products";
  useTitle(title);

  return { query, title, products: query ? searchProducts(query) : allProducts() };
}
