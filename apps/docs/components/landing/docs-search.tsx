"use client";

/**
 * The docs search in the site's header, over the same static index the docs' own search dialog reads. The field is
 * what the `search_docs` tool types into (it is named `query`), and its search button is what the tool presses; the
 * results open in a panel under the field whoever searched (hooks/use-docs-search.ts). The panel is the live region
 * itself, always in the DOM so a screen reader hears the results; it shows only while it has any.
 */
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDocsSearch } from "@/hooks/use-docs-search";

export const DocsSearch = () => {
  const { query, setQuery, found, busy, submit, root } = useDocsSearch();

  return (
    <search ref={root} className="docs-search" data-busy={busy || undefined}>
      {/* A person searches here; the tool runs the same search. */}
      <form onSubmit={submit} className="docs-search__form">
        <input
          name="query"
          type="search"
          required
          placeholder="Search docs"
          aria-label="Search the docs"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" aria-label="Search the docs" title="Search the docs">
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" size={16} />
        </button>
      </form>
      <div aria-live="polite" className="docs-search__panel">
        {found &&
          (found.hits.length ? (
            <ol className="docs-search__results">
              {found.hits.map((hit) => (
                <li key={hit.href}>
                  <a href={hit.href}>
                    <strong>{hit.title}</strong>
                    <span>{hit.excerpt}</span>
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
