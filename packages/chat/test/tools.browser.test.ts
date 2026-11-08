import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { callModelContextTool, listToolDescriptors, NAVIGATED } from "../src/tools";
import { cleanupFixtures, echoForm, modelContext, uniqueName, until } from "./browser-utils";

describe("page tools for an agent", () => {
  let mc: ModelContext;
  beforeAll(() => {
    mc = modelContext();
  });
  afterEach(cleanupFixtures);

  it("lists declarative and imperative tools with object schemas", async () => {
    const form = uniqueName("echo");
    const imperative = uniqueName("ping");
    echoForm(form);
    mc.registerTool({ name: imperative, description: "Ping", inputSchema: { type: "object", properties: {} }, execute: () => "pong" });
    await until(() => true);
    const tools = await listToolDescriptors();
    expect(tools.find((t) => t.name === form)).toMatchObject({
      description: "Echo a word back. Second sentence.",
      inputSchema: { type: "object" },
    });
    expect(tools.find((t) => t.name === imperative)).toMatchObject({ description: "Ping" });
    mc.unregisterTool!(imperative);
  });

  it("returns normalized output, marks Error: answers and throws as isError", async () => {
    const name = uniqueName("echo");
    echoForm(name);
    await until(() => true);
    expect(await callModelContextTool({ name, input: { word: "hi" } })).toEqual({ content: [{ type: "text", text: "ok: hi" }] });

    const failing = uniqueName("echo");
    echoForm(failing, { prefix: "Error: no " });
    await until(() => true);
    expect(await callModelContextTool({ name: failing, input: { word: "hi" } })).toMatchObject({ isError: true });

    const thrower = uniqueName("boom");
    mc.registerTool({
      name: thrower,
      description: "Boom",
      execute: () => {
        throw new Error("kaput");
      },
    });
    expect(await callModelContextTool({ name: thrower, input: {} })).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining("kaput") }],
    });
    expect(await callModelContextTool({ name: uniqueName("missing"), input: {} })).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining("not available on this page") }],
    });
    mc.unregisterTool!(thrower);
  });

  it("an abort cancels the tool and answers Cancelled", async () => {
    const name = uniqueName("slow");
    let toolSignal: AbortSignal | undefined;
    mc.registerTool({
      name,
      description: "Slow",
      execute: (_args, { signal }) => {
        toolSignal = signal;
        return new Promise(() => {});
      },
    });
    const ctrl = new AbortController();
    const pending = callModelContextTool({ name, input: {} }, { signal: ctrl.signal });
    await new Promise((r) => setTimeout(r, 20));
    ctrl.abort();
    expect(await pending).toEqual({ content: [{ type: "text", text: "Cancelled by the user." }], isError: true });
    expect(toolSignal?.aborted).toBe(true); // cancelled through executeTool's signal, as in Chrome
    mc.unregisterTool!(name);
  });

  it("a call that navigated (null) says so", async () => {
    const name = uniqueName("nav");
    mc.registerTool({ name, description: "Nav", execute: () => "x" });
    const exec = vi.spyOn(mc, "executeTool").mockResolvedValueOnce(null as never);
    expect(await callModelContextTool({ name, input: {} })).toEqual({ content: [{ type: "text", text: NAVIGATED }] });
    exec.mockRestore();
    mc.unregisterTool!(name);
  });
});
