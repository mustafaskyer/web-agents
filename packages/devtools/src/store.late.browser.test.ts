/**
 * The devtools may start before document.modelContext exists: an app installs them first, and the provider loads
 * the polyfill a moment later. Nothing here imports the polyfill before the store starts.
 */
import { defineWebTool, loadWebMCPPolyfill, registerWebTool } from "@webmcp-agents/core";
import { describe, expect, it } from "vitest";
import { createDevtoolsStore } from "./store";

async function until(check: () => boolean, label: string, timeout = 3000): Promise<void> {
  const started = performance.now();
  while (!check()) {
    if (performance.now() - started > timeout) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("createDevtoolsStore before document.modelContext", () => {
  it("binds once the polyfill installs it, then lists the tools", async () => {
    expect(document.modelContext).toBeUndefined();
    const store = createDevtoolsStore();
    expect(store.getSnapshot().supported).toBe(false);

    await loadWebMCPPolyfill();
    const off = registerWebTool(defineWebTool({ id: "late_listed", description: "test tool", execute: () => "ok" }));
    await until(() => store.getSnapshot().supported, "supported");
    await until(() => store.getSnapshot().tools.some((t) => t.name === "late_listed"), "the tool listed");
    expect((await window.agent?.list())?.map((t) => t.name)).toContain("late_listed");

    off();
    store.destroy();
  });
});
