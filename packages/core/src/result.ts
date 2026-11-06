/**
 * MCP tool results. Agents read `{ content: [{ type: "text", text }], isError? }`;
 * tools return whatever is natural (a string, an object, nothing), so normalise
 * once, with the same rules the polyfill applies to imperative tools.
 */

/** A string becomes text, an object becomes JSON text, an MCP result passes through, nothing becomes no content. */
export function toToolResult(value: unknown): ModelContextToolResult {
  if (value && typeof value === "object" && Array.isArray((value as ModelContextToolResult).content))
    return value as ModelContextToolResult;
  if (value == null) return { content: [] };
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }] };
}

/** A failure the agent can read and recover from, rather than a throw it can't see. */
export function errorResult(err: unknown): ModelContextToolResult {
  return { content: [{ type: "text", text: errorText(err) }], isError: true };
}

/** `err.message` for errors, `String(err)` for anything else thrown. */
export const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Cancellation must propagate as a rejection, never turn into an `isError` result. */
export const isAbortError = (err: unknown): boolean => (err as { name?: unknown } | null)?.name === "AbortError";

/** The rejection for a call cancelled by its signal (the signal's own reason when it is an AbortError). */
export const abortError = (signal?: AbortSignal): unknown =>
  isAbortError(signal?.reason) ? signal?.reason : new DOMException("Tool execution cancelled", "AbortError");
