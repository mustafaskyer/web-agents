/**
 * The header and footer every custom page of the site shares (home, Demos), so Home, Demos and Docs are one click
 * away from each other. The brand (the agent cursor + the wordmark) links home; the docs search sits in the bar at every
 * width. Nothing here is for the cursor: the site's tools find these controls by their names (the Demos link for
 * `show_demo`, Quickstart and Docs for `open_docs`, GitHub for `open_github`, the same in the menu once the bar folds, the search field for `search_docs`, "Open an
 * issue" (the footer's, or the FAQ's on home) for `open_github_issue`).
 */
import { FooterWordmark } from "@/components/opendesigns/velora-footer-wordmark/component";
import { NavbarFloating } from "@/components/opendesigns/velora-navbar-floating/component";
import { useHeader } from "@/hooks/use-header";
import { setHeaderCollapsed, setMenuOpen } from "@/lib/header";
import { DEMOS, DOCS, QUICKSTART, REPO } from "@/lib/site";
import { DocsSearch } from "./docs-search";
import { ThemeToggle } from "./theme-toggle";

export type SitePage = "home" | "demos";

/**
 * The menu's state lives in lib/header.ts, so the tools on these links know when the bar has folded them into the
 * menu, and can open it (webmcp-agents/hooks/use-header-tools.ts).
 */
export const SiteHeader = ({ page }: { page: SitePage }) => {
  const { menuOpen } = useHeader();
  return (
    <NavbarFloating
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onCollapsedChange={setHeaderCollapsed}
      homeAction={{ href: "/", label: "WebMCP Agents home" }}
      activeHref={page === "demos" ? DEMOS : undefined}
      items={[
        { href: DEMOS, id: "demos", label: "Demos" },
        { href: "/#how", id: "how", label: "How it works" },
        { href: "/#faq", id: "faq", label: "FAQ" },
        { href: DOCS, id: "docs", label: "Docs" },
      ]}
      extra={
        <>
          <DocsSearch />
          <ThemeToggle />
        </>
      }
      primaryAction={{ href: REPO, id: "github", label: "GitHub" }}
      secondaryAction={{ href: QUICKSTART, id: "quickstart", label: "Quickstart" }}
    />
  );
};

export const SiteFooter = ({ year }: { year: number }) => (
  <FooterWordmark
    compact
    homeAction={{ href: "/", label: "WebMCP Agents home" }}
    contactAction={{ href: `${REPO}/issues`, label: "Open an issue" }}
    links={[]}
    auxiliaryLinks={[
      { href: DEMOS, id: "demos", label: "Demos" },
      { href: QUICKSTART, id: "quickstart", label: "Quickstart" },
      { href: `${DOCS}/build/define-an-agent`, id: "agents", label: "Define an agent" },
      { href: `${DOCS}/reference`, id: "reference", label: "API reference" },
      { href: REPO, id: "github", label: "GitHub" },
      { href: `${REPO}/issues/new`, id: "issue", label: "Open an issue" },
    ]}
    policyLinks={[{ href: `${REPO}/blob/main/LICENSE`, id: "license", label: "MIT license" }]}
    copyright={`© ${year} WebMCP Agents`}
  />
);
