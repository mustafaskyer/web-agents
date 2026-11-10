/**
 * The site's home page, composed from OpenDesigns blocks (components/opendesigns, installed from the design hub's
 * shadcn registry) with this project's content. Sections, top to bottom: floating navbar, hero (the title over the
 * row of tools to try, the page's centerpiece), three steps, FAQ with a docs search, footer. The recorded demos live
 * on their own page (demos.tsx).
 *
 * The page is also an example app: its own actions are WebMCP tools (site-tools.ts, docs-search.tsx), registered by
 * <AgentLayer>. Rendered by pages/index.astro as one hydrated island.
 */
import { MotionBoundary } from "@/components/opendesigns/_shared/motion-boundary";
import { FaqAccordion } from "@/components/opendesigns/velora-faq-accordion/component";
import { GridHero } from "@/components/opendesigns/velora-hero-grid/component";
import { REPO } from "@/lib/site";
import { useEffect, useState } from "react";
import { AgentLayer } from "./agent-layer";
import { DocsSearch } from "./docs-search";
import { FAQ, type FaqTopic, OPEN_FAQ_EVENT } from "./faq-data";
import { InstallCommand } from "./install-command";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { homeTools } from "./site-tools";
import { Steps } from "./steps";
import { TryIt } from "./try-it";
import { TypedWords } from "./typed-words";

export interface LandingProps {
  /** The year in the footer, fixed at build time so the server's markup and the browser's agree. */
  year: number;
  /** The three steps' snippets as highlighted HTML (Shiki, made by the page at build time). */
  steps: readonly string[];
}

/** What an agent does with a website, typed one after the other in the title. */
const TYPED = ["understand", "navigate", "operate", "control"] as const;

export default function Landing({ year, steps }: LandingProps) {
  // The FAQ's open question; `open_faq` asks for one through a window event (faq-data.ts).
  const [faq, setFaq] = useState<string>(FAQ[0].id);
  useEffect(() => {
    const open = (e: Event): void => setFaq((e as CustomEvent<FaqTopic>).detail);
    window.addEventListener(OPEN_FAQ_EVENT, open);
    return () => window.removeEventListener(OPEN_FAQ_EVENT, open);
  }, []);

  return (
    <MotionBoundary className="landing bg-background text-foreground">
      <SiteHeader page="home" />

      <div id="top" className="relative">
        <GridHero
          eyebrow=""
          title={
            <>
              Agents <TypedWords words={TYPED} /> <br className="title-break" />
              your website
            </>
          }
          accent=""
          // description="A visible cursor for your WebMCP tools. It shows every call as it happens, waits for a real click on anything that matters, and steps aside the moment you move."
          description="Built on WebMCP: one API for web agents, tools and workflows, with a visible cursor that shows how agents use your website, without guessing."
          below={<TryIt />}
          aside={null}
        />
      </div>

      <section id="how" aria-labelledby="how-title" className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm text-muted-foreground">How it works</p>
          <h2 id="how-title" className="text-balance font-semibold text-3xl tracking-tight md:text-4xl">
            Three steps from tool to agent
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground leading-relaxed">
            A tool is one useWebTool call beside the button it belongs to. The cursor finds that button by its name; the chat and the agent
            come from the same packages.
          </p>
        </div>
        <Steps highlighted={steps} />
        <InstallCommand />
      </section>

      <div id="faq">
        <FaqAccordion
          eyebrow="FAQ"
          title="Questions developers ask first"
          description="Short answers here, long ones in the docs."
          guideTitle="In the docs"
          guideDescription="Concepts, step-by-step framework guides (Vite, Next.js, TanStack Start), and a reference page per public API. There is an llms.txt for your coding agent too."
          guideExtra={<DocsSearch />}
          contactAction={{ href: `${REPO}/issues`, label: "Open an issue" }}
          questions={FAQ}
          value={faq}
          onValueChange={setFaq}
        />
      </div>

      <SiteFooter year={year} />

      <AgentLayer tools={homeTools} intro />
    </MotionBoundary>
  );
}
