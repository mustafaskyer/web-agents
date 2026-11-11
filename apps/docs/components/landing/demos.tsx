/**
 * The Demos page (/demos): one recorded clip per example app, each in the browser frame, with what the agent does,
 * the calls it made and links to the example's docs and source. Shares the home page's header, footer and stylesheet.
 *
 * Its tools (`show_demo`, plus the header's and footer's) are registered by <AgentLayer>; `show_demo` acts on a
 * clip's frame here. Opened at `/demos#<demo>` (how `show_demo` gets here from the home page), the page replays that
 * clip and outlines it. Rendered by pages/demos.astro as one hydrated island.
 */
import { MotionBoundary } from "@/components/opendesigns/_shared/motion-boundary";
import { DOCS, QUICKSTART } from "@/lib/site";
import { useLinkedDemo } from "@/webmcp-agents/hooks/use-linked-demo";
import { demosTools } from "@/webmcp-agents/tools";
import { AgentLayer } from "./agent-layer";
import { DemoFrame } from "./demo-frame";
import { DEMOS } from "./demos-data";
import { InstallCommand } from "./install-command";
import { SiteFooter, SiteHeader } from "./site-chrome";

export interface DemosProps {
  /** The year in the footer, fixed at build time so the server's markup and the browser's agree. */
  year: number;
  /** Each demo's calls as highlighted HTML (Shiki, made by the page at build time), in the order of DEMOS. */
  calls: readonly string[];
}

export default function Demos({ year, calls }: DemosProps) {
  // Arrived from show_demo on another page (/demos#field-store): replay that clip, now that the page is ready.
  const onReady = useLinkedDemo();

  return (
    <MotionBoundary className="landing bg-background text-foreground">
      <SiteHeader page="demos" />

      <main className="demos">
        <header className="demos__intro">
          <h1 className="demos__title">Demos</h1>
          <p className="demos__lede">
            Two example apps, each used by an agent through the app's own WebMCP tools. Watch the cursor type, and stop where a person has
            to click. Recorded with agent-browser on the apps' mock data, offline.
          </p>
          <nav aria-label="Demos" className="demos__jump">
            {DEMOS.map((demo) => (
              <a key={demo.id} href={`#${demo.id}`}>
                {demo.app}
              </a>
            ))}
          </nav>
        </header>

        {DEMOS.map((demo, i) => {
          const html = calls[i];
          return (
            <section key={demo.id} id={demo.id} className="demo" aria-labelledby={`${demo.id}-title`}>
              <div className="demo__head">
                <p className="demo__app">{demo.app}</p>
                <h2 id={`${demo.id}-title`} className="demo__title">
                  {demo.title}
                </h2>
                <p className="demo__text">{demo.text}</p>
              </div>
              <DemoFrame
                demo={demo.id}
                address={demo.address}
                sources={[
                  { src: `/demo/${demo.clip}.webm`, type: "video/webm" },
                  { src: `/demo/${demo.clip}.mp4`, type: "video/mp4" },
                ]}
                poster={`/demo/${demo.clip}.jpg`}
                description={demo.description}
              />
              <div className="demo__detail">
                <div className="demo__calls">
                  <p className="demo__label">The calls, in order</p>
                  {html ? (
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki's output for our own constants, made at build time
                    <div className="step__code" dangerouslySetInnerHTML={{ __html: html }} />
                  ) : (
                    <div className="step__code">
                      <pre>
                        <code>{demo.calls}</code>
                      </pre>
                    </div>
                  )}
                </div>
                <div className="demo__aside">
                  <p className="demo__note">{demo.note}</p>
                  <ul className="demo__links">
                    <li>
                      <a href={demo.docs}>{demo.app} in the docs</a>
                    </li>
                    <li>
                      <a href={demo.source}>Source on GitHub</a>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          );
        })}

        <section className="demos__next" aria-labelledby="demos-next">
          <h2 id="demos-next" className="demos__next-title">
            Give your own page its first tool
          </h2>
          <p className="demos__lede">
            Call useWebTool beside the button it belongs to, name it like that button, and the cursor shows every call.{" "}
            <a href={QUICKSTART}>Quickstart</a> · <a href={`${DOCS}/build/define-a-tool`}>Define a tool</a>
          </p>
          <InstallCommand />
        </section>
      </main>

      <SiteFooter year={year} />

      <AgentLayer tools={demosTools} onReady={onReady} />
    </MotionBoundary>
  );
}
