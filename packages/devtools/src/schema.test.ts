import { describe, expect, it } from "vitest";
import { isFailure, textOf } from "./execute";
import { parseSchema, typeOf } from "./schema";

describe("parseSchema", () => {
  it.each([
    [
      "a Chrome JSON string",
      '{"type":"object","properties":{"qty":{"type":"integer"}}}',
      { type: "object", properties: { qty: { type: "integer" } } },
    ],
    ["a polyfill object", { type: "object" }, { type: "object" }],
    ["broken JSON", "{nope", {}],
    ["a JSON non-object", "42", {}],
    ["nothing", undefined, {}],
  ])("reads %s", (_, input, expected) => {
    expect(parseSchema(input as string)).toEqual(expected);
  });

  it("infers object and string types", () => {
    expect(typeOf({ properties: {} })).toBe("object");
    expect(typeOf({ enum: ["a"] })).toBe("string");
    expect(typeOf({})).toBeUndefined();
  });
});

describe("isFailure", () => {
  it.each([
    [{ content: [{ type: "text", text: "Added 2" }] }, false],
    [{ content: [{ type: "text", text: "Error: out of stock" }] }, true],
    [{ content: [{ type: "text", text: "nope" }], isError: true }, true],
    [{ content: [] }, false],
  ])("%j → %s", (res, expected) => {
    expect(isFailure(res)).toBe(expected);
    expect(typeof textOf(res)).toBe("string");
  });
});
