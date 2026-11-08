/**
 * The page's WebMCP tools, for an agent: what they are (descriptors) and how
 * to run one (through core's `executeTool`, so the agent cursor plays and
 * Chrome/polyfill differences are absorbed). Running never throws: every
 * outcome is a result the model can read.
 */
import { errorText, executeTool, isAbortError, type JSONSchema } from "@web-agents/core";
import { CANCELLED } from "./shared";
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
 * A call the page or browser cancelled, not the user: the page navigated or the tool changed mid-call. Recoverable,
 * so the agent must not read it as "the user said stop".
 */
export const INTERRUPTED =
  "Error: The page cancelled this call before it finished (it navigated, or the tool changed). Nothing is confirmed done: check the page with the tools you have now, then try again.";

/** Run a page tool for an agent. Resolves with the tool's result, or an `isError` result explaining what went wrong. */
export async function callModelContextTool(
  call: { name: string; input: unknown },
  { signal }: { signal?: AbortSignal } = {},
): Promise<ToolOutput> {
  const args = call.input && typeof call.input === "object" ? (call.input as Record<string, unknown>) : {};
  try {
    const result = await executeTool(call.name, args, { signal });
    if (result === null) return text(NAVIGATED);
    const first = result.content.find((c) => c.type === "text")?.text ?? "";
    // Declarative tools can't set isError: the convention is an "Error:" prefix.
    return result.isError || /^Error:/.test(first) ? { ...result, isError: true } : result;
  } catch (err) {
    if (isAbortError(err)) return text(signal?.aborted ? CANCELLED : INTERRUPTED, true);
    const message = errorText(err);
    if (/^Unknown tool/.test(message)) return text(`Error: Tool "${call.name}" is not available on this page right now.`, true);
    return text(message.startsWith("Error:") ? message : `Error: ${message}`, true);
  }
}
