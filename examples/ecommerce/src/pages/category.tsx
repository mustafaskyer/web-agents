import { Breadcrumbs } from "../components/breadcrumbs";
import { PageHead } from "../components/page-head";
import { ProductGrid } from "../components/product-card";
import { useCategoryPage } from "../hooks/use-category-page";
import { NotFound } from "./not-found";

export function Category() {
  const page = useCategoryPage();
  if (!page) return <NotFound />;
  const { category, products } = page;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHead
        breadcrumbs={<Breadcrumbs items={[{ label: "Shop", to: "/products" }, { label: category.name }]} />}
        title={category.name}
        lede={category.blurb}
        count={products.length}
      />
      <ProductGrid products={products} />
    </div>
  );
}
