import { notFound } from "next/navigation";
import { allProducts, findProduct, money, tileStyle } from "@/lib/catalog";
import { AddToCartForm } from "@/components/add-to-cart-form";

export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}

/** A product page: a Server Component rendering the data, with the client `add_to_cart` form. */
export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) notFound();
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="aspect-square rounded-lg" style={tileStyle(product)} aria-hidden="true" />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-lg">{money(product.price)}</p>
        <p className="text-muted-foreground">{product.description}</p>
        <AddToCartForm product={product} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Fit</dt>
          <dd>{product.details.fit}</dd>
          <dt className="text-muted-foreground">Fabric</dt>
          <dd>{product.details.fabric}</dd>
          <dt className="text-muted-foreground">Care</dt>
          <dd>{product.details.care}</dd>
        </dl>
      </div>
    </article>
  );
}
