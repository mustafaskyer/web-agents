"use client";

/**
 * Puts the landing page's tools on `document.modelContext` and the agent cursor on the page, like any app built on
 * the packages. It renders nothing of its own and wraps nothing: the page is server-rendered and its tools are plain
 * elements, so the provider can mount after the polyfill has loaded without re-rendering the page.
 *
 * On the home page it also plays the first-visit introduction, which is a real tool call: `show_tools`, the same
 * one a visitor can repeat from the row of tools under the title. It points at that row and touches nothing else.
 */
import { executeTool, isWebMCPAvailable } from "@webmcp-agents/core";
import { WebAgentsProvider } from "@webmcp-agents/react";
import type { WebTool } from "@webmcp-agents/react";
import { useEffect, useMemo, useState } from "react";

let booting: Promise<void> | undefined;

/** Load what the tools need in this browser: the polyfill where WebMCP is missing, the devtools in development. Once per page. */
export function bootAgent(): Promise<void> {
  booting ??= (async () => {
    // Browsers without native WebMCP get the polyfill; it must exist before the first tool registers.
    if (!isWebMCPAvailable()) await import("@webmcp-agents/polyfill/auto");
    if (import.meta.env.DEV) {
      // dev only: the panel (Alt+Shift+A) and window.agent.run(name, args)
      const { installWebAgentsDevtools } = await import("@webmcp-agents/devtools");
      installWebAgentsDevtools();
    }
  })();
  return booting;
}

/**
 * Run one of the page's tools the way an agent does, once the page is ready for it. The provider registers the tools
 * a moment after it mounts, so an early call waits for the tool instead of failing.
 */
export async function runTool(name: string, args: Record<string, unknown>, signal?: AbortSignal) {
  await bootAgent();
  for (let attempt = 0; ; attempt++) {
    try {
      return await executeTool(name, args, { signal });
    } catch (err) {
      const early = err instanceof Error && /Unknown tool|not available/.test(err.message);
      if (!early || attempt >= 20) throw err;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// ---------- the first-visit introduction ----------

const SEEN_KEY = "webmcp-landing:intro-seen-v2"; // v2: the intro became show_tools
/** Once per page load, whatever React does with effects in development. */
let introduced = false;

/** Resolve once the person has left the pointer and keyboard alone for `quiet` ms: the cursor yields to them otherwise. */
function whenIdle(quiet: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let timer = window.setTimeout(done, quiet);
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    function done(): void {
      for (const type of events) window.removeEventListener(type, restart, true);
      resolve();
    }
    function restart(): void {
      clearTimeout(timer);
      timer = window.setTimeout(done, quiet);
    }
    for (const type of events) window.addEventListener(type, restart, { capture: true, passive: true });
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      done();
    });
  });
}

/**
 * On a visitor's first visit the agent runs `show_tools` once: the cursor flies to the row of tools and outlines it.
 * Never again on this browser, nor under reduced motion, on a phone, when the page opens at a section or scrolled,
 * or when the row is not in view.
 */
async function introduce(signal: AbortSignal): Promise<void> {
  if (introduced) return;
  try {
    if (localStorage.getItem(SEEN_KEY)) return;
  } catch {
    // private mode or blocked storage: still play once
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || location.hash || scrollY > 40) return;
  if (innerWidth < 768) return; // on a phone the hand is the person's own
  const row = document.querySelector('[toolname="show_tools"]');
  if (!row || row.getBoundingClientRect().bottom > innerHeight) return;

  introduced = true;
  await whenIdle(700, signal); // the cursor yields to a moving pointer: wait for a still one
  if (signal.aborted || scrollY > 40) {
    introduced = false;
    return;
  }
  try {
    await runTool("show_tools", {}, signal);
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    // cancelled by leaving the page, or storage is blocked: nothing to tell the visitor
  }
}

export interface AgentLayerProps {
  /** The page's imperative tools (site-tools.ts); all are on while the page is. */
  tools: readonly WebTool[];
  /** Play the first-visit introduction (`show_tools`). Only the home page has the row it points at. */
  intro?: boolean;
  /** Run once the tools are registered, e.g. the Demos page replaying the clip its URL names. */
  onReady?: () => void;
}

export const AgentLayer = ({ tools, intro = false, onReady }: AgentLayerProps) => {
  const [ready, setReady] = useState(false);
  const ids = useMemo(() => tools.map((tool) => tool.id), [tools]);
  useEffect(() => {
    let alive = true;
    void bootAgent().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    onReady?.();
    if (!intro) return;
    const leaving = new AbortController();
    void introduce(leaving.signal);
    return () => leaving.abort();
  }, [ready, intro, onReady]);

  if (!ready) return null;
  // "Mu" is who the cursor says it is: the tag beside the arrow.
  return <WebAgentsProvider tools={tools} global={ids} visuals={{ name: "Mu" }} />;
};
