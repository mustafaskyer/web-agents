import {
  errorResult,
  isAbortError,
  toToolResult,
  WebToolError,
} from "@webmcp-agents/core";

async function placeOrder(id: string, signal: AbortSignal) {
  if (signal.aborted) throw signal.reason;
  if (id === "") throw new WebToolError("invalid_input", "Empty id");
  return { order: id };
}

export async function call(id: string, signal: AbortSignal) {
  try {
    // An object becomes JSON text; a string becomes text.
    return toToolResult(await placeOrder(id, signal));
  } catch (err) {
    // Cancellation must reject, never become a result.
    if (isAbortError(err)) throw err;

    // "Error [invalid_input]: Empty id", isError: true
    return errorResult(err);
  }
}
