import type {
  ModelContextToolInfo,
  ModelContextToolResult,
  ToolEvent,
} from "@webmcp-agents/core";

/** The first text of a result, or "" when it has none. */
export const textOf = (result: ModelContextToolResult): string =>
  result.content.find((part) => part.type === "text")?.text ?? "";

/** Every tool the page has, by name. */
export async function toolNames(): Promise<string[]> {
  const tools: ModelContextToolInfo[] =
    (await document.modelContext?.getTools()) ?? [];
  return tools.map((tool) => tool.name);
}

// Chrome 156: events are on document.modelContext, not on window.
document.modelContext?.addEventListener(
  "toolactivated",
  (e: ToolEvent) => console.debug("an agent called", e.toolName),
);
