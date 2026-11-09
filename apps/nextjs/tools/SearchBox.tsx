"use client";
/** Declarative tool: search_products (header, every page). Searching is cheap, so `toolautosubmit`. */
import { useToolAnswer } from "@webmcp-agents/react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { productLine, searchProducts } from "@/lib/catalog";

export function SearchBox() {
  const router = useRouter();
  const { answer } = useToolAnswer();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    const found = searchProducts(q, 8);
    router.push(`/?q=${encodeURIComponent(q)}`);
    answer(
      e.nativeEvent as SubmitEvent,
      Promise.resolve(
        found.length
          ? `${found.length} match${found.length > 1 ? "es" : ""} for "${q}":\n${found.map(productLine).join("\n")}\nNext (for you, the assistant): open_product with a slug, then add_to_cart.`
          : `Nothing matches "${q}". Try one key word (tee, mug, bag).`,
      ),
    );
  }
  return (
    <form
      toolname="search_products"
      tooldescription="Search the store by one key word (tee, mug, bag) and list matching products with slugs and prices. Use first when the user names a kind of thing. Next: open_product with a slug."
      toolautosubmit=""
      onSubmit={onSubmit}
      className="flex gap-2"
    >
      <input
        name="q"
        type="search"
        placeholder="Search products"
        aria-label="Search products"
        toolparamdescription="One key word, e.g. mug"
        className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
      />
      <button type="submit" className="h-9 rounded-md border px-3 text-sm">
        Search
      </button>
    </form>
  );
}
