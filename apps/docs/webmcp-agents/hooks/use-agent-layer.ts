import { useEffect } from "react";
import { useIntro } from "./use-intro";
import { useToolsReady } from "./use-tools-ready";

/** What <AgentLayer> does once the page's tools are registered. */
export interface AgentLayerOptions {
  /** Play the first-visit introduction (`show_tools`). Only the home page has the row it points at. */
  intro: boolean;
  /** Run once the tools are registered, e.g. the Demos page replaying the clip its URL names. */
  onReady?: () => void;
}

/** Wait for the page's tools, then run `onReady` and, on the home page, the first-visit introduction. */
export function useAgentLayer({ intro, onReady }: AgentLayerOptions): void {
  const ready = useToolsReady();
  useEffect(() => {
    if (ready) onReady?.();
  }, [ready, onReady]);
  useIntro(ready && intro);
}
