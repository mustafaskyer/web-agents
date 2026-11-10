import { readFileSync } from "node:fs";
import { defineWebTool } from "@webmcp-agents/core";
import { describe, expect, it } from "vitest";
import { defineWebAgent, selectTools } from "../src/agent";
import type { ToolDescriptor } from "../src/types";

const t = (name: string): ToolDescriptor => ({ name, description: name, inputSchema: { type: "object", properties: {} } });

describe("defineWebAgent: tools as tool objects", () => {
  it("takes tools from defineWebTool and ids, mixed, and keeps their ids", () => {
    const getCart = defineWebTool({ id: "get_cart", description: "Read the cart.", execute: () => "[]" });
    const agent = defineWebAgent({ id: "shopper", instructions: "Shop.", tools: [getCart, "list_orders"] });
    expect(agent.tools).toEqual(["get_cart", "list_orders"]);
    expect(Object.isFrozen(agent.tools)).toBe(true);
    expect(selectTools(agent, [t("list_orders"), t("checkout"), t("get_cart")]).map((x) => x.name)).toEqual(["list_orders", "get_cart"]);
  });

  it("refuses an entry that is neither", () => {
    expect(() => defineWebAgent({ id: "a", instructions: "x", tools: [42 as never] })).toThrow(/tool id or a tool from defineWebTool/);
    expect(() => defineWebAgent({ id: "a", instructions: "x", tools: [null as never] })).toThrow(TypeError);
  });
});

describe("agent.invoke on the server", () => {
  it("rejects with a clear error: there is no page to run tools on", async () => {
    const agent = defineWebAgent({ id: "shopper", instructions: "Shop." });
    expect(typeof agent.invoke).toBe("function");
    await expect(agent.invoke("Reorder")).rejects.toThrow(/shopper\.invoke\(\) runs in the browser.*createChatHandler/);
  });

  it("agent.ts imports nothing at runtime but the browser loop, on demand", () => {
    const source = readFileSync(new URL("../src/agent.ts", import.meta.url), "utf8");
    const statics = source.match(/^import .*$/gm) ?? [];
    expect(statics.every((line) => line.startsWith("import type "))).toBe(true);
    expect(source.match(/import\("[^"]+"\)/g)).toEqual(['import("./session/run-agent")']);
  });
});
