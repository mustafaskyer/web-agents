/**
 * Call a page's WebMCP tool the way an agent would, from library UI (devtools,
 * the chat widget). Absorbs what differs between Chrome builds and the polyfill:
 * the args shape, string versus object results, navigation, cancellation.
 */
import { abortError, toToolResult } from "./result";

/** Options for `executeTool`. */
export interface ExecuteToolOptions {
  /** Aborting cancels the call (passed on to `modelContext.executeTool`), and the promise rejects with an AbortError. */
  signal?: AbortSignal;
}

/**
 * Native executeTool takes the tool object from getTools(), but the args shape
 * changed between builds: Chrome 156 wants an object, Chrome 150 a JSON string.
 * Try the last shape that worked, fall back on the argument-validation error.
 * Both errors are thrown before the tool runs, so a retry is safe.
 */
let argsAs: "object" | "string" = "object";

const WRONG_SHAPE = {
  // Chrome 150 builds word it "Failed to parse input string as JSON" or "Failed to parse input arguments".
  object: /parse input|not of type 'DOMString'/i,
  string: /not an object|invalid input object/i,
} as const;

/** Chrome resolves to a JSON string; the polyfill to `{ content, isError }`. Either way, an MCP result. */
export function normalizeToolResult(res: ModelContextToolResult | string): ModelContextToolResult {
  if (typeof res !== "string") return res;
  try {
    return toToolResult(JSON.parse(res));
  } catch {
    return toToolResult(res); // plain text
  }
}

/**
 * Run the tool `name` with `args` through `document.modelContext`. Resolves to
 * the tool's result, or `null` when the call navigated the page (Chrome resolves
 * nothing then). Rejects when WebMCP is missing, the tool isn't registered, or
 * `signal` aborts (with an AbortError).
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  { signal }: ExecuteToolOptions = {},
): Promise<ModelContextToolResult | null> {
  const mc = typeof document === "undefined" ? undefined : document.modelContext;
  if (!mc) throw new Error("document.modelContext is not available: no WebMCP in this browser, and no polyfill loaded.");
  if (signal?.aborted) throw abortError(signal);
  const tool = (await mc.getTools()).find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool "${name}"`);
  if (signal?.aborted) throw abortError(signal); // cancelled while looking the tool up

  const call = (shape: typeof argsAs) => mc.executeTool(tool, shape === "object" ? args : JSON.stringify(args), { signal });
  const run = async (): Promise<ModelContextToolResult | string | null | undefined> => {
    // This call's shape, not the shared one: a concurrent call may already have switched it.
    const tried = argsAs;
    try {
      return await call(tried);
    } catch (err) {
      if (!WRONG_SHAPE[tried].test(String((err as Error)?.message ?? err))) throw err;
      const other = tried === "object" ? "string" : "object";
      argsAs = other;
      return call(other);
    }
  };

  // The browser cancels the call through the signal; still reject at once, whatever a build does with it.
  let onAbort = (): void => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError(signal));
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  try {
    const res = await (signal ? Promise.race([run(), aborted]) : run());
    return res == null ? null : normalizeToolResult(res);
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
