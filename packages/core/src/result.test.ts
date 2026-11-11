import { describe, expect, it } from "vitest";
import { errorResult, isErrorText, RETRYABLE, toolError, toolErrorCode, WebToolError } from "./result";

describe("tool error codes", () => {
  it("puts the code in the text (for models) and in structuredContent (for browsers and tools)", () => {
    expect(toolError("timeout", "No answer in 30 s.")).toEqual({
      content: [{ type: "text", text: "Error [timeout]: No answer in 30 s." }],
      isError: true,
      structuredContent: { error: { code: "timeout", retryable: true } },
    });
  });

  it("never stacks prefixes on an already-prefixed message", () => {
    expect(toolError("failed", "Error: Out of stock").content[0]?.text).toBe("Error [failed]: Out of stock");
    expect(toolError("interrupted", "Error [failed]: gone").content[0]?.text).toBe("Error [interrupted]: gone");
  });

  it("reads the code back from structuredContent or the text, and nothing from an uncoded result", () => {
    expect(toolErrorCode(toolError("needs_user", "Pick a size"))).toBe("needs_user");
    expect(toolErrorCode({ content: [{ type: "text", text: "Error [unavailable]: not here" }], isError: true })).toBe("unavailable");
    expect(toolErrorCode({ content: [{ type: "text", text: "Error [made_up]: ?" }] })).toBeUndefined();
    expect(toolErrorCode({ content: [{ type: "text", text: "Error: plain" }], isError: true })).toBeUndefined();
    expect(toolErrorCode(null)).toBeUndefined();
    // only real codes, never an inherited key
    expect(toolErrorCode({ content: [{ type: "text", text: "Error [constructor]: x" }] })).toBeUndefined();
    expect(toolErrorCode({ content: [], structuredContent: { error: { code: "toString" } } })).toBeUndefined();
  });

  it("tells an error text from a sentence that starts with the word", () => {
    expect(isErrorText("Error: no")).toBe(true);
    expect(isErrorText("Error [timeout]: no")).toBe(true);
    expect(isErrorText("Error rate: 0.2%")).toBe(false);
    expect(isErrorText("Error-free")).toBe(false);
  });

  it("errorResult codes a throw as failed unless told otherwise; a WebToolError picks its own", () => {
    expect(toolErrorCode(errorResult(new Error("kaput")))).toBe("failed");
    expect(toolErrorCode(errorResult(new WebToolError("invalid_input", 'No product "x"')))).toBe("invalid_input");
    expect(toolErrorCode(errorResult(new Error("bad qty"), "invalid_input"))).toBe("invalid_input");
  });

  it("only a user's stop, a needed answer and a plain failure aren't worth retrying unasked", () => {
    expect(
      Object.entries(RETRYABLE)
        .filter(([, r]) => !r)
        .map(([c]) => c),
    ).toEqual(["cancelled", "needs_user", "failed"]);
  });
});
