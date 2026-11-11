import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@webmcp-agents/examples-ui/components/accordion";
import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { Button, buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import { AddToCartForm } from "../components/add-to-cart-form";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Gallery } from "../components/gallery";
import { ProductGrid } from "../components/product-card";
import { TrustRows } from "../components/trust-rows";
import { useProductPage } from "../hooks/use-product-page";
import { money } from "../lib/format";
import { NotFound } from "./not-found";

export function Product() {
  const page = useProductPage();
  if (!page) return <NotFound />;
  const { product, breadcrumbs, inStock, fewLeft, related } = page;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <Gallery key={product.slug} images={product.images} name={product.name} />

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{product.name}</h1>
            <div className="flex items-center gap-3">
              <p className="text-xl tabular-nums">{money(product.price)}</p>
              {fewLeft !== null && <Badge variant="outline">Only {fewLeft} left</Badge>}
            </div>
            <p className="max-w-prose text-pretty text-muted-foreground">{product.description}</p>
          </div>

          {inStock ? (
            // keyed: another product resets qty and variant, and its tool definition swaps cleanly
            <AddToCartForm key={product.slug} product={product} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button size="lg" variant="secondary" className="h-11 w-full" disabled>
                Sold out
              </Button>
              <a href="#notify" className="text-sm underline underline-offset-4">
                Notify me when it's back
              </a>
            </div>
          )}

          <TrustRows />

          <Accordion>
            <AccordionItem value="details">
              <AccordionTrigger>Details and care</AccordionTrigger>
              <AccordionContent>
                <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Fit</dt>
                  <dd>{product.details.fit}</dd>
                  <dt className="text-muted-foreground">Material</dt>
                  <dd>{product.details.fabric}</dd>
                  <dt className="text-muted-foreground">Care</dt>
                  <dd>{product.details.care}</dd>
                </dl>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <section aria-labelledby="related-title" className="mt-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="related-title" className="font-serif text-3xl tracking-tight">
            You might also like
          </h2>
          <Link to="/products" className={cn(buttonVariants({ variant: "ghost" }))}>
            View all <ArrowRightIcon />
          </Link>
        </div>
        <ProductGrid products={related} />
      </section>
    </div>
  );
}
