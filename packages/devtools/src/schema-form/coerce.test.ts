import { describe, expect, it } from "vitest";
import { coerce } from "./coerce";

describe("coerce", () => {
  it.each([
    [{ type: "integer" }, "3", 3],
    [{ type: "integer" }, "", undefined],
    [{ type: "number" }, "2.5", 2.5],
    [{ type: "number" }, "abc", "abc"],
    [{ type: "string" }, "3", "3"],
    [{ type: "string" }, "", undefined],
    [{}, "x", "x"],
  ])("%j %j → %j", (schema, raw, expected) => {
    expect(coerce(schema, raw)).toBe(expected);
  });
});
