import { describe, expect, it } from "vitest";
import {
  DELEGATE_PREFIX,
  defineWebAgent,
  delegateTool,
  delegateToolName,
  flattenWebAgents,
  isDelegateTool,
  selectTools,
} from "../src/agent";
import type { ToolDescriptor } from "../src/types";

const t = (name: string): ToolDescriptor => ({ name, description: `${name} does things`, inputSchema: { type: "object", properties: {} } });
const page = [t("search_products"), t("open_product"), t("add_to_cart"), t("get_cart"), t("apply_promo"), t("checkout")];

describe("defineWebAgent", () => {
  it("normalizes instructions to lines, freezes, and keeps the config", () => {
    const agent = defineWebAgent({
      id: "shopper",
      instructions: "  Find things.  ",
      tools: ["get_cart"],
      model: "openai/gpt-5.5",
      maxSteps: 4,
    });
    expect(agent).toMatchObject({
      id: "shopper",
      instructions: ["Find things."],
      tools: ["get_cart"],
      model: "openai/gpt-5.5",
      maxSteps: 4,
      agents: [],
    });
    expect(Object.isFrozen(agent)).toBe(true);
    expect(Object.isFrozen(agent.instructions)).toBe(true);
    expect(defineWebAgent({ id: "a", instructions: ["one", " ", "two"] }).instructions).toEqual(["one", "two"]);
  });

  it.each([
    ["a bad id", { id: "bad id", instructions: "x" }, /WebAgent id "bad id" is invalid/],
    ["a long id", { id: "a".repeat(65), instructions: "x" }, /is invalid/],
    ["empty instructions", { id: "a", instructions: ["  "] }, /needs instructions/],
    ["a fractional maxSteps", { id: "a", instructions: "x", maxSteps: 1.5 }, /positive integer/],
    ["a zero maxSteps", { id: "a", instructions: "x", maxSteps: 0 }, /positive integer/],
    ["a non-list tools", { id: "a", instructions: "x", tools: "get_cart" as never }, /list of tool ids or a function/],
    ["a sub-agent that isn't one", { id: "a", instructions: "x", agents: [{ id: "b" }] as never }, /must come from defineWebAgent/],
  ])("throws a TypeError for %s", (_, config, message) => {
    expect(() => defineWebAgent(config as never)).toThrow(TypeError);
    expect(() => defineWebAgent(config as never)).toThrow(message);
  });

  it("rejects duplicate ids anywhere in the tree", () => {
    const helper = defineWebAgent({ id: "helper", instructions: "h" });
    expect(() => defineWebAgent({ id: "helper", instructions: "p", agents: [helper] })).toThrow(/"helper" is used twice/);
    const deep = defineWebAgent({ id: "mid", instructions: "m", agents: [helper] });
    expect(() => flattenWebAgents([helper, deep])).toThrow(/used twice/);
  });
});

describe("flattenWebAgents", () => {
  it("lists every agent and sub-agent by id", () => {
    const checkout = defineWebAgent({ id: "checkout", instructions: "c" });
    const shopper = defineWebAgent({ id: "shopper", instructions: "s", agents: [checkout] });
    expect([...flattenWebAgents([shopper]).keys()]).toEqual(["shopper", "checkout"]);
  });
});

describe("delegate tools", () => {
  const checkout = defineWebAgent({
    id: "checkout",
    description: "Finishes a purchase.",
    instructions: "c",
    tools: ["get_cart", "checkout"],
  });

  it("names and recognizes them", () => {
    expect(delegateToolName("checkout")).toBe("delegate_to_checkout");
    expect(isDelegateTool(`${DELEGATE_PREFIX}x`)).toBe(true);
    expect(isDelegateTool("checkout")).toBe(false);
  });

  it("describes the sub-agent for the parent: its purpose, its tools, a required task", () => {
    const tool = delegateTool(checkout);
    expect(tool.name).toBe("delegate_to_checkout");
    expect(tool.description).toContain("Finishes a purchase.");
    expect(tool.description).toContain("Its tools: get_cart, checkout.");
    expect(tool.inputSchema).toMatchObject({ type: "object", required: ["task"] });
    expect(delegateTool(defineWebAgent({ id: "helper", instructions: "h" })).description).toContain("Hand a task to the helper agent.");
  });
});

describe("selectTools", () => {
  const checkout = defineWebAgent({ id: "checkout", instructions: "c", tools: ["get_cart", "apply_promo", "checkout", "not_on_page"] });

  it("returns the page's tools as they are without an agent, minus stray delegates", () => {
    expect(selectTools(undefined, [...page, t("delegate_to_x")])).toEqual(page);
  });

  it("applies a list (page order kept, missing ids ignored) or a function", () => {
    expect(selectTools(checkout, page).map((x) => x.name)).toEqual(["get_cart", "apply_promo", "checkout"]);
    const fn = defineWebAgent({ id: "f", instructions: "f", tools: (tools) => tools.filter((x) => x.name.startsWith("add")) });
    expect(selectTools(fn, page).map((x) => x.name)).toEqual(["add_to_cart"]);
  });

  it("appends a delegate tool per sub-agent, and the delegate wins a name clash", () => {
    const shopper = defineWebAgent({
      id: "shopper",
      instructions: "s",
      tools: (tools) => tools.filter((x) => x.name !== "checkout"),
      agents: [checkout],
    });
    const names = selectTools(shopper, [...page, { ...t("delegate_to_checkout"), description: "impostor" }]).map((x) => x.name);
    expect(names).toEqual(["search_products", "open_product", "add_to_cart", "get_cart", "apply_promo", "delegate_to_checkout"]);
    expect(selectTools(shopper, page).at(-1)?.description).not.toContain("impostor");
  });
});
