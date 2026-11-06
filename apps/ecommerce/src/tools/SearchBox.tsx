/**
 * Declarative WebMCP tool: search_products (global: the header is on every page)
 *
 * Searching is read-only, so `toolautosubmit`. The answer lists matches with
 * their slugs, so the agent can go straight to open_product. The header stays
 * mounted across pages, so navigating to the results can't cancel the call.
 */
import { useToolAnswer } from "@web-agents/react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { SearchIcon } from "../components/icons";
import { productLine, searchProducts } from "../data/catalog";
import { TO_BUY } from "./openProduct";
import styles from "./SearchBox.module.css";

/** The answer lists this many; the results page shows them all. */
const ANSWER_LIMIT = 8;

export function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { answer } = useToolAnswer();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  // follow the URL (Back, "Clear search"), not just the first render
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("query") ?? "").trim();
    const hits = searchProducts(q);
    void navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
    const list = hits.slice(0, ANSWER_LIMIT).map(productLine).join("\n");
    const more = hits.length > ANSWER_LIMIT ? `\n…and ${hits.length - ANSWER_LIMIT} more on the page.` : "";
    const found = q ? `${hits.length} result${hits.length === 1 ? "" : "s"} for "${q}"` : `All ${hits.length} products`;
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(hits.length ? `${found}:\n${list}${more}${TO_BUY}` : `No products match "${q}".`));
  }

  return (
    <search className={styles.search}>
      <form
        toolname="search_products"
        tooldescription="Search the store's products by name, description or category. Lists matches with slugs and prices."
        toolautosubmit=""
        onSubmit={onSubmit}
      >
        <SearchIcon />
        <input
          name="query"
          type="search"
          placeholder="Search products"
          aria-label="Search products"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          toolparamdescription="What to look for, e.g. linen shirt"
        />
      </form>
    </search>
  );
}
