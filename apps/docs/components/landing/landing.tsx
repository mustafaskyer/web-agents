/**
 * The site's home page, composed from OpenDesigns blocks (components/opendesigns, installed from the design hub's
 * shadcn registry) with this project's content. Sections, top to bottom: floating navbar, hero (the title over the
 * row of tools to try, over isobar contours that close in on it), three steps, FAQ, footer. The docs search is in the header. The recorded demos live
 * on their own page (demos.tsx).
 *
 * The page is also an example app: its own actions are WebMCP tools (webmcp-agents/tools), registered by
 * <AgentLayer>. Rendered by pages/index.astro as one hydrated island.
 */
import { MotionBoundary } from "@/components/opendesigns/_shared/motion-boundary";
import { PressureFront } from "@/components/opendesigns/ns-hero-isobar-contours/component";
import { FaqAccordion } from "@/components/opendesigns/velora-faq-accordion/component";
import { useFaq } from "@/hooks/use-faq";
import { REPO } from "@/lib/site";
import { homeTools } from "@/webmcp-agents/tools";
import { AgentLayer } from "./agent-layer";
import { FAQ } from "./faq-data";
import { InstallCommand } from "./install-command";
import { SiteFooter, SiteHeader } from "./site-chrome";
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
  // The FAQ's open question; `open_faq` can open one too.
  const faq = useFaq();

  return (
    <MotionBoundary className="landing bg-background text-foreground">
      <SiteHeader page="home" />

      <div id="top" className="relative">
        {/* No buttons: the hero's one action is the row of tools to try, so the contours close in on it. */}
        <PressureFront
          headline={
            <>
              Make Agents <br className="title-break title-break--narrow" />
              <TypedWords words={TYPED} /> <br className="title-break" />
              your website <span className="hero-tail">the right way</span>
            </>
          }
          subcopy="Built on WebMCP: one API for web agents, tools and workflows, with a visible cursor that shows how agents use your website, without guessing."
          below={<TryIt />}
        />
      </div>

      <section id="how" aria-labelledby="how-title" className="landing-section mx-auto w-full max-w-6xl px-6">
        <div className="section-heading">
          <p className="type-eyebrow">How it works</p>
          <h2 id="how-title" className="type-h2">
            Three steps from tool to agent
          </h2>
          <p className="type-description">
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
          contactAction={{ href: `${REPO}/issues`, label: "Open an issue" }}
          questions={FAQ}
          topics={[]}
          value={faq.open}
          onValueChange={faq.setOpen}
        />
      </div>

      <SiteFooter year={year} />

      <AgentLayer tools={homeTools} intro />
    </MotionBoundary>
  );
}
