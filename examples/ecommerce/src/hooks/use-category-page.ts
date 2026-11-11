import { useParams } from "react-router";
import { type Category, getCategory, listByCategory, type Product } from "../data/catalog";
import { useTitle } from "./use-title";

export interface CategoryPage {
  category: Category;
  products: readonly Product[];
}

/** /category/:slug: the category and its products; null for an unknown slug (the page shows Not found). */
export function useCategoryPage(): CategoryPage | null {
  const { slug = "" } = useParams();
  const category = getCategory(slug);
  useTitle(category?.name ?? "Not found");

  return category ? { category, products: listByCategory(slug) } : null;
}
