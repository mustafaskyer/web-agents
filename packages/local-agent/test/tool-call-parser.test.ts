import { describe, expect, it } from "vitest";
import { createProseFilter, parseToolCalls } from "../src/tool-call-parser";

const names = new Set(["add_to_cart", "apply_promo"]);

describe("parseToolCalls", () => {
  it("reads one and two Qwen <tool_call> blocks, keeping the prose", () => {
    expect(parseToolCalls('<tool_call>{"name":"add_to_cart","arguments":{"qty":2}}</tool_call>', names)).toEqual({
      text: "",
      calls: [{ name: "add_to_cart", arguments: { qty: 2 } }],
      errors: [],
    });
    const two = parseToolCalls(
      'Sure. <tool_call>{"name":"add_to_cart","arguments":{"qty":1}}</tool_call>\n<tool_call>{"name":"apply_promo","arguments":{"code":"X"}}</tool_call>',
      names,
    );
    expect(two.text).toBe("Sure.");
    expect(two.calls.map((c) => c.name)).toEqual(["add_to_cart", "apply_promo"]);
  });

  it("strips <think>, also when unterminated", () => {
    expect(parseToolCalls("<think>hmm</think>Hello", names).text).toBe("Hello");
    expect(parseToolCalls("Hi <think>still thinking", names).text).toBe("Hi");
  });

  it("reads fenced JSON, the Prompt API shapes, and string arguments", () => {
    expect(parseToolCalls('Here:\n```json\n{"name":"apply_promo","arguments":{"code":"A"}}\n```', names)).toMatchObject({
      text: "Here:",
      calls: [{ name: "apply_promo", arguments: { code: "A" } }],
    });
    expect(parseToolCalls('{"type":"tool_call","name":"add_to_cart","arguments":"{\\"qty\\":3}"}', names).calls).toEqual([
      { name: "add_to_cart", arguments: { qty: 3 } },
    ]);
    expect(parseToolCalls('{"type":"message","text":"Done."}', names)).toEqual({ text: "Done.", calls: [], errors: [] });
  });

  it("repairs trailing commas once, rejects unknown tools, and keeps garbage as text", () => {
    expect(parseToolCalls('<tool_call>{"name":"add_to_cart","arguments":{"qty":1,},}</tool_call>', names).calls).toHaveLength(1);
    const unknown = parseToolCalls('<tool_call>{"name":"drop_tables","arguments":{}}</tool_call>', names);
    expect(unknown.calls).toEqual([]);
    expect(unknown.errors[0]).toBe('Unknown tool "drop_tables". Available: add_to_cart, apply_promo.');
    expect(parseToolCalls("just {some} text", names)).toEqual({ text: "just {some} text", calls: [], errors: [] });
    expect(parseToolCalls("<tool_call>not json</tool_call>", names).errors[0]).toMatch(/Couldn't read a tool call/);
  });

  it("caps huge input at 32 KB", () => {
    expect(parseToolCalls("x".repeat(40_000), names).text).toHaveLength(32 * 1024);
  });
});

describe("createProseFilter", () => {
  it("never emits tool-call or think markup, even split across tokens", () => {
    const f = createProseFilter();
    const tokens = ["Sure", ", adding. <", "tool_", 'call>{"name":', '"x"}</tool', "_call> <th", "ink>no</think>Done", " <b>ok</b>"];
    const out = tokens.map((t) => f.push(t)).join("") + f.flush();
    expect(out).toBe("Sure, adding.  Done <b>ok</b>");
  });
});
