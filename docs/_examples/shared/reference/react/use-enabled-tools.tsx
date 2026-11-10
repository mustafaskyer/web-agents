import { useEnabledTools } from "@webmcp-agents/react";

// Which catalog tools can an agent see on this page right now?
export function ToolBadge() {
  const ids = useEnabledTools();

  return (
    <p>
      {ids.length > 0
        ? `Agent tools: ${ids.join(", ")}`
        : "No agent tools on this page."}
    </p>
  );
}
