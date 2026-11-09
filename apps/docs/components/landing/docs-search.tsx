"use client";

/**
 * Declarative WebMCP tool: search_docs, the site's one form tool (every other tool is a defineWebTool definition,
 * site-tools.ts). A form fits here: the cursor types the query into the field a person would use. A real search of the docs from the landing page, over the same static index
 * the docs' own search dialog reads. Reading is harmless, so `toolautosubmit`: the cursor types the query, presses
 * Search, and the results list under the field. The answer lists the same pages with their paths.
 */
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type FormEvent, useRef, useState } from "react";
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

export const DocsSearch = () => {
  const [found, setFound] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useRef<Promise<SearchFn> | null>(null);
  const latest = useRef(0);

  const search = async (query: string): Promise<Found> => {
    // The index (a few hundred KB) loads on the first search, not with the page.
    client.current ??= import("blume:search-client").then((m) => m.createSearch());
    const run = await client.current;
    return { query, hits: (await run(query)).hits.slice(0, LIMIT) };
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = String(new FormData(e.currentTarget).get("query") ?? "").trim();
    const submit = e.nativeEvent as SubmitEvent;
    if (!query) {
      setFound(null);
      if (submit.agentInvoked) submit.respondWith?.(Promise.resolve('Error [invalid_input]: "query" is empty. Pass one or two key words.'));
      return;
    }
    const mine = ++latest.current;
    setBusy(true);
    const result = search(query);
    result
      .then(
        (value) => {
          if (mine === latest.current) setFound(value);
        },
        () => {
          if (mine === latest.current) setFound({ query, hits: [] });
        },
      )
      .finally(() => {
        if (mine === latest.current) setBusy(false);
      });
    if (submit.agentInvoked)
      submit.respondWith?.(result.then(answerFor, () => "Error [failed]: The docs search index did not load. Try again."));
  }

  return (
    <search className="docs-search">
      <form
        toolname="search_docs"
        tooldescription="Search the WebMCP Agents docs from the landing page by typing key words into the search field in the FAQ section. Answers up to five matching pages with their paths and a line from each, and lists them on the page. Use when the user asks how something works or where it is documented. Needs nothing first. Next: open_docs, or tell the user which page to read."
        toolautosubmit=""
        onSubmit={onSubmit}
        className="docs-search__form"
      >
        <HugeiconsIcon icon={Search01Icon} aria-hidden="true" size={16} />
        <input
          name="query"
          type="search"
          required
          placeholder="Search the docs"
          aria-label="Search the docs"
          autoComplete="off"
          enterKeyHint="search"
          toolparamdescription="One or two key words, e.g. confirm or polyfill (not a whole sentence)"
        />
        <button type="submit">{busy ? "Searching" : "Search"}</button>
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
