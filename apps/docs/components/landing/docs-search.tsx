"use client";

/**
 * search_docs: a real search of the docs from the landing page, over the same static index the docs' own search
 * dialog reads. A tool with an input like the site's others (site-tools.ts): when an agent calls it, the cursor types
 * the query into the search field (named `query`), presses Search, and the results list under the field. A person's
 * search runs the same function. The answer lists the same pages with their paths. Reading is harmless: nothing to
 * confirm.
 */
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { defineWebTool, WebToolError } from "@webmcp-agents/react";
import { type FormEvent, useState, useSyncExternalStore } from "react";
import type { SearchFn, SearchHit } from "blume:search-client";
import { DOCS } from "@/lib/site";

/** Listed on the page and in the answer. */
const LIMIT = 5;

/** The index marks matches with <mark> and escapes the rest: the page shows plain text. */
const plain = (html: string): string =>
  html
    .replaceAll(/<\/?mark>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");

/** Index routes are written as if the docs were mounted at the root. */
const href = (url: string): string => (url === DOCS || url.startsWith(`${DOCS}/`) ? url : `${DOCS}${url === "/" ? "" : url}`);

interface Found {
  query: string;
  hits: readonly SearchHit[];
}

const answerFor = ({ query, hits }: Found): string =>
  hits.length
    ? `${hits.length} doc page${hits.length === 1 ? "" : "s"} for "${query}":\n${hits
        .map((hit) => `- ${plain(hit.title)} (${href(hit.url)}): ${plain(hit.excerpt)}`)
        .join(
          "\n",
        )}\nThe results are listed under the search field. Next: open_docs with a page name, or tell the user which page answers them.`
    : `No doc page matches "${query}". Try one other word (cursor, confirm, polyfill, chat, devtools).`;

// ---------- the results, shared by the tool and the component ----------

interface Results {
  found: Found | null;
  busy: boolean;
}
let results: Results = { found: null, busy: false };
const listeners = new Set<() => void>();
const show = (next: Results): void => {
  results = next;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = (): Results => results;

let client: Promise<SearchFn> | undefined;
let latest = 0;

/** Search the docs and list the results under the field. The index (a few hundred KB) loads on the first search. */
async function search(query: string): Promise<Found> {
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

export const searchDocs = defineWebTool<{ query: string }, string>({
  id: "search_docs",
  title: "Search the docs",
  description:
    "Search the WebMCP Agents docs from the landing page by typing key words into the search field in the FAQ section. Answers up to five matching pages with their paths and a line from each, and lists them on the page. Use when the user asks how something works or where it is documented. Needs nothing first. Next: open_docs, or tell the user which page to read.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "One or two key words, e.g. confirm or polyfill (not a whole sentence)" },
    },
    required: ["query"],
  },
  readOnly: true,
  execute: async ({ query }) => {
    const words = String(query ?? "").trim();
    if (!words) throw new WebToolError("invalid_input", '"query" is empty. Pass one or two key words.');
    try {
      return answerFor(await search(words));
    } catch {
      throw new WebToolError("failed", "The docs search index did not load. Try again.");
    }
  },
});

export const DocsSearch = () => {
  const { found, busy } = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [query, setQuery] = useState("");

  // A person searches here; the tool (in the page's catalog) runs the same search.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const words = query.trim();
    if (!words) show({ found: null, busy: false });
    else void search(words).catch(() => {});
  }

  return (
    <search className="docs-search">
      <form onSubmit={onSubmit} className="docs-search__form">
        <HugeiconsIcon icon={Search01Icon} aria-hidden="true" size={16} />
        <input
          name="query"
          type="search"
          required
          placeholder="Search the docs"
          aria-label="Search the docs"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" aria-label="Search the docs">
          {busy ? "Searching" : "Search"}
        </button>
      </form>
      <div aria-live="polite">
        {found &&
          (found.hits.length ? (
            <ol className="docs-search__results">
              {found.hits.map((hit) => (
                <li key={hit.url}>
                  <a href={href(hit.url)}>
                    <strong>{plain(hit.title)}</strong>
                    <span>{plain(hit.excerpt)}</span>
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="docs-search__empty">Nothing in the docs matches "{found.query}". Try one other word.</p>
          ))}
      </div>
    </search>
  );
};
