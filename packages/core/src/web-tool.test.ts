import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { toolErrorCode } from "./result";
import { defineWebTool, toModelContextTool, WebToolInputError } from "./web-tool";

const ctx = () => ({ signal: new AbortController().signal, source: "test" as const });

const addToCart = () =>
  defineWebTool({
    id: "add_to_cart",
    description: "Add to cart",
    inputSchema: z.object({ sku: z.string(), qty: z.number().int().min(1) }),
    execute: ({ sku, qty }) => `Added ${qty} × ${sku}`,
  });

afterEach(() => vi.restoreAllMocks());

describe("defineWebTool", () => {
  it("derives a draft-07 object JSON Schema from zod, without $schema", () => {
    const schema = addToCart().jsonSchema as { type: string; properties: Record<string, { type: string }>; $schema?: string };
    expect(schema.type).toBe("object");
    expect(schema.properties.qty.type).toBe("integer");
    expect(schema.properties.sku.type).toBe("string");
    expect(schema.$schema).toBeUndefined();
  });

  it("passes a plain JSON Schema through (minus $schema) and defaults type to object", () => {
    const input = { $schema: "http://json-schema.org/draft-07/schema#", properties: { q: { type: "string" } } };
    const tool = defineWebTool({ id: "search", description: "Search", inputSchema: input, execute: () => "ok" });
    expect(tool.jsonSchema).toEqual({ type: "object", properties: { q: { type: "string" } } });
    expect(input.$schema).toBeDefined(); // not mutated
  });

  it("describes no input as an empty object schema", () => {
    expect(defineWebTool({ id: "noop", description: "d", execute: () => {} }).jsonSchema).toEqual({ type: "object", properties: {} });
  });

  it("rejects a non-object schema", () => {
    const tool = defineWebTool({ id: "bad", description: "d", inputSchema: z.string() as never, execute: () => {} });
    expect(() => tool.jsonSchema).toThrow(/must describe an object/);
  });

  it("explains how to fix a schema without Standard JSON Schema", () => {
    const schema = { "~standard": { version: 1, vendor: "x", validate: (value: unknown) => ({ value }) } };
    const tool = defineWebTool({ id: "legacy", description: "d", inputSchema: schema as never, execute: () => {} });
    expect(() => tool.jsonSchema).toThrow(/z\.toJSONSchema/);
  });

  it.each(["", "has space", "a/b", "x".repeat(129)])("rejects the id %j", (id) => {
    expect(() => defineWebTool({ id, description: "d", execute: () => {} })).toThrow(TypeError);
  });

  it("computes jsonSchema once", () => {
    const input = vi.fn(() => ({ type: "object", properties: {} }));
    const schema = {
      "~standard": { version: 1, vendor: "x", validate: (value: unknown) => ({ value }), jsonSchema: { input, output: input } },
    };
    const tool = defineWebTool({ id: "memo", description: "d", inputSchema: schema as never, execute: () => {} });
    expect(input).not.toHaveBeenCalled(); // lazy
    void tool.jsonSchema;
    void tool.jsonSchema;
    expect(input).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenCalledWith({ target: "draft-07" });
  });

  it("run() validates and rejects with a WebToolInputError naming the field", async () => {
    const err = await addToCart()
      .run({ sku: "mug", qty: "x" }, ctx())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WebToolInputError);
    expect((err as Error).message).toMatch(/^Invalid input for add_to_cart: qty: /);
  });

  it("run() executes with the parsed value", async () => {
    await expect(addToCart().run({ sku: "mug", qty: 2 }, ctx())).resolves.toBe("Added 2 × mug");
  });

  it("warns (never throws) when the output doesn't match outputSchema", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tool = defineWebTool({ id: "out", description: "d", outputSchema: z.number(), execute: () => "nope" as never });
    await expect(tool.run({}, ctx())).resolves.toBe("nope");
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("toModelContextTool", () => {
  it("maps the WebTool to a WebMCP tool", () => {
    const mc = toModelContextTool(addToCart());
    expect(mc.name).toBe("add_to_cart");
    expect(mc.description).toBe("Add to cart");
    expect((mc.inputSchema as { type: string }).type).toBe("object");
  });

  it("resolves invalid input to an isError result instead of throwing", async () => {
    const res = (await toModelContextTool(addToCart()).execute({ sku: "mug", qty: "x" }, ctx())) as ModelContextToolResult;
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("qty");
  });

  it("turns a thrown error into an isError result with a code", async () => {
    const tool = defineWebTool({
      id: "boom",
      description: "d",
      execute: () => {
        throw new Error("Out of stock");
      },
    });
    await expect(toModelContextTool(tool).execute({}, ctx())).resolves.toEqual({
      content: [{ type: "text", text: "Error [failed]: Out of stock" }],
      isError: true,
      structuredContent: { error: { code: "failed", retryable: false } },
    });
  });

  it("codes invalid input as invalid_input, so the agent fixes its arguments", async () => {
    const tool = addToCart();
    const result = (await toModelContextTool(tool).execute({ sku: "mug", qty: 0 }, ctx())) as ModelContextToolResult;
    expect(toolErrorCode(result)).toBe("invalid_input");
    expect(result.content[0]?.text).toMatch(/^Error \[invalid_input\]: Invalid input for add_to_cart: .*qty/);
  });

  it("rejects with the AbortError when the call is cancelled", async () => {
    const ac = new AbortController();
    const tool = defineWebTool({
      id: "slow",
      description: "d",
      execute: (_input, { signal }) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")))),
    });
    const pending = toModelContextTool(tool).execute({}, { signal: ac.signal });
    ac.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("parses Chrome 150's JSON-string arguments", async () => {
    const res = await toModelContextTool(addToCart()).execute('{"sku":"mug","qty":3}' as never, ctx());
    expect(res).toEqual({ content: [{ type: "text", text: "Added 3 × mug" }] });
  });

  it("rejects invalid input before asking the user to confirm", async () => {
    // No DOM in Node: reaching the confirmation gate would throw on `document`, not return the input error.
    const tool = defineWebTool({
      id: "danger",
      description: "d",
      requireConfirmation: true,
      inputSchema: z.object({ n: z.number() }),
      execute: () => "ran",
    });
    const res = (await toModelContextTool(tool).execute({ n: "x" }, ctx())) as ModelContextToolResult;
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Invalid input for danger: n:");
  });

  it("passes the context getter's value to execute", async () => {
    const tool = defineWebTool({ id: "ctx", description: "d", execute: (_i, c) => c.context as string });
    const res = await toModelContextTool(tool, { context: () => "state" }).execute({}, ctx());
    expect(res).toEqual({ content: [{ type: "text", text: "state" }] });
  });

  it("a function target picks the element per call, from the arguments (a JSON string too), and falls back on a throw", () => {
    const tool = defineWebTool({
      id: "pick_row",
      description: "Pick a row",
      target: (input: { id?: string }) => (input.id ? `[data-row="${input.id}"]` : undefined),
      execute: () => "ok",
    });
    const pick = (toModelContextTool(tool) as unknown as Record<symbol, (a: unknown) => string | undefined>)[
      Symbol.for("web-agents.target")
    ]!;
    expect(pick({ id: "a1" })).toBe('[data-row="a1"]');
    expect(pick('{"id":"b2"}')).toBe('[data-row="b2"]');
    expect(pick({})).toBeUndefined();
    expect(pick("not json")).toBeUndefined();
    vi.stubGlobal("document", {
      querySelector: (s: string) => {
        if (s.includes("]]")) throw new SyntaxError("bad");
        return null;
      },
    });
    expect(pick({ id: "x]]" })).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
