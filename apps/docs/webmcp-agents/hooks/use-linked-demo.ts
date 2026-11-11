import { useCallback } from "react";
import { DEMOS } from "@/components/landing/demos-data";
import { showDemo } from "@/lib/demo-frame";

/**
 * The Demos page opened at `/demos#<demo>` (how `show_demo` gets here from another page) replays that clip and
 * outlines it. Returns the callback for <AgentLayer onReady>: it runs once the page's tools are registered, so the
 * replay lands after the page is ready.
 */
export function useLinkedDemo(): () => void {
  return useCallback(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (DEMOS.some((demo) => demo.id === id)) showDemo(id);
  }, []);
}
