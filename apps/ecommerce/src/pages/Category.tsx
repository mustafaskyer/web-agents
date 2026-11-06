import { useParams } from "react-router";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProductGrid } from "../components/ProductCard";
import { getCategory, listByCategory } from "../data/catalog";
import { useTitle } from "../lib/useTitle";
import { NotFound } from "./NotFound";
import styles from "./page.module.css";

export function Category() {
  const { slug = "" } = useParams();
  const category = getCategory(slug);
  useTitle(category?.name ?? "Not found");
  if (!category) return <NotFound />;
  const products = listByCategory(slug);
  return (
    <div className="page">
      <div className={styles.head}>
        <Breadcrumbs items={[{ label: "Shop", to: "/products" }, { label: category.name }]} />
        <h1>{category.name}</h1>
        <p className="muted">{category.blurb}</p>
        <p className={`${styles.count} tabular`}>
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
