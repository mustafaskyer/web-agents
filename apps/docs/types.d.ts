// What the landing page's components import that TypeScript cannot see by itself: stylesheets, and the search client
// Blume generates for the site (an alias in the generated Astro config).
declare module "*.css";

// An Astro component registered in components.ts: Blume renders it, this app only names it.
declare module "*.astro" {
  const component: (props: Record<string, unknown>) => unknown;
  export default component;
}

declare module "blume:search-client" {
  /** One result of the docs search. `title` and `excerpt` carry `<mark>` around the matched words, nothing else. */
  export interface SearchHit {
    url: string;
    title: string;
    excerpt: string;
    breadcrumb?: string[];
    section?: string;
  }
  export interface SearchResult {
    hits: SearchHit[];
  }
  export type SearchFn = (query: string) => Promise<SearchResult>;
  /** Fetches the static index (`/blume-search.json`) and builds the in-browser database. */
  export const createSearch: () => Promise<SearchFn>;
}

// Vite's flag for the dev server; the page only reads this one.
interface ImportMeta {
  readonly env: { readonly DEV: boolean };
}
