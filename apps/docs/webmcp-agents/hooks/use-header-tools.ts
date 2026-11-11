import { useWebTool } from "@webmcp-agents/react";
import { useHeader } from "@/hooks/use-header";
import { openDocs, openDocsFromMenu, openGithub, openGithubFromMenu } from "../tools";

/**
 * The tools on the header's links, by the header's state: the bar's link while it shows its links, the menu's item
 * once it has folded them into the menu (a narrow window, or the bar compacted on scroll). One registration per tool:
 * both definitions share the id and everything the agent sees, so the swap is invisible to it and never cancels a call.
 * Call it inside the provider (<AgentLayer> does), so the cursor is installed before these register.
 */
export function useHeaderTools(): void {
  const { collapsed } = useHeader();
  useWebTool(collapsed ? openDocsFromMenu : openDocs);
  useWebTool(collapsed ? openGithubFromMenu : openGithub);
}
