import { describe, expect, it } from "vitest";
import { defaultValueFor, exampleFrom } from "./defaults";

describe("defaultValueFor", () => {
  it("fills a declarative add_to_cart form with its minimum", () => {
    const schema = { type: "object", properties: { qty: { type: "integer", minimum: 1, description: "How many" } }, required: [] };
    expect(defaultValueFor(schema)).toEqual({ qty: 1 });
  });

  it("takes a sample from the description", () => {
    const schema = { type: "object", properties: { code: { type: "string", description: "Promo code, e.g. 123" } } };
    expect(defaultValueFor(schema)).toEqual({ code: "123" });
  });

  it("recurses into objects; arrays start empty; enums pick the first option", () => {
    const schema = {
      type: "object",
      properties: {
        address: { type: "object", properties: { city: { type: "string" }, express: { type: "boolean" } } },
        tags: { type: "array", items: { type: "string" } },
        size: { type: "string", enum: ["s", "m"] },
        price: { type: "number", minimum: 0.5 },
      },
    };
    expect(defaultValueFor(schema)).toEqual({ address: { city: "", express: true }, tags: [], size: "s", price: 0.5 });
  });

  it("lets `default` win", () => {
    expect(defaultValueFor({ type: "integer", minimum: 1, default: 4 })).toBe(4);
    expect(defaultValueFor({ type: "object", properties: { a: { type: "string" } }, default: { a: "x" } })).toEqual({ a: "x" });
  });

  it("treats nullable types as their non-null type", () => {
    expect(defaultValueFor({ type: ["integer", "null"], minimum: 2 })).toBe(2);
  });
});

describe("exampleFrom", () => {
  it.each([
    ["Optional promo code, e.g. 123", "123"],
    ['City, e.g., "Lisbon"', "Lisbon"],
    ["no sample", ""],
    [undefined, ""],
  ])("%s → %s", (description, expected) => {
    expect(exampleFrom(description)).toBe(expected);
  });
});
