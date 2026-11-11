/**
 * search_products, in the header on every page. The search field is the tool's control (`target`): the cursor goes to
 * it, types the query, and the results page opens. The answer lists matches with their slugs, so the agent can go
 * straight to open_product. Searching only reads, so there is nothing to confirm.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useWebTool } from "@webmcp-agents/react";
import { type BaseSyntheticEvent, useEffect } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { categoryOverview, productLine, searchProducts, unmatchedWords } from "../../data/catalog";
import { TO_BUY } from "../tools/open-product";

/** The answer lists this many; the results page shows them all. */
const ANSWER_LIMIT = 8;

const schema = z.object({
  query: z.string().describe("One or two key words, e.g. bag or linen shirt (not a whole sentence)"),
});

export type SearchInput = z.infer<typeof schema>;

export interface SearchProducts {
  /** The search field's form; it follows the URL's `?q=` (Back, "Clear search"). */
  form: UseFormReturn<SearchInput>;
  /** The form's onSubmit (Enter). */
  submit(e?: BaseSyntheticEvent): Promise<unknown>;
}

/** The header's search: one `search` for the agent's call and the person's Enter, and the search_products tool. */
export function useSearchProducts(): SearchProducts {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";

  const form = useForm<SearchInput>({
    resolver: zodResolver(schema),
    defaultValues: { query: urlQuery },
  });

  // follow the URL (Back, "Clear search"), not just the first render
  useEffect(() => form.reset({ query: urlQuery }), [form, urlQuery]);

  const search = ({ query }: SearchInput) => {
    const q = query.trim();
    const hits = searchProducts(q);
    void navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");

    if (!hits.length) return `No products match "${q}". Try one other word, or browse_category:\n${categoryOverview()}`;

    const list = hits.slice(0, ANSWER_LIMIT).map(productLine).join("\n");
    const more = hits.length > ANSWER_LIMIT ? `\n…and ${hits.length - ANSWER_LIMIT} more on the page.` : "";
    const missing = unmatchedWords(q);
    const found =
      (q ? `${hits.length} result${hits.length === 1 ? "" : "s"} for "${q}"` : `All ${hits.length} products`) +
      (missing.length ? ` (nothing matched "${missing.join('", "')}": these are the closest)` : "");
    return `${found}:\n${list}${more}${TO_BUY}`;
  };

  // An agent calls this.
  useWebTool({
    id: "search_products",
    title: "Search products",
    description:
      "Find products by a key word (bag, mug, shirt), from any page. Use first when the user describes something they want. Answers matches with slugs and prices. Next: open_product with a slug.",
    inputSchema: schema,
    readOnly: true,

    // the search field itself: the cursor types the query into it
    target: { role: "searchbox", name: "Search products" },

    execute: search,
  });

  return {
    form,
    submit: form.handleSubmit(search),
  };
}
