import type { AgentMessage, AgentRunRequest, AgentStreamPart, ToolDescriptor } from "@web-agents/chat";
import { describe, expect, it, vi } from "vitest";
import { runLocalAgent } from "../src/loop";
import type { GenerateRequest, LocalProvider } from "../src/types";

const user: AgentMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "add 2 mugs" }] };
const tools: ToolDescriptor[] = [
  {
    name: "add_to_cart",
    description: "Add mugs",
    inputSchema: { type: "object", required: ["qty"], properties: { qty: { type: "integer", minimum: 1 } } },
  },
];

/** A provider that replies with `scripts` in order, streaming each word as a token. */
function fake(scripts: (string | ((req: GenerateRequest) => Promise<string>))[]): LocalProvider & { requests: GenerateRequest[] } {
  const requests: GenerateRequest[] = [];
  let i = 0;
  return {
    id: "fake",
    label: "Fake",
    requests,
    availability: async () => ({ state: "available" }),
    prepare: async () => {},
    async generate(req) {
      requests.push(structuredClone({ ...req, signal: undefined, onToken: undefined }) as unknown as GenerateRequest);
      const s = scripts[Math.min(i++, scripts.length - 1)]!;
      const text = typeof s === "string" ? s : await s(req);
      for (const token of text.split(/(?=[ <])/)) req.onToken?.(token);
      return { text };
    },
  };
}

async function run(provider: LocalProvider, over: Partial<AgentRunRequest> = {}, opts = {}) {
  const parts: AgentStreamPart[] = [];
  const callTool = vi.fn(async () => ({ content: [{ type: "text", text: "Added 2 mugs." }] }));
  for await (const p of runLocalAgent(provider, { messages: [user], tools, signal: new AbortController().signal, callTool, ...over }, opts))
    parts.push(p);
  return { parts, callTool, types: parts.map((p) => p.type) };
}

describe("runLocalAgent", () => {
  it("text only: message-start, text deltas, finish(stop)", async () => {
    const { types, parts } = await run(fake(["Hello there."]));
    expect(types[0]).toBe("message-start");
    expect(types.at(-1)).toBe("finish");
    expect(
      parts
        .filter((p) => p.type === "text-delta")
        .map((p) => (p as { delta: string }).delta)
        .join(""),
    ).toBe("Hello there.");
  });

  it("tool → result → text, never streaming the tool-call markup", async () => {
    const provider = fake(['On it. <tool_call>{"name":"add_to_cart","arguments":{"qty":2}}</tool_call>', "Done: 2 mugs."]);
    const { types, parts, callTool } = await run(provider);
    expect(types).toEqual(expect.arrayContaining(["tool-call", "tool-result", "step-finish"]));
    expect(callTool).toHaveBeenCalledWith(expect.objectContaining({ name: "add_to_cart", input: { qty: 2 } }));
    const text = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as { delta: string }).delta)
      .join("");
    expect(text).not.toContain("tool_call");
    expect(text).toContain("Done: 2 mugs.");
    // the model saw its call and the result on the second step
    expect(provider.requests[1]!.messages.at(-1)).toEqual({ role: "tool", name: "add_to_cart", content: "Added 2 mugs." });
  });

  it("feeds an invalid call back once; a valid retry runs", async () => {
    const provider = fake([
      '<tool_call>{"name":"add_to_cart","arguments":{"qty":0}}</tool_call>',
      '<tool_call>{"name":"add_to_cart","arguments":{"qty":2}}</tool_call>',
      "Done.",
    ]);
    const { callTool } = await run(provider);
    expect(callTool).toHaveBeenCalledTimes(1);
    expect(provider.requests[1]!.messages.at(-1)!.content).toMatch(/^Error: add_to_cart: "qty" must be at least 1\. Try again\./);
  });

  it("a retry doesn't repeat the first attempt's prose", async () => {
    const provider = fake([
      'Adding them now. <tool_call>{"name":"add_to_cart","arguments":{"qty":0}}</tool_call>',
      'Adding them now. <tool_call>{"name":"add_to_cart","arguments":{"qty":2}}</tool_call>',
      "Done.",
    ]);
    const { parts } = await run(provider);
    const text = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as { delta: string }).delta)
      .join("");
    expect(text.match(/Adding them now\./g)).toHaveLength(1);
  });

  it("two invalid attempts end with an apology", async () => {
    const { parts, callTool } = await run(fake(['<tool_call>{"name":"nope","arguments":{}}</tool_call>']));
    expect(callTool).not.toHaveBeenCalled();
    expect(JSON.stringify(parts)).toContain("couldn't work out how to do that");
    expect(parts.at(-1)).toEqual({ type: "finish", reason: "stop" });
  });

  it("stops at maxSteps, and on the same call repeated", async () => {
    const call = '<tool_call>{"name":"add_to_cart","arguments":{"qty":1}}</tool_call>';
    const max = await run(fake([call, call.replace("1", "2"), call.replace("1", "3")]), {}, { maxSteps: 2 });
    expect(max.parts.at(-1)).toEqual({ type: "finish", reason: "max-steps" });
    const loop = await run(fake([call]), {}, { maxSteps: 6 });
    expect(loop.callTool).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(loop.parts)).toContain("repeating the same action");
  });

  it("an abort finishes as aborted", async () => {
    const ctrl = new AbortController();
    const { parts } = await run(fake(['<tool_call>{"name":"add_to_cart","arguments":{"qty":1}}</tool_call>']), {
      signal: ctrl.signal,
      callTool: async () => {
        ctrl.abort();
        return { content: [{ type: "text", text: "Cancelled by the user." }], isError: true };
      },
    });
    expect(parts.at(-1)).toEqual({ type: "finish", reason: "aborted" });
  });

  it("a step that takes too long is an error", async () => {
    const slow = (req: GenerateRequest) =>
      new Promise<string>((_, reject) => req.signal.addEventListener("abort", () => reject(new DOMException("t", "TimeoutError"))));
    const { parts } = await run(fake([slow]), {}, { stepTimeoutMs: 30 });
    expect(parts.at(-1)).toMatchObject({ type: "error", error: expect.stringMatching(/took too long/) });
  });

  it("a provider that ignores the signal still times out", async () => {
    const deaf = () => new Promise<string>(() => {}); // never settles, never listens
    const { parts } = await run(fake([deaf]), {}, { stepTimeoutMs: 30 });
    expect(parts.at(-1)).toMatchObject({ type: "error", error: expect.stringMatching(/took too long/) });
  });

  it("lists the tools inline for providers without template tools", async () => {
    const provider = fake(["ok"]);
    await run(provider, {}, { toolsInline: true });
    expect(provider.requests[0]!.system).toContain("- add_to_cart: Add mugs");
    expect(provider.requests[0]!.system).toContain('{"type":"tool_call","name":"add_to_cart"');
    expect(provider.requests[0]!.system).not.toContain("<tool_call>");
  });
});
