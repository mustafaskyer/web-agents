import { Link } from "react-router";
import { money, type Product } from "../data/catalog";
import styles from "./ProductCard.module.css";
import { ProductArt } from "./ProductArt";

export function ProductCard({ product }: { product: Product }) {
  const [first, second = first] = product.images;
  return (
    <Link to={`/product/${product.slug}`} className={styles.card}>
      <div className={styles.media}>
        {first && <ProductArt art={first} name={product.name} />}
        {/* second tile cross-fades in on hover: opacity only */}
        {second && (
          <div className={styles.alt}>
            <ProductArt art={second} name={product.name} />
          </div>
        )}
        {product.stock === 0 && <span className={styles.chip}>Sold out</span>}
      </div>
      <div className={styles.meta}>
        <h3>{product.name}</h3>
        <p className="tabular">{money(product.price)}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <ul className={styles.grid}>
      {products.map((p) => (
        <li key={p.slug}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
