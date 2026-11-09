import { ProductCard } from "@/components/product-card";
import { allProducts, searchProducts } from "@/lib/catalog";

/** The store front: every product, or the matches for `?q=` (what search_products navigates to). A Server Component. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const products = query ? searchProducts(query) : allProducts();
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{query ? `Results for "${query}"` : "Everything in the store"}</h1>
      {products.length === 0 && <p className="text-muted-foreground">Nothing matches. Try one key word: tee, mug, bag.</p>}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
          <li key={p.slug}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </>
  );
}
