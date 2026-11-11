"use client";

/**
 * Puts the page's tools on `document.modelContext` and the agent cursor on the page, like any app built on the
 * packages: `<WebAgentsProvider tools={tools}>`. It renders nothing of its own and wraps nothing: the page is
 * server-rendered and its tools find their controls by name. Where the browser has no WebMCP the provider loads the
 * polyfill itself, and the tools register once it is there. In `astro dev` it also installs the devtools panel
 * (Alt+Shift+A) and window.agent.invoke(name, args), wired to the cursor.
 *
 * On the home page it also plays the first-visit introduction (webmcp-agents/hooks/use-intro.ts), a real `show_tools`
 * call.
 */
import { type WebToolCatalog, WebAgentsProvider } from "@webmcp-agents/react";
import { useAgentLayer } from "@/webmcp-agents/hooks/use-agent-layer";
import { useHeaderTools } from "@/webmcp-agents/hooks/use-header-tools";

export interface AgentLayerProps {
  /** The page's tools (webmcp-agents/tools); all are on while the page is. */
  tools: WebToolCatalog;
  /** Play the first-visit introduction (`show_tools`). Only the home page has the row it points at. */
  intro?: boolean;
  /** Run once the tools are registered, e.g. the Demos page replaying the clip its URL names. */
  onReady?: () => void;
}

/** "Mu" is who the cursor says it is: the tag beside the arrow. */
const VISUALS = { name: "Mu" };

export const AgentLayer = ({ tools, intro = false, onReady }: AgentLayerProps) => {
  useAgentLayer({ intro, onReady });
  return (
    <WebAgentsProvider tools={tools} visuals={VISUALS}>
      <HeaderTools />
    </WebAgentsProvider>
  );
};

/** The header's tools (open_docs, open_github): which definition is on follows the header's state. */
const HeaderTools = () => {
  useHeaderTools();
  return null;
};
