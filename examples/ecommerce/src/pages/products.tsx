import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { SearchXIcon } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/empty-state";
import { PageHead } from "../components/page-head";
import { ProductGrid } from "../components/product-card";
import { useProductsPage } from "../hooks/use-products-page";

export function Products() {
  const { query, title, products } = useProductsPage();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHead eyebrow="Shop" title={title} count={products.length} />
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState
          title={`No products match “${query}”`}
          body="Try a shorter word, or browse everything."
          icon={<SearchXIcon />}
          action={
            <Link to="/products" className={cn(buttonVariants())}>
              Clear search
            </Link>
          }
        />
      )}
    </div>
  );
}
