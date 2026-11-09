/**
 * The header and footer every custom page of the site shares (home, Demos), so Home, Demos and Docs are one click
 * away from each other. The brand links home. Links a tool acts on carry `toolName` (plain anchors with `toolname`):
 * the Demos link (`show_demo` from the home page), the Quickstart links, the GitHub links (`open_github`).
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
      // on the home page `show_demo` opens the Demos page through this link; there the frames are its targets
      { href: DEMOS, id: "demos", label: "Demos", toolName: page === "home" ? "show_demo" : undefined },
      { href: "/#how", id: "how", label: "How it works" },
      { href: "/#faq", id: "faq", label: "FAQ" },
      { href: DOCS, id: "docs", label: "Docs" },
    ]}
    extra={<ThemeToggle />}
    primaryAction={{ href: REPO, id: "github", label: "GitHub", toolName: "open_github" }}
    secondaryAction={{ href: QUICKSTART, id: "quickstart", label: "Quickstart", toolName: "open_docs" }}
  />
);

export const SiteFooter = ({ page, year }: { page: SitePage; year: number }) => (
  <FooterWordmark
    compact
    homeAction={{ href: "/", label: "WebMCP Agents home" }}
    contactAction={{ href: `${REPO}/issues`, label: "Open an issue" }}
    links={[]}
    auxiliaryLinks={[
      { href: DEMOS, id: "demos", label: "Demos", toolName: page === "home" ? "show_demo" : undefined },
      { href: QUICKSTART, id: "quickstart", label: "Quickstart", toolName: "open_docs" },
      { href: `${DOCS}/guides/agents`, id: "agents", label: "Define an agent" },
      { href: `${DOCS}/reference`, id: "reference", label: "API reference" },
      { href: REPO, id: "github", label: "GitHub", toolName: "open_github" },
    ]}
    policyLinks={[{ href: `${REPO}/blob/main/LICENSE`, id: "license", label: "MIT license" }]}
    copyright={`© ${year} WebMCP Agents`}
  />
);
