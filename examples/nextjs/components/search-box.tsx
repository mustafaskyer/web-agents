"use client";
/** The header's search field. search_products is `useSearchProducts`: the cursor types here and presses Search. */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { useSearchProducts } from "@/webmcp-agents/hooks/use-search-products";

export function SearchBox() {
  const { form, submit } = useSearchProducts();

  return (
    <Form {...form}>
      <form
        // A person submits this.
        onSubmit={form.handleSubmit(submit)}
        className="flex gap-2"
      >
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
