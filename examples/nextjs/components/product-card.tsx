import Link from "next/link";
import { money, type Product, tileStyle } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group flex flex-col gap-2 rounded-lg border p-3 hover:bg-accent">
      <div className="aspect-square rounded-md" style={tileStyle(product)} aria-hidden="true" />
      <p className="font-medium">{product.name}</p>
      <p className="text-sm text-muted-foreground">{money(product.price)}</p>
    </Link>
  );
}
