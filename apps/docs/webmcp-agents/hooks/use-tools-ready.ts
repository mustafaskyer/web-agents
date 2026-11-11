import { whenModelContext } from "@webmcp-agents/core";
import type { WebTool } from "@webmcp-agents/react";
import { useEffect, useState } from "react";

/** Resolve once the page has `document.modelContext`: native, or the polyfill the provider loads. */
const modelContextReady = (): Promise<unknown> => new Promise((resolve) => whenModelContext(resolve));

/**
 * Call one of the page's tools the way an agent does (`tool.invoke`), once the page is ready for it. The provider
 * registers the tools a moment after it mounts (after the polyfill, in a browser without WebMCP), so an early call
 * waits for the tool instead of failing.
 */
export async function invokeWhenReady(tool: WebTool, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  await modelContextReady();
  for (let attempt = 0; ; attempt++) {
    try {
      return await tool.invoke(args, { signal });
    } catch (err) {
      const early = err instanceof Error && /Unknown tool|not available/.test(err.message);
      if (!early || attempt >= 20) throw err;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * True once the page's tools are registered: the page has `document.modelContext`, and the provider's own listener
 * for it ran first (it was added first).
 */
export function useToolsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => whenModelContext(() => setReady(true)), []);
  return ready;
}
