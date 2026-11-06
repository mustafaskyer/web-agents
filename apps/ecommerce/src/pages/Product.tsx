import { Link, useParams } from "react-router";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Gallery } from "../components/Gallery";
import { ProductGrid } from "../components/ProductCard";
import { TrustRows } from "../components/TrustRows";
import { findProduct, getCategory, money, related } from "../data/catalog";
import { useTitle } from "../lib/useTitle";
import { AddToCartForm } from "../tools/AddToCartForm";
import { NotFound } from "./NotFound";
import styles from "./Product.module.css";

export function Product() {
  const { slug = "" } = useParams();
  const product = findProduct(slug);
  useTitle(product?.name ?? "Not found");
  if (!product) return <NotFound />;
  const category = getCategory(product.category);

  return (
    <div className="page">
      <Breadcrumbs
        items={[
          { label: "Shop", to: "/products" },
          ...(category ? [{ label: category.name, to: `/category/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />
      <div className={styles.layout}>
        <Gallery key={product.slug} images={product.images} name={product.name} />
        <div className={styles.details}>
          <div className={styles.title}>
            <h1>{product.name}</h1>
            <p className={`${styles.price} tabular`}>{money(product.price)}</p>
            {product.stock > 0 && product.stock <= 5 && <p className={styles.low}>Only {product.stock} left</p>}
          </div>
          <p className="muted">{product.description}</p>
          {product.stock > 0 ? (
            // keyed: another product resets qty and variant, and its tool definition swaps cleanly
            <AddToCartForm key={product.slug} product={product} />
          ) : (
            <div className={styles.soldOut}>
              <button type="button" className="btn secondary block" disabled>
                Sold out
              </button>
              <a href="#notify" className="link">
                Notify me when it's back
              </a>
            </div>
          )}
          <TrustRows />
          <details className={styles.more}>
            <summary>Details and care</summary>
            <dl>
              <dt>Fit</dt>
              <dd>{product.details.fit}</dd>
              <dt>Material</dt>
              <dd>{product.details.fabric}</dd>
              <dt>Care</dt>
              <dd>{product.details.care}</dd>
            </dl>
          </details>
        </div>
      </div>
      <section className={styles.related} aria-labelledby="related-title">
        <div className={styles.relatedHead}>
          <h2 id="related-title">You might also like</h2>
          <Link to="/products" className="btn ghost">
            View all
          </Link>
        </div>
        <ProductGrid products={related(product.slug, 4)} />
      </section>
    </div>
  );
}
