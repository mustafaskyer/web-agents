/**
 * The landing page's docs search, over the same static index the docs' own search dialog reads (Blume's search
 * client). One store of results, shared by the person's search field (hooks/use-docs-search.ts) and the agent's
 * `search_docs` tool: whoever searches, the results list under the field.
 */
import type { SearchFn, SearchHit } from "blume:search-client";
import { DOCS } from "./site";

/** Listed on the page and in the answer. */
const LIMIT = 5;

/** The index marks matches with <mark> and escapes the rest: the page shows plain text. */
export const plain = (html: string): string =>
  html
    .replaceAll(/<\/?mark>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");

/** Index routes are written as if the docs were mounted at the root. */
export const hitHref = (url: string): string => (url === DOCS || url.startsWith(`${DOCS}/`) ? url : `${DOCS}${url === "/" ? "" : url}`);

/** One search's words and the pages it found. */
export interface Found {
  query: string;
  hits: readonly SearchHit[];
}

/** The agent's answer for a search: the pages with their paths and a line from each. */
export const answerFor = ({ query, hits }: Found): string =>
  hits.length
    ? `${hits.length} doc page${hits.length === 1 ? "" : "s"} for "${query}":\n${hits
        .map((hit) => `- ${plain(hit.title)} (${hitHref(hit.url)}): ${plain(hit.excerpt)}`)
        .join(
          "\n",
        )}\nThe results are listed under the search field. Next: open_docs with a page name, or tell the user which page answers them.`
    : `No doc page matches "${query}". Try one other word (cursor, confirm, polyfill, chat, devtools).`;

// ---------- the results, shared by the tool and the field ----------

/** What the field shows: the last search's results, and whether one is running. */
export interface SearchResults {
  found: Found | null;
  busy: boolean;
}

let results: SearchResults = { found: null, busy: false };
const listeners = new Set<() => void>();
const show = (next: SearchResults): void => {
  results = next;
  for (const listener of listeners) listener();
};

/** Subscribe to the results (for `useSyncExternalStore`). */
export const subscribeResults = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The results now. */
export const getResults = (): SearchResults => results;

/** Empty the list under the field. */
export const clearResults = (): void => show({ found: null, busy: false });

let client: Promise<SearchFn> | undefined;
let latest = 0;

/** Search the docs and list the results under the field. The index (a few hundred KB) loads on the first search. */
export async function searchDocs(query: string): Promise<Found> {
  const mine = ++latest;
  show({ ...results, busy: true });
  try {
    client ??= import("blume:search-client").then((m) => m.createSearch());
    const run = await client;
    const found = { query, hits: (await run(query)).hits.slice(0, LIMIT) };
    if (mine === latest) show({ found, busy: false });
    return found;
  } catch (err) {
    if (mine === latest) show({ found: { query, hits: [] }, busy: false });
    throw err;
  }
}
