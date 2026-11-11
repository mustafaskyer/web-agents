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

describe("ready-to-run samples", () => {
  it("skips a select's empty placeholder option", () => {
    expect(defaultValueFor({ type: "string", enum: ["", "S", "M"] })).toBe("S");
  });
  it("fills email, date and URL fields with a sample; a description example still wins", () => {
    expect(defaultValueFor({ type: "string", format: "email" })).toBe("you@example.com");
    expect(defaultValueFor({ type: "string", format: "email", description: "Email, e.g. mustafa@example.com" })).toBe(
      "mustafa@example.com",
    );
    expect(defaultValueFor({ type: "string", format: "date" })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(defaultValueFor({ type: "string", format: "uri" })).toBe("https://example.com");
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
