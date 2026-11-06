/**
 * How the devtools read a tool's answer. Running a tool is core's
 * `executeTool`; this only decides what the answer means on screen.
 */
import type { ModelContextToolResult } from "@web-agents/core";

/** Chrome resolves nothing when a call navigates the page; shown as this text. */
export const NAVIGATED: ModelContextToolResult = { content: [{ type: "text", text: "(navigated)" }] };

/** The text parts of a result, joined. */
export const textOf = (res: ModelContextToolResult | undefined): string =>
  (res?.content ?? [])
    .map((c) => c.text)
    .filter((t): t is string => typeof t === "string")
    .join(" ");

/**
 * Declarative tools can't set `isError`, so their handlers prefix failures with
 * "Error:" (the convention this repo's tools follow). Either counts as a failure.
 */
export const isFailure = (res: ModelContextToolResult): boolean => !!res.isError || /^Error:/.test(textOf(res));
