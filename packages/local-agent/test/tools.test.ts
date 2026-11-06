import type { ToolDescriptor } from "@web-agents/chat";
import { describe, expect, it } from "vitest";
import { compactSchema, rankTools, validateArgs } from "../src/tools";

const tool = (name: string, description = name): ToolDescriptor => ({ name, description, inputSchema: { type: "object", properties: {} } });

describe("compactSchema", () => {
  it("keeps only what small models need", () => {
    const out = compactSchema({
      $schema: "x",
      $id: "y",
      title: "T",
      additionalProperties: false,
      type: "object",
      required: ["qty"],
      properties: { qty: { type: "integer", minimum: 1, maximum: 9, description: "d".repeat(200), examples: [1] } },
    });
    expect(out).toEqual({
      type: "object",
      required: ["qty"],
      properties: { qty: { type: "integer", minimum: 1, maximum: 9, description: `${"d".repeat(79)}…` } },
    });
  });
});

describe("rankTools", () => {
  it("keeps every tool, in order, when there are few", () => {
    expect(rankTools([tool("b"), tool("a")], "anything").map((t) => t.name)).toEqual(["b", "a"]);
  });

  it("puts the matching tool first and caps the list", () => {
    const tools = [
      ...Array.from({ length: 9 }, (_, i) => tool(`noise_${i}`, "Unrelated thing")),
      tool("add_to_cart_tee-02", "Add Logo tee to the cart"),
    ];
    const ranked = rankTools(tools, "add a tee", { max: 8 });
    expect(ranked).toHaveLength(8);
    expect(ranked[0]!.name).toBe("add_to_cart_tee-02");
  });
});

describe("validateArgs", () => {
  const schema = {
    type: "object",
    required: ["qty", "size"],
    properties: { qty: { type: "integer", minimum: 1, maximum: 5 }, size: { type: "string", enum: ["S", "M"] } },
  };
  it("passes good arguments and names the first problem otherwise", () => {
    expect(validateArgs(schema, { qty: 2, size: "M" })).toBeNull();
    expect(validateArgs(schema, { size: "M" })).toBe('Missing required argument "qty".');
    expect(validateArgs(schema, { qty: 2, size: "XL" })).toBe('"size" must be one of "S", "M".');
    expect(validateArgs(schema, { qty: 1.5, size: "M" })).toBe('"qty" must be integer, got 1.5.');
    expect(validateArgs(schema, { qty: 9, size: "M" })).toBe('"qty" must be at most 5.');
    expect(validateArgs(schema, "nope")).toBe("Arguments must be a JSON object.");
  });
});
