/**
 * The page starts without document.modelContext (Playwright's Chromium has no WebMCP), as in Firefox or Safari.
 * Nothing here imports the polyfill: createWebAgents loads it. The tests share one page and run in order.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { type AgentEvent, onAgentEvent } from "./events";
import { loadWebMCPPolyfill, whenModelContext } from "./model-context";
import { createWebAgents } from "./web-agents";
import { defineWebTool, registerWebTool } from "./web-tool";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tool = (id: string) => defineWebTool({ id, description: "test tool", readOnly: true, execute: () => `${id} ran` });
const names = async (): Promise<string[]> => ((await document.modelContext?.getTools()) ?? []).map((t) => t.name);
/** The polyfill's module was requested (Vite serves it as its own file, like a production chunk). */
const polyfillFetched = (): boolean =>
  performance.getEntriesByType("resource").some((entry) => /\/polyfill\/index\.[tj]s/.test(entry.name));

async function until(check: () => boolean | Promise<boolean>, label: string, timeout = 3000): Promise<void> {
  const started = performance.now();
  while (!(await check())) {
    if (performance.now() - started > timeout) throw new Error(`Timed out waiting for ${label}`);
    await sleep(10);
  }
}

describe("createWebAgents without native WebMCP", () => {
  const cleanup: Array<() => void> = [];
  afterAll(() => {
    for (const undo of cleanup) undo();
  });

  it("with polyfill: false loads nothing, and a tool warns once and is not registered", async () => {
    expect(document.modelContext).toBeUndefined();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const agents = createWebAgents({ tools: { off: tool("off_tool") }, polyfill: false, visuals: false });
    cleanup.push(() => agents.destroy());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("document.modelContext is unavailable"));
    warn.mockRestore();
    await sleep(100);
    expect(document.modelContext).toBeUndefined();
    expect(polyfillFetched()).toBe(false);
    agents.destroy();
  });

  it('with "auto" loads the polyfill, installs the cursor first, and registers the tools that waited for it', async () => {
    const events: AgentEvent[] = [];
    cleanup.push(onAgentEvent((e) => events.push(e)));
    const seen: ModelContext[] = [];
    cleanup.push(whenModelContext((mc) => seen.push(mc))); // devtools and the chat wait like this

    const early = tool("early_tool");
    const agents = createWebAgents({ tools: { early } });
    cleanup.push(() => agents.destroy());
    // Still loading: these wait instead of being dropped.
    expect(document.modelContext).toBeUndefined();
    const warn = vi.spyOn(console, "warn");
    const unregisterLater = registerWebTool(tool("registered_meanwhile"));
    const unregisterNow = registerWebTool(tool("released_meanwhile"));
    unregisterNow(); // released before the polyfill arrived: never registers
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    cleanup.push(unregisterLater);

    await until(() => !!document.modelContext, "document.modelContext");
    expect(polyfillFetched()).toBe(true);
    expect(seen).toEqual([document.modelContext]);
    await until(async () => (await names()).includes("registered_meanwhile"), "the waiting tools");
    expect(await names()).toEqual(expect.arrayContaining(["early_tool", "registered_meanwhile"]));
    expect(await names()).not.toContain("released_meanwhile");

    // The cursor was installed once document.modelContext existed and before the tool registered: it sees the call.
    await expect(early.invoke({})).resolves.toBe("early_tool ran");
    expect(events.map((e) => e.type)).toContain("start");
  });

  it("loads the polyfill once: later calls resolve to the same document.modelContext", async () => {
    const mc = document.modelContext;
    await expect(loadWebMCPPolyfill()).resolves.toBe(mc);
    const late = registerWebTool(tool("late_tool")); // the polyfill is here: registers at once
    cleanup.push(late);
    expect(await names()).toContain("late_tool");
  });
});
