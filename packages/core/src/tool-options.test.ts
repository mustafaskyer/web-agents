import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createWebAgents, watchPathname } from "./web-agents";
import { defineWebTool, toModelContextTool, type WebTool, webToolSignature } from "./web-tool";

const base = { id: "get_reviews", description: "Read this product's reviews.", execute: () => "ok" };

describe("flags", () => {
  it("become the WebMCP annotation names at registration, `safeResponse` inverted", () => {
    const tool = defineWebTool({ ...base, readOnly: true, destructive: false, repeatable: true, external: true, safeResponse: false });
    expect(toModelContextTool(tool).annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      untrustedContentHint: true,
    });
    expect(toModelContextTool(defineWebTool({ ...base, safeResponse: true })).annotations).toEqual({ untrustedContentHint: false });
  });

  it("merge with `annotations`: a flag wins over the same hint, other hints stay", () => {
    const tool = defineWebTool({ ...base, destructive: true, annotations: { destructiveHint: false, readOnlyHint: true, custom: "x" } });
    expect(toModelContextTool(tool).annotations).toEqual({ destructiveHint: true, readOnlyHint: true, custom: "x" });
  });

  it("leave a tool with neither flags nor annotations without any", () => {
    expect(toModelContextTool(defineWebTool(base)).annotations).toBeUndefined();
  });

  it("are part of the signature (what WebMCP sees); `match`, `fill` and `fields` are not", () => {
    const signature = webToolSignature(defineWebTool(base));
    expect(webToolSignature(defineWebTool({ ...base, readOnly: true }))).not.toBe(signature);
    expect(webToolSignature(defineWebTool({ ...base, annotations: { readOnlyHint: true } }))).toBe(
      webToolSignature(defineWebTool({ ...base, readOnly: true })),
    );
    expect(webToolSignature(defineWebTool({ ...base, match: "/orders" }))).toBe(signature);
    expect(webToolSignature(defineWebTool({ ...base, match: /^\/orders/ }))).toBe(signature);
    expect(webToolSignature(defineWebTool({ ...base, fill: () => {} }))).toBe(signature);
    expect(webToolSignature(defineWebTool({ ...base, fields: { q: "Search" } }))).toBe(signature);
  });
});

describe("the new definition options", () => {
  it("are kept on the defined tool", () => {
    const fill = (): void => {};
    const tool = defineWebTool({
      ...base,
      match: ["/cart", "/checkout"],
      target: { role: "button", name: "Reviews" },
      fields: { q: false },
      fill,
      readOnly: true,
    });
    expect(tool).toMatchObject({
      match: ["/cart", "/checkout"],
      target: { role: "button", name: "Reviews" },
      fields: { q: false },
      readOnly: true,
    });
    expect(tool.fill).toBe(fill);
    expect(Object.isFrozen(tool)).toBe(true);
  });

  it("type `fields`, `fill`, `target` and `invoke` from the input schema", () => {
    const tool = defineWebTool({
      id: "add_to_cart",
      description: "d",
      inputSchema: z.object({ quantity: z.number(), note: z.string().optional() }),
      fields: { quantity: "Quantity", note: false },
      target: ({ quantity }) => ({ role: "button", name: `Add ${quantity}` }),
      fill: (values) => expectTypeOf(values).toEqualTypeOf<{ quantity: number; note?: string | undefined }>(),
      execute: ({ quantity }) => quantity * 2,
    });
    expectTypeOf(tool.invoke).parameter(0).toEqualTypeOf<{ quantity: number; note?: string | undefined }>();
    expectTypeOf(tool.invoke).returns.toEqualTypeOf<Promise<number>>();
    // @ts-expect-error not a parameter of this tool
    defineWebTool({ id: "x", description: "d", inputSchema: z.object({ a: z.string() }), fields: { b: "B" }, execute: () => {} });
    // a tool with no input is invoked with none; a typed tool still fits a mixed catalog
    expectTypeOf(defineWebTool(base).invoke).toBeCallableWith();
    expectTypeOf(tool).toExtend<WebTool>();
    const catalog: readonly WebTool[] = [tool, defineWebTool(base)];
    expect(catalog).toHaveLength(2);
  });
});

// Runs in the node environment: no document, no window, no history.
describe("on the server", () => {
  it("createWebAgents is a no-op that still checks the catalog", () => {
    const tools = { getReviews: defineWebTool(base), other: defineWebTool({ ...base, id: "other", match: "/x" }) };
    const agents = createWebAgents({ tools });
    expect(() => {
      agents.start();
      agents.setAvailableTools([tools.other, "getReviews"]);
      agents.setTools({ only: tools.other });
      agents.setPathname("/x");
      agents.visuals.setSpotlight(true);
      agents.destroy();
    }).not.toThrow();
    expect(agents.registry.enabled()).toEqual([]);
    expect(() => createWebAgents({ tools: { a: tools.other, b: tools.other } })).toThrow(/tools\.a and tools\.b/);
  });

  it("watchPathname listens to nothing", () => {
    expect(() => watchPathname(() => {})()).not.toThrow();
  });

  it("invoke rejects with a clear error", async () => {
    await expect(defineWebTool(base).invoke()).rejects.toThrow(/document\.modelContext is not available/);
  });
});
