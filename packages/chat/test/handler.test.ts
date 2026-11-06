import { describe, expect, it } from "vitest";
import { createChatHandler } from "../src/server/handler";
import { DEFAULT_SYSTEM_PROMPT } from "../src/server/system-prompt";
import { LIMITS } from "../src/shared";
import type { AgentMessage } from "../src/types";
import { scriptedModel } from "./mock-model";

const user: AgentMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Add a mug" }] };
const tool = {
  name: "add_to_cart",
  description: "Add to cart",
  inputSchema: { $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties: { qty: { type: "number" } } },
};
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("createChatHandler", () => {
  it("GET reports whether chat is configured", async () => {
    const off = await createChatHandler({ env: {} })(new Request("http://localhost/api/chat"));
    expect(await off.json()).toEqual({ enabled: false, model: "claude-opus-5-5" });
    const on = await createChatHandler({ env: { ANTHROPIC_API_KEY: "k", WEB_AGENTS_MODEL: "claude-sonnet-5-5" } })(
      new Request("http://localhost/api/chat"),
    );
    expect(await on.json()).toEqual({ enabled: true, model: "claude-sonnet-5-5" });
    const instance = await createChatHandler({ model: scriptedModel([{ text: "hi" }]), env: {} })(new Request("http://localhost/api/chat"));
    expect((await instance.json()).enabled).toBe(true);
  });

  it("POST without a key is 503 chat_disabled; other methods 405; OPTIONS 204", async () => {
    const handler = createChatHandler({ env: {} });
    const res = await handler(post({ messages: [user], tools: [] }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("chat_disabled");
    expect((await handler(new Request("http://localhost/api/chat", { method: "PUT" }))).status).toBe(405);
    expect((await handler(new Request("http://localhost/api/chat", { method: "OPTIONS" }))).status).toBe(204);
  });

  it.each([
    ["49 tools", { tools: Array.from({ length: 49 }, (_, i) => ({ ...tool, name: `t${i}` })) }],
    ["a bad tool name", { tools: [{ ...tool, name: "bad name" }] }],
    ["a schema over 8 KB", { tools: [{ ...tool, inputSchema: { type: "object", description: "x".repeat(9000) } }] }],
    ["duplicate tool names", { tools: [tool, tool] }],
    ["no messages", { messages: [] }],
  ])("POST rejects %s with 400", async (_, patch) => {
    const handler = createChatHandler({ model: scriptedModel([{ text: "hi" }]) });
    const res = await handler(post({ messages: [user], tools: [tool], ...patch }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_request");
  });

  it("rejects oversized bodies (counted in bytes, also when chunked), non-JSON and other content types", async () => {
    const handler = createChatHandler({ model: scriptedModel([{ text: "hi" }]) });
    expect((await handler(post("x".repeat(LIMITS.bodyBytes + 1)))).status).toBe(413);
    const emoji = "😀".repeat(LIMITS.bodyBytes / 4 + 1); // under the limit in UTF-16 units, over it in bytes
    expect((await handler(post(emoji))).status).toBe(413);
    const chunked = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array(64 * 1024)); // never ends: must be cut off at the cap
      },
    });
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: chunked,
      duplex: "half",
    } as RequestInit);
    expect((await handler(req)).status).toBe(413);
    expect((await handler(post("{nope"))).status).toBe(400);
    expect((await handler(post("{}", { "content-type": "text/plain" }))).status).toBe(415);
  });

  it("refuses cross-site browser requests (CSRF), allows same-origin and Origin-less ones", async () => {
    const handler = createChatHandler({ model: scriptedModel([{ text: "hi" }]) });
    const body = { messages: [user], tools: [] };
    expect((await handler(post(body, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await handler(post(body, { origin: "http://localhost" }))).status).toBe(200);
    expect((await handler(post(body))).status).toBe(200);
  });

  it("guard short-circuits", async () => {
    const handler = createChatHandler({ model: scriptedModel([{ text: "hi" }]), guard: () => new Response(null, { status: 429 }) });
    expect((await handler(post({ messages: [user], tools: [] }))).status).toBe(429);
  });

  it("streams a UI message stream; the model gets the system prompt, clean schemas, the output cap and no tool executes", async () => {
    const model = scriptedModel([{ text: "Done." }]);
    const res = await createChatHandler({ model })(
      post({ messages: [user], tools: [tool], page: { title: "Shop", url: "http://localhost/cart" } }, { origin: "http://localhost" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(await res.text()).toContain('"delta":"Done."');
    const call = model.doStreamCalls[0]!;
    expect(call.maxOutputTokens).toBe(8192);
    const system = call.prompt.find((m) => m.role === "system");
    expect(system?.content).toContain(DEFAULT_SYSTEM_PROMPT.slice(0, 40));
    expect(system?.content).toContain('The user is on the page "/cart" of this site.');
    expect(system?.content).not.toContain("ignore");
    const [t] = call.tools ?? [];
    expect(t).toMatchObject({ name: "add_to_cart", description: "Add to cart" });
    expect(JSON.stringify(t)).not.toContain("$schema");
  });

  it("drops a page URL from another origin", async () => {
    const model = scriptedModel([{ text: "ok" }]);
    const res = await createChatHandler({ model })(
      post({ messages: [user], tools: [], page: { url: "https://evil.example/x" } }, { origin: "http://localhost" }),
    );
    await res.text(); // the model runs as the body streams
    expect(JSON.stringify(model.doStreamCalls[0]!.prompt)).not.toContain("The user is on the page");
  });

  it("after maxSteps tool steps in a turn, the model gets no tools", async () => {
    const step = (i: number): AgentMessage => ({
      id: `a${i}`,
      role: "assistant",
      parts: [
        {
          type: "tool",
          id: `c${i}`,
          name: "add_to_cart",
          input: { qty: 1 },
          state: "done",
          output: { content: [{ type: "text", text: "ok" }] },
        },
      ],
    });
    const model = scriptedModel([{ text: "Summary" }]);
    await (await createChatHandler({ model, maxSteps: 2 })(post({ messages: [user, step(1), step(2)], tools: [tool] }))).text();
    expect(model.doStreamCalls[0]!.tools ?? []).toHaveLength(0);
  });
});
