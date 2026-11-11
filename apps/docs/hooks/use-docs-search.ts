import { type FormEvent, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clearResults, getResults, hitHref, plain, searchDocs, subscribeResults } from "@/lib/docs-search";

/** One result as the page lists it: plain text, and the link under /docs. */
export interface DocsSearchHit {
  href: string;
  title: string;
  excerpt: string;
}

/** What the docs search field renders and does. */
export interface DocsSearch {
  /** The words in the field. */
  query: string;
  setQuery: (query: string) => void;
  /** The last search's words and results (whoever ran it: the person or `search_docs`), or null before any. */
  found: { query: string; hits: readonly DocsSearchHit[] } | null;
  /** A search is running. */
  busy: boolean;
  /** The form's submit: search the words in the field, or clear the list when it is empty. */
  submit: (e: FormEvent<HTMLFormElement>) => void;
  /** The search's box (field + results): a click outside it, or Escape inside it, closes the results. */
  root: RefObject<HTMLElement | null>;
}

/**
 * The header's docs search: the field's words, and the results the person's search and the agent's (`search_docs`)
 * both list, in a panel under the field. A person's search runs the same function as the tool. The panel closes on
 * Escape or a click outside the search.
 */
export function useDocsSearch(): DocsSearch {
  const { found, busy } = useSyncExternalStore(subscribeResults, getResults, getResults);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLElement | null>(null);

  // ---------- the results panel closes like a menu: Escape, or a press outside ----------
  useEffect(() => {
    if (!found) return;
    const onPointer = (e: PointerEvent): void => {
      if (e.isTrusted && !root.current?.contains(e.target as Node)) clearResults();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && root.current?.contains(document.activeElement)) clearResults();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [found]);

  function submit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const words = query.trim();
    if (!words) clearResults();
    else void searchDocs(words).catch(() => {});
  }

  return {
    query,
    setQuery,
    found: found && {
      query: found.query,
      hits: found.hits.map((hit) => ({ href: hitHref(hit.url), title: plain(hit.title), excerpt: plain(hit.excerpt) })),
    },
    busy,
    submit,
    root,
  };
}
