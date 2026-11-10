/**
 * The header and footer every custom page of the site shares (home, Demos), so Home, Demos and Docs are one click
 * away from each other. The brand links home. Nothing here is for the cursor: the site's tools find these links by
 * their names (the Demos link for `show_demo`, Quickstart and Docs for `open_docs`, GitHub for `open_github`).
 */
import { FooterWordmark } from "@/components/opendesigns/velora-footer-wordmark/component";
import { NavbarFloating } from "@/components/opendesigns/velora-navbar-floating/component";
import { DEMOS, DOCS, QUICKSTART, REPO } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";

export type SitePage = "home" | "demos";

export const SiteHeader = ({ page }: { page: SitePage }) => (
  <NavbarFloating
    homeAction={{ href: "/", label: "WebMCP Agents home" }}
    activeHref={page === "demos" ? DEMOS : undefined}
    items={[
      { href: DEMOS, id: "demos", label: "Demos" },
      { href: "/#how", id: "how", label: "How it works" },
      { href: "/#faq", id: "faq", label: "FAQ" },
      { href: DOCS, id: "docs", label: "Docs" },
    ]}
    extra={<ThemeToggle />}
    primaryAction={{ href: REPO, id: "github", label: "GitHub" }}
    secondaryAction={{ href: QUICKSTART, id: "quickstart", label: "Quickstart" }}
  />
);

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
    ]}
    policyLinks={[{ href: `${REPO}/blob/main/LICENSE`, id: "license", label: "MIT license" }]}
    copyright={`© ${year} WebMCP Agents`}
  />
);
