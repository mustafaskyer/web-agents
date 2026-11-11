import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { Link } from "react-router";
import type { Product } from "../data/catalog";
import { money } from "../lib/format";
import { ProductArt } from "./product-art";

/** One product in a grid. The whole card is the link, named "Ocean Tee $48.00": open_product clicks it by name. */
export function ProductCard({ product }: { product: Product }) {
  const [first, second = first] = product.images;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative overflow-hidden rounded-xl bg-muted">
        {first && <ProductArt art={first} name={product.name} />}

        {/* the second image cross-fades in on hover: opacity only */}
        {second && (
          <div className="absolute inset-0 opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:opacity-100">
            <ProductArt art={second} name={product.name} />
          </div>
        )}

        {product.stock === 0 && (
          <Badge variant="secondary" className="absolute top-3 left-3">
            Sold out
          </Badge>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="text-sm text-muted-foreground tabular-nums">{money(product.price)}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.slug}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
