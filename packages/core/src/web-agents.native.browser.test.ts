/**
 * A browser with native WebMCP, stood in for by a minimal document.modelContext defined before anything runs:
 * createWebAgents registers at once and never requests the polyfill's chunk.
 */
import { afterAll, describe, expect, it } from "vitest";
import { loadWebMCPPolyfill, whenModelContext } from "./model-context";
import { createWebAgents } from "./web-agents";
import { defineWebTool } from "./web-tool";

const registered = new Map<string, ModelContextTool>();
const native = Object.assign(new EventTarget(), {
  registerTool(tool: ModelContextTool) {
    registered.set(tool.name, tool);
  },
  unregisterTool(name: string) {
    registered.delete(name);
  },
  async getTools() {
    return [...registered.values()];
  },
  async executeTool() {
    return { content: [] };
  },
}) as unknown as ModelContext;
Object.defineProperty(document, "modelContext", { value: native, configurable: true });

describe("createWebAgents with native WebMCP", () => {
  afterAll(() => {
    delete (document as { modelContext?: ModelContext }).modelContext;
  });

  it("registers at once and loads nothing", async () => {
    const agents = createWebAgents({
      tools: { now: defineWebTool({ id: "native_tool", description: "test tool", execute: () => "ok" }) },
      visuals: false,
    });
    expect([...registered.keys()]).toContain("native_tool"); // synchronously: nothing to wait for
    await expect(loadWebMCPPolyfill()).resolves.toBe(native);
    let seen: ModelContext | undefined;
    whenModelContext((mc) => {
      seen = mc;
    });
    expect(seen).toBe(native); // called right away
    await new Promise((r) => setTimeout(r, 100));
    const fetched = performance.getEntriesByType("resource").some((entry) => /\/polyfill\//.test(entry.name));
    expect(fetched).toBe(false);
    agents.destroy();
  });
});
