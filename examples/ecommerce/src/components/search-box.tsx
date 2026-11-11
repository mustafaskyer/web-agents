/** The header's search field (search_products types into it, `useSearchProducts`); Enter searches. */
import { Form, FormControl, FormField, FormItem, FormLabel } from "@webmcp-agents/examples-ui/components/form";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@webmcp-agents/examples-ui/components/input-group";
import { SearchIcon } from "lucide-react";
import { useSearchProducts } from "../webmcp-agents/hooks/use-search-products";

export function SearchBox() {
  const { form, submit } = useSearchProducts();

  return (
    <search>
      <Form {...form}>
        {/* A person submits this (Enter). */}
        <form onSubmit={submit}>
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Search products</FormLabel>
                <InputGroup className="h-9 rounded-full bg-background lg:w-56">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <FormControl>
                    <InputGroupInput type="search" placeholder="Search products" autoComplete="off" enterKeyHint="search" {...field} />
                  </FormControl>
                </InputGroup>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </search>
  );
}
