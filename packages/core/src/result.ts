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

/**
 * Why a tool call failed, as one word an agent, a browser or devtools can branch on. Each says what to do next:
 * - `cancelled`: the user stopped it. Don't retry unless they ask.
 * - `interrupted`: the page navigated or the tool changed mid-call. Check the page, then retry.
 * - `timeout`: no answer in time. It may or may not have worked: check the page, then retry or try another way.
 * - `unavailable`: no such tool on this page right now. Get to the page that has it first.
 * - `invalid_input`: the arguments were wrong. Fix them and retry.
 * - `needs_user`: the user has to answer or confirm something. Ask them.
 * - `failed`: the tool ran and couldn't do it. Read the message.
 */
export type ToolErrorCode = "cancelled" | "interrupted" | "timeout" | "unavailable" | "invalid_input" | "needs_user" | "failed";

/** Whether calling again (after checking the page or fixing the input) can succeed without asking the user. */
export const RETRYABLE: Readonly<Record<ToolErrorCode, boolean>> = {
  cancelled: false,
  interrupted: true,
  timeout: true,
  unavailable: true,
  invalid_input: true,
  needs_user: false,
  failed: false,
};

const CODED = /^Error \[([a-z_]+)\]:\s*/;
const isCode = (code: unknown): code is ToolErrorCode => typeof code === "string" && Object.hasOwn(RETRYABLE, code);

/** True for a failure's text: `Error: …` or `Error [code]: …` (declarative forms can't set `isError`, so they say it). */
export const isErrorText = (text: string): boolean => /^Error(?: \[[a-z_]+\])?:/.test(text);

/**
 * A failed result with its code twice over: in the text (`Error [timeout]: …`), which every model reads, and in
 * `structuredContent.error` (`{ code, retryable }`), for browsers and tools that branch on it.
 */
export function toolError(code: ToolErrorCode, message: string): ModelContextToolResult {
  const text = message.replace(CODED, "").replace(/^Error:\s*/, "");
  return {
    content: [{ type: "text", text: `Error [${code}]: ${text}` }],
    isError: true,
    structuredContent: { error: { code, retryable: RETRYABLE[code] } },
  };
}

/** The code of a failed result: from `structuredContent`, else from an `Error [code]:` text. Undefined when it has none. */
export function toolErrorCode(result: ModelContextToolResult | null | undefined): ToolErrorCode | undefined {
  const fromData = (result?.structuredContent?.error as { code?: unknown } | undefined)?.code;
  if (isCode(fromData)) return fromData;
  const fromText = result?.content.find((c) => c.type === "text")?.text?.match(CODED)?.[1];
  return isCode(fromText) ? fromText : undefined;
}

/** Throw it from a tool to pick the code the agent gets (`throw new WebToolError("invalid_input", "No product \"x\"")`). */
export class WebToolError extends Error {
  override name = "WebToolError";
  constructor(
    readonly code: ToolErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** A failure the agent can read and recover from, rather than a throw it can't see. A WebToolError's code, else `code`. */
export function errorResult(err: unknown, code: ToolErrorCode = "failed"): ModelContextToolResult {
  return toolError(err instanceof WebToolError ? err.code : code, errorText(err));
}

/** `err.message` for errors, `String(err)` for anything else thrown. */
export const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Cancellation must propagate as a rejection, never turn into an `isError` result. */
export const isAbortError = (err: unknown): boolean => (err as { name?: unknown } | null)?.name === "AbortError";

/** The rejection for a call cancelled by its signal (the signal's own reason when it is an AbortError). */
export const abortError = (signal?: AbortSignal): unknown =>
  isAbortError(signal?.reason) ? signal?.reason : new DOMException("Tool execution cancelled", "AbortError");
