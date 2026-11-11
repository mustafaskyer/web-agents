import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import { NewsletterForm } from "../components/newsletter-form";
import { ProductArt } from "../components/product-art";
import { ProductGrid } from "../components/product-card";
import { useHomePage } from "../hooks/use-home-page";

export function Home() {
  const { hero, edit, categories } = useHomePage();

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-12 pb-16 sm:px-6 md:grid-cols-2 md:pt-20 md:pb-24">
        <div className="flex flex-col items-start gap-6">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Field Store · a WebMCP demo</p>
          <h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Everyday goods, built to <em>stay</em>.
          </h1>
          <p className="max-w-md text-lg text-pretty text-muted-foreground">
            Heavyweight basics and slow-living objects. Ask an agent to shop for you and watch it work: every action here is a tool.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/products" className={cn(buttonVariants({ size: "lg", className: "h-11 px-5" }))}>
              Shop all products
            </Link>
            <a href="#edit" className={cn(buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-5" }))}>
              See the edit
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-hidden="true">
          {hero.map((p, i) => (
            <ProductArt key={p.slug} art={p.art} name={p.name} size="md" className={i === 1 ? "mt-12" : undefined} />
          ))}
        </div>
      </section>

      <section id="edit" aria-labelledby="edit-title" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">The everyday edit</p>
            <h2 id="edit-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
              Pieces on repeat
            </h2>
          </div>
          <Link to="/products" className={cn(buttonVariants({ variant: "ghost" }))}>
            View all <ArrowRightIcon />
          </Link>
        </div>
        <ProductGrid products={edit} />
      </section>

      <section aria-label="Categories" className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to={`/category/${c.slug}`}
            className="group relative overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {c.art && (
              <ProductArt
                art={c.art}
                name={c.name}
                className="aspect-[4/3] rounded-2xl transition-transform duration-500 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.02]"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/60 to-transparent p-6 pt-16 text-white">
              <h2 className="font-serif text-3xl tracking-tight">{c.name}</h2>
              <p className="text-sm text-white/85">{c.blurb}</p>
            </div>
          </Link>
        ))}
      </section>

      <section aria-labelledby="news-title" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 rounded-2xl border bg-muted/40 p-6 sm:p-10 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-2">
            <h2 id="news-title" className="font-serif text-3xl tracking-tight">
              One email a month
            </h2>
            <p className="text-muted-foreground">New pieces, restocks and the occasional essay. No sales countdowns.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
