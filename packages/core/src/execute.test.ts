import { afterEach, describe, expect, it, vi } from "vitest";
import { executeTool, normalizeToolResult } from "./execute";

const tool: ModelContextToolInfo = { name: "add", description: "", inputSchema: "{}" };

/** A fake `document.modelContext` whose executeTool is `impl`. */
function fakeModelContext(
  impl: (tool: ModelContextToolInfo | string, args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>,
) {
  const mc = { getTools: async () => [tool], executeTool: vi.fn(impl) };
  vi.stubGlobal("document", { modelContext: mc });
  return mc;
}

describe("normalizeToolResult", () => {
  it.each([
    ["an MCP result object", { content: [{ type: "text", text: "hi" }] }, { content: [{ type: "text", text: "hi" }] }],
    [
      "a JSON MCP result",
      '{"content":[{"type":"text","text":"hi"}],"isError":true}',
      { content: [{ type: "text", text: "hi" }], isError: true },
    ],
    ["a JSON string", '"hello"', { content: [{ type: "text", text: "hello" }] }],
    ["plain text", "Added 2 mugs", { content: [{ type: "text", text: "Added 2 mugs" }] }],
    ["other JSON", '{"qty":2}', { content: [{ type: "text", text: '{"qty":2}' }] }],
  ])("normalises %s", (_, input, expected) => {
    expect(normalizeToolResult(input as ModelContextToolResult | string)).toEqual(expected);
  });
});

describe("executeTool", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects without document.modelContext, and for unknown tools", async () => {
    vi.stubGlobal("document", {});
    await expect(executeTool("add", {})).rejects.toThrow(/polyfill/);
    fakeModelContext(async () => "ok");
    await expect(executeTool("nope", {})).rejects.toThrow('Unknown tool "nope"');
  });

  it("falls back to a JSON-string args shape (Chrome 150) and remembers it", async () => {
    const mc = fakeModelContext(async (_, args) => {
      if (typeof args !== "string") throw new TypeError("Failed to parse input string as JSON");
      return `Added ${JSON.parse(args).qty}`;
    });
    expect(await executeTool("add", { qty: 2 })).toEqual({ content: [{ type: "text", text: "Added 2" }] });
    expect(mc.executeTool).toHaveBeenCalledTimes(2);
    await executeTool("add", { qty: 3 });
    expect(mc.executeTool).toHaveBeenCalledTimes(3);
    expect(mc.executeTool.mock.calls[2]?.[1]).toBe('{"qty":3}');
  });

  it("lets concurrent calls each fall back from the shape they tried", async () => {
    vi.resetModules();
    const { executeTool: fresh } = await import("./execute"); // module state starts at "object" again
    fakeModelContext(async (_, args) => {
      await new Promise((r) => setTimeout(r, 5));
      if (typeof args !== "string") throw new TypeError("Failed to parse input string as JSON");
      return "ok";
    });
    const results = await Promise.all([fresh("add", { a: 1 }), fresh("add", { a: 2 })]);
    expect(results.map((r) => r?.content[0]?.text)).toEqual(["ok", "ok"]);
  });

  it("does not run a tool cancelled while it was being looked up", async () => {
    const mc = fakeModelContext(async () => "ran");
    const controller = new AbortController();
    mc.getTools = async () => {
      controller.abort();
      return [tool];
    };
    await expect(executeTool("add", {}, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(mc.executeTool).not.toHaveBeenCalled();
  });

  it("does not retry other errors", async () => {
    const mc = fakeModelContext(async () => {
      throw new Error("boom");
    });
    await expect(executeTool("add", {})).rejects.toThrow("boom");
    expect(mc.executeTool).toHaveBeenCalledTimes(1);
  });

  it("resolves null when the call navigated", async () => {
    fakeModelContext(async () => null);
    expect(await executeTool("add", {})).toBeNull();
  });

  it("cancels the tool and rejects with an AbortError on abort", async () => {
    const mc = fakeModelContext(() => new Promise(() => {}));
    const controller = new AbortController();
    const call = executeTool("add", {}, { signal: controller.signal });
    await vi.waitFor(() => expect(mc.executeTool).toHaveBeenCalled());
    controller.abort();
    await expect(call).rejects.toMatchObject({ name: "AbortError" });
    expect(mc.executeTool.mock.calls[0]?.[2]).toEqual({ signal: controller.signal }); // the browser cancels through it
  });
});
