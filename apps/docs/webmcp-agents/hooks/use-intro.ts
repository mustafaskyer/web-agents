import { useEffect } from "react";
import { toolsRow } from "@/lib/tools-row";
import { whenIdle } from "@/lib/when-idle";
import { homeTools } from "../tools";
import { invokeWhenReady } from "./use-tools-ready";

const SEEN_KEY = "webmcp-landing:intro-seen-v2"; // v2: the intro became show_tools
/** Once per page load, whatever React does with effects in development. */
let introduced = false;

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
  const row = toolsRow();
  if (!row || row.getBoundingClientRect().bottom > innerHeight) return;

  introduced = true;
  await whenIdle(700, signal); // the cursor yields to a moving pointer: wait for a still one
  if (signal.aborted || scrollY > 40) {
    introduced = false;
    return;
  }
  try {
    await invokeWhenReady(homeTools.showTools, {}, signal);
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    // cancelled by leaving the page, or storage is blocked: nothing to tell the visitor
  }
}

/**
 * Play the first-visit introduction, a real tool call (`show_tools`, the same one a visitor can repeat from the row of
 * tools), once `enabled` (the tools are registered, on the home page). Leaving the page cancels it.
 */
export function useIntro(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const leaving = new AbortController();
    void introduce(leaving.signal);
    return () => leaving.abort();
  }, [enabled]);
}
