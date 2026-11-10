"use client";
/**
 * search_products, in the header on every page. The search field is the tool's control: the cursor types the query
 * there and presses Search. Searching only reads, so there is nothing to confirm.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useWebTool } from "@webmcp-agents/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { productLine, searchProducts } from "@/lib/catalog";
import { navigate } from "@/lib/navigate";

const schema = z.object({
  query: z.string().describe("One key word, e.g. mug"),
});

type SearchInput = z.infer<typeof schema>;

export function SearchBox() {
  const form = useForm<SearchInput>({ resolver: zodResolver(schema), defaultValues: { query: "" } });

  const search = ({ query }: SearchInput) => {
    const q = query.trim();
    const found = searchProducts(q, 8);
    navigate(`/?q=${encodeURIComponent(q)}`);
    return found.length
      ? `${found.length} match${found.length > 1 ? "es" : ""} for "${q}":\n${found.map(productLine).join("\n")}\nNext (for you, the assistant): open_product with a slug, then add_to_cart.`
      : `Nothing matches "${q}". Try one key word (tee, mug, bag).`;
  };

  // An agent calls this.
  useWebTool({
    id: "search_products",
    title: "Search products",
    description:
      "Search the store by one key word (tee, mug, bag) and list matching products with slugs and prices. Use first when the user names a kind of thing. Next: open_product with a slug.",
    inputSchema: schema,
    readOnly: true,
    execute: search,
  });

  // A person submits this.
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(search)} className="flex gap-2">
        <FormField
          control={form.control}
          name="query"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Search products</FormLabel>
              <FormControl>
                <Input type="search" placeholder="Search products" className="w-48" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" variant="outline" aria-label="Search products">
          Search
        </Button>
      </form>
    </Form>
  );
}
