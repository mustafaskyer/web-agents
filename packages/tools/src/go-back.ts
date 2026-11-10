/**
 * `go_back`: one step back in the browser's history, like the Back button. With the Navigation API it says where
 * that is, and refuses when there is nowhere to go back to on this site.
 */
import { defineWebTool, type WebTool, WebToolError } from "@webmcp-agents/core";
import type { CommonToolOptions } from "./shared";

/** Options for `goBack`. */
export type GoBackOptions = CommonToolOptions;

const DESCRIPTION =
  'Go back one page in the browser\'s history, like the Back button. Use when the user says "go back", "back" or "the previous page". Needs nothing first. Next: the tools of the page you land on; get_page tells you where you are.';

interface NavigationLike {
  canGoBack?: boolean;
  currentEntry?: { index: number } | null;
  entries?(): Array<{ url: string | null }>;
}

/** The `go_back` tool: `history.back()`. */
export function goBack({ id = "go_back", description = DESCRIPTION }: GoBackOptions = {}): WebTool<Record<string, never>, string> {
  return defineWebTool<Record<string, never>, string>({
    id,
    title: "Go back",
    description,
    inputSchema: { type: "object", properties: {} },
    execute: () => {
      const navigation = (globalThis as { navigation?: NavigationLike }).navigation;
      if (navigation?.canGoBack === false || (!navigation && history.length <= 1))
        throw new WebToolError("unavailable", "There is no previous page to go back to in this tab.");
      const index = navigation?.currentEntry?.index;
      const previous = index ? navigation?.entries?.()[index - 1]?.url : undefined;
      history.back();
      if (!previous) return "Went back one page.";
      const url = new URL(previous);
      return `Went back to ${url.origin === location.origin ? url.pathname + url.search + url.hash : url.href}.`;
    },
  });
}
