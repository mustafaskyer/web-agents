import { describe, expect, it } from "vitest";
import { parsePythonicCalls, toPythonic } from "../src/pythonic";
import { createProseFilter, parseToolCalls } from "../src/tool-call-parser";

describe("pythonic calls (Liquid LFM2)", () => {
  it("reads a call list with every value kind", () => {
    expect(
      parsePythonicCalls(
        `[open_product(slug="trail-cap"), search(q='linen', n=2, x=-1.5, on=True, off=False, none=None, tags=["a", 'b'], o={"k": 1})]`,
      ),
    ).toEqual([
      { name: "open_product", arguments: { slug: "trail-cap" } },
      { name: "search", arguments: { q: "linen", n: 2, x: -1.5, on: true, off: false, none: null, tags: ["a", "b"], o: { k: 1 } } },
    ]);
    expect(parsePythonicCalls("get_cart()")).toEqual([{ name: "get_cart", arguments: {} }]);
    expect(parsePythonicCalls('[open_cart(), add(note="a \\"b\\", c")')).toEqual([
      { name: "open_cart", arguments: {} },
      { name: "add", arguments: { note: 'a "b", c' } },
    ]);
  });

  it("returns null for prose or broken calls, never throws", () => {
    expect(parsePythonicCalls("Sure, I'll do that.")).toBeNull();
    expect(parsePythonicCalls('open_product(slug="trail-cap"')).toBeNull();
    expect(parsePythonicCalls("f(x=)")).toBeNull();
    expect(parsePythonicCalls("")).toBeNull();
  });

  it("writes calls back the same way", () => {
    expect(toPythonic("add_to_cart", { slug: "mug", qty: 2, gift: true, note: null })).toBe(
      'add_to_cart(slug="mug", qty=2, gift=True, note=None)',
    );
    const back = parsePythonicCalls(`[${toPythonic("x", { a: [1, "b"], c: { d: false } })}]`);
    expect(back).toEqual([{ name: "x", arguments: { a: [1, "b"], c: { d: false } } }]);
  });

  it("parseToolCalls reads LFM blocks (pythonic or JSON), keeps prose, and flags unknown tools", () => {
    const names = new Set(["open_product", "add_to_cart"]);
    expect(parseToolCalls('I will open it. <|tool_call_start|>[open_product(slug="trail-cap")]<|tool_call_end|>', names)).toEqual({
      text: "I will open it.",
      calls: [{ name: "open_product", arguments: { slug: "trail-cap" } }],
      errors: [],
    });
    expect(parseToolCalls('<|tool_call_start|>[{"name": "add_to_cart", "arguments": {"qty": 1}}]<|tool_call_end|>', names).calls).toEqual([
      { name: "add_to_cart", arguments: { qty: 1 } },
    ]);
    // unterminated, as a model may stop
    expect(parseToolCalls("<|tool_call_start|>[add_to_cart(qty=1)]", names).calls).toHaveLength(1);
    expect(parseToolCalls("<|tool_call_start|>[drop()]<|tool_call_end|>", names).errors[0]).toMatch(/Unknown tool "drop"/);
    expect(parseToolCalls("<|tool_call_start|>not a call<|tool_call_end|>", names).errors[0]).toMatch(/Couldn't read a tool call/);
  });

  it("the prose filter hides LFM call markup as it streams", () => {
    const f = createProseFilter();
    const out =
      ["Opening ", "<|tool_", "call_start|>[open_product(", 'slug="x")]<|tool_call_end|>', " done"].map((d) => f.push(d)).join("") +
      f.flush();
    expect(out).toBe("Opening  done");
  });
});
