import { describe, expect, it } from "vitest";
import { toAgentInvokeCode, toAgentRunCode, toExecuteToolCode } from "./copy-as-code";

describe("copy as code", () => {
  it("writes an agent.invoke call (toAgentRunCode is its old name)", () => {
    expect(toAgentInvokeCode("add_to_cart_mug-01", { qty: 3 })).toMatchInlineSnapshot(`
      "await agent.invoke("add_to_cart_mug-01", {
        "qty": 3
      });"
    `);
    expect(toAgentRunCode).toBe(toAgentInvokeCode);
  });

  it("writes a modelContext.executeTool call", () => {
    expect(toExecuteToolCode("apply_promo", { code: "123" })).toMatchInlineSnapshot(`
      "const tool = (await document.modelContext.getTools()).find((t) => t.name === "apply_promo");
      await document.modelContext.executeTool(tool, {
        "code": "123"
      });"
    `);
  });
});
