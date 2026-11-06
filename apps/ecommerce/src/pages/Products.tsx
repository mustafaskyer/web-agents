import { Link, useSearchParams } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { ProductGrid } from "../components/ProductCard";
import { allProducts, searchProducts } from "../data/catalog";
import { useTitle } from "../lib/useTitle";
import styles from "./page.module.css";

export function Products() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const products = q ? searchProducts(q) : allProducts();
  const title = q ? `Results for “${q}”` : "All products";
  useTitle(title);
  return (
    <div className="page">
      <div className={styles.head}>
        <p className="eyebrow">Shop</p>
        <h1>{title}</h1>
        <p className={`${styles.count} tabular`} aria-live="polite">
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
      </div>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState
          title={`No products match “${q}”`}
          body="Try a shorter word, or browse everything."
          action={
            <Link to="/products" className="btn primary">
              Clear search
            </Link>
          }
        />
      )}
    </div>
  );
}
