/**
 * The page's WebMCP tools, for an agent: what they are (descriptors) and how
 * to run one (through core's `executeTool`, so the agent cursor plays and
 * Chrome/polyfill differences are absorbed). Running never throws: every
 * outcome is a result the model can read.
 */
import {
  errorText,
  executeTool,
  isAbortError,
  isErrorText,
  type JSONSchema,
  onAgentEvent,
  toolError,
  toolErrorCode,
} from "@web-agents/core";
import { CANCELLED, notOnPage } from "./shared";
import type { ToolDescriptor, ToolOutput } from "./types";

const EMPTY_SCHEMA: JSONSchema = { type: "object", properties: {} };

function parseSchema(schema: unknown): JSONSchema {
  if (typeof schema === "string") {
    try {
      return parseSchema(JSON.parse(schema));
    } catch {
      return EMPTY_SCHEMA;
    }
  }
  return schema && typeof schema === "object" ? (schema as JSONSchema) : EMPTY_SCHEMA;
}

/** The tools registered on this page right now (empty without WebMCP). */
export async function listToolDescriptors(): Promise<ToolDescriptor[]> {
  const mc = typeof document === "undefined" ? undefined : document.modelContext;
  if (!mc) return [];
  const tools = await mc.getTools();
  return tools
    .filter((t) => {
      // Chrome reports where a tool lives; keep only this page's.
      const origin = (t as { origin?: string }).origin;
      return !origin || origin === location.origin;
    })
    .map((t) => ({ name: t.name, description: t.description || t.title || t.name, inputSchema: parseSchema(t.inputSchema) }));
}

const text = (value: string, isError?: boolean): ToolOutput => ({ content: [{ type: "text", text: value }], ...(isError && { isError }) });

/** What a call that navigated the page answers (Chrome resolves such calls to null). */
export const NAVIGATED = "The page navigated away while this tool ran, so its result is unknown. Check the page before retrying.";

/**
 * How long a tool may take before the agent gets a `timeout` error and can move on. The clock stops for good once the
 * tool waits for the person (a confirm, a choice: the page's `park` event), since they may take their time.
 */
export const TOOL_TIMEOUT_MS = 30_000;

/**
 * A declarative form the browser paused for the person's click, seen on the page itself: the `park` event needs the
 * visuals installed, and can come after the clock ran out. Native Chrome's state is a pseudo-class some engines reject.
 */
function pausedForUser(tool: string): boolean {
  const form = document.querySelector(`form[toolname="${CSS.escape(tool)}"]`);
  if (!form) return false;
  if (form.querySelector("[data-tool-submit-active]")) return true;
  try {
    return !!form.querySelector(":tool-submit-active");
  } catch {
    return false;
  }
}

/** Options for `callModelContextTool`. */
export interface CallToolOptions {
  /** Aborts when the person presses Stop: the call is cancelled and answers `Error [cancelled]`. */
  signal?: AbortSignal;
  /** Default `TOOL_TIMEOUT_MS`; `0` waits forever. */
  timeoutMs?: number;
}

/**
 * Run a page tool for an agent. Resolves with the tool's result, or an `isError` result whose text starts with
 * `Error [code]:` and whose `structuredContent.error` says `{ code, retryable }` (see core's `ToolErrorCode`).
 */
export async function callModelContextTool(
  call: { name: string; input: unknown },
  { signal, timeoutMs = TOOL_TIMEOUT_MS }: CallToolOptions = {},
): Promise<ToolOutput> {
  const args = call.input && typeof call.input === "object" ? (call.input as Record<string, unknown>) : {};
  const clock = new AbortController();
  let asking = false;
  const off = onAgentEvent((e) => {
    if (e.type === "park" && e.tool === call.name) asking = true;
  });
  const timer = timeoutMs > 0 ? setTimeout(() => asking || pausedForUser(call.name) || clock.abort(), timeoutMs) : undefined;
  try {
    const result = await executeTool(call.name, args, { signal: signal ? AbortSignal.any([signal, clock.signal]) : clock.signal });
    if (result === null) return text(NAVIGATED);
    const first = result.content.find((c) => c.type === "text")?.text ?? "";
    // Declarative tools can't set isError: the convention is an "Error:" prefix (or "Error [code]:").
    if (!result.isError && !isErrorText(first)) return result;
    if (toolErrorCode(result)) return { ...result, isError: true };
    const coded = toolError("failed", first);
    return {
      ...result,
      isError: true,
      content: result.content.map((c) => (c.type === "text" && c.text === first ? coded.content[0]! : c)),
      structuredContent: { ...result.structuredContent, ...coded.structuredContent }, // keep the tool's own data
    };
  } catch (err) {
    if (isAbortError(err)) {
      if (signal?.aborted) return text(CANCELLED, true);
      if (clock.signal.aborted)
        return toolError(
          "timeout",
          `"${call.name}" didn't answer within ${Math.round(timeoutMs / 1000)} s, so it was stopped. It may or may not have done its work: check the page, then try again or another way.`,
        );
      return toolError(
        "interrupted",
        "The page cancelled this call before it finished (it navigated, or the tool changed). Nothing is confirmed done: check the page with the tools you have now, then try again.",
      );
    }
    const message = errorText(err);
    if (/^Unknown tool/.test(message)) return toolError("unavailable", notOnPage(call.name));
    return toolError("failed", message);
  } finally {
    clearTimeout(timer);
    off();
  }
}
