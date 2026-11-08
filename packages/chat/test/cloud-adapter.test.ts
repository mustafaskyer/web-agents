import { describe, expect, it, vi } from "vitest";
import { createCloudAdapter } from "../src/adapter/cloud";
import { createChatHandler } from "../src/server/handler";
import type { AgentMessage, AgentRunRequest, AgentStreamPart, ToolDescriptor } from "../src/types";
import { scriptedModel, type Step } from "./mock-model";

const user: AgentMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Add two mugs" }] };
const tools: ToolDescriptor[] = [
  { name: "add_to_cart", description: "Add", inputSchema: { type: "object", properties: { qty: { type: "number" } } } },
];

/** The adapter wired to the real handler, through an in-memory fetch. */
function setup(steps: Step[], opts: { maxSteps?: number } = {}) {
  const model = scriptedModel(steps);
  const handler = createChatHandler({ model, maxSteps: opts.maxSteps });
  const bodies: { messages: AgentMessage[]; tools: ToolDescriptor[] }[] = [];
  const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") bodies.push(JSON.parse(String(init.body)));
    return handler(new Request(new URL(String(url), "http://x"), init));
  });
  const adapter = createCloudAdapter({ fetch, ...opts });
  return { adapter, fetch, bodies, model };
}

async function collect(adapter: ReturnType<typeof createCloudAdapter>, req: Partial<AgentRunRequest> = {}) {
  const parts: AgentStreamPart[] = [];
  const callTool = vi.fn(async () => ({ content: [{ type: "text", text: "Added 2 × Mug." }] }));
  for await (const p of adapter.run({ messages: [user], tools, signal: new AbortController().signal, callTool, ...req })) parts.push(p);
  return { parts, callTool };
}

describe("createCloudAdapter", () => {
  it("runs the model ↔ tool loop against the real handler", async () => {
    const { adapter, bodies } = setup([{ calls: [{ id: "c1", name: "add_to_cart", input: { qty: 2 } }] }, { text: "Done: 2 mugs." }]);
    const { parts, callTool } = await collect(adapter);
    expect(parts.map((p) => p.type)).toEqual([
      "message-start",
      "tool-call",
      "tool-result",
      "step-finish",
      "message-start",
      "text-delta",
      "text-delta",
      "text-delta",
      "finish",
    ]);
    expect(parts.at(-1)).toEqual({ type: "finish", reason: "stop" });
    expect(callTool).toHaveBeenCalledWith({
      type: "tool-call",
      messageId: expect.any(String),
      id: "c1",
      name: "add_to_cart",
      input: { qty: 2 },
    });
    // the second request carries the tool's output
    const second = bodies[1]!.messages;
    expect(second).toHaveLength(2);
    expect(second[1]!.parts[0]).toMatchObject({ type: "tool", id: "c1", state: "done", output: { content: [{ text: "Added 2 × Mug." }] } });
  });

  it("reads the tools fresh for every step", async () => {
    const { adapter, bodies } = setup([{ calls: [{ id: "c1", name: "add_to_cart", input: { qty: 1 } }] }, { text: "ok" }]);
    let current = tools;
    const req: AgentRunRequest = {
      messages: [user],
      signal: new AbortController().signal,
      get tools() {
        return current;
      },
      callTool: async () => {
        current = []; // the tool hid itself
        return { content: [{ type: "text", text: "ok" }] };
      },
    };
    for await (const _ of adapter.run(req)); // a spread would read the getter once
    expect(bodies.map((b) => b.tools.length)).toEqual([1, 0]);
  });

  it("after maxSteps tool steps, one more request (with no tools) lets the model sum up", async () => {
    const steps = [1, 2].map((i) => ({ calls: [{ id: `c${i}`, name: "add_to_cart", input: { qty: i } }] }));
    const { adapter, bodies, model } = setup([...steps, { text: "Added 3 mugs in two steps." }], { maxSteps: 2 });
    const { parts, callTool } = await collect(adapter);
    expect(callTool).toHaveBeenCalledTimes(2);
    expect(bodies).toHaveLength(3);
    expect(model.doStreamCalls[2]!.tools ?? []).toHaveLength(0);
    expect(parts.at(-1)).toEqual({ type: "finish", reason: "stop" });
  });

  it("records tool outputs truncated, so every request repeats the previous one's prefix", async () => {
    const { adapter, bodies } = setup([{ calls: [{ id: "c1", name: "add_to_cart", input: { qty: 1 } }] }, { text: "ok" }]);
    const long = "x".repeat(10_000);
    const { parts } = await collect(adapter, { callTool: async () => ({ content: [{ type: "text", text: long }] }) });
    const sent = JSON.stringify(bodies[1]!.messages);
    expect(sent).toContain("…(truncated)");
    expect(sent).not.toContain(long);
    expect(JSON.stringify(parts.find((p) => p.type === "tool-result"))).toContain("…(truncated)");
  });

  it("an abort during a tool call finishes as aborted, with no further request", async () => {
    const { adapter, fetch } = setup([{ calls: [{ id: "c1", name: "add_to_cart", input: { qty: 1 } }] }, { text: "never" }]);
    const ctrl = new AbortController();
    const { parts } = await collect(adapter, {
      signal: ctrl.signal,
      callTool: async () => {
        ctrl.abort();
        return { content: [{ type: "text", text: "Error [cancelled]: Cancelled by the user." }], isError: true };
      },
    });
    expect(parts.at(-1)).toEqual({ type: "finish", reason: "aborted" });
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("maps HTTP errors to codes", async () => {
    for (const [status, code] of [
      [429, "rate_limited"],
      [503, "chat_disabled"],
      [400, "bad_request"],
    ] as const) {
      const body = status === 503 ? '{"error":"chat_disabled"}' : "{}";
      const adapter = createCloudAdapter({ fetch: async () => new Response(body, { status }) });
      const { parts } = await collect(adapter);
      expect(parts).toEqual([expect.objectContaining({ type: "error", code })]);
    }
    const offline = createCloudAdapter({
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    expect((await collect(offline)).parts).toEqual([expect.objectContaining({ type: "error", code: "network" })]);
  });

  it("a budget or a busy store is a passing error; only chat_disabled turns the chat off", async () => {
    const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
      createCloudAdapter({ fetch: async () => new Response(JSON.stringify(body), { status, headers }) });
    const budget = respond(503, { error: "unavailable", reason: "daily_budget" });
    expect((await collect(budget)).parts[0]).toMatchObject({
      type: "error",
      code: "rate_limited",
      error: expect.stringMatching(/daily limit/),
    });
    expect(budget.status!()).toEqual({ state: "loading" });
    const busy = respond(503, { error: "unavailable", reason: "busy" });
    expect((await collect(busy)).parts[0]).toMatchObject({ error: expect.stringMatching(/busy/) });
    const off = respond(503, { error: "chat_disabled" });
    expect((await collect(off)).parts[0]).toMatchObject({ code: "chat_disabled" });
    expect(off.status!()).toMatchObject({ state: "unavailable" });
    const daily = respond(429, { error: "rate_limited" }, { "retry-after": "40000" });
    expect((await collect(daily)).parts[0]).toMatchObject({ error: expect.stringMatching(/today's limit/) });
  });

  it("status comes from one GET", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ enabled: false }), { status: 200 }));
    const adapter = createCloudAdapter({ fetch });
    vi.stubGlobal("window", {});
    const changed = new Promise<void>((r) => adapter.subscribe!(r));
    expect(adapter.status!()).toEqual({ state: "loading" });
    await changed;
    expect(adapter.status!()).toMatchObject({ state: "unavailable" });
    adapter.status!();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
