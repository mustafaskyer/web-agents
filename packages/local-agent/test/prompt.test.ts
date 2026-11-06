import { describe, expect, it } from "vitest";
import { buildLocalSystemPrompt } from "../src/prompt";
import type { CompactTool } from "../src/types";

const search: CompactTool = {
  name: "search_products",
  description: "Search the store's products.",
  parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
};

describe("buildLocalSystemPrompt", () => {
  it("says what the page is and what its tools do, in plain words, on the chat-template path", () => {
    const prompt = buildLocalSystemPrompt({ path: "/", page: { title: "Field Store", heading: "Everyday goods" }, tools: [search] });
    expect(prompt).toContain('The user is on the page "Field Store", showing "Everyday goods", at /.');
    expect(prompt).toContain("Tools on this page:\n- search_products: Search the store's products.");
    expect(prompt).toContain('<tool_call>{"name":"search_products","arguments":{"query":"…"}}</tool_call>');
    expect(prompt).not.toContain("Arguments: {");
  });

  it("lists schemas once on the inline (JSON) path", () => {
    const prompt = buildLocalSystemPrompt({ tools: [search], toolsInline: [search] });
    expect(prompt).toContain('- search_products: Search the store\'s products. Arguments: {"type":"object"');
    expect(prompt).not.toContain("Tools on this page:");
  });

  it("says when there's nothing to call", () => {
    expect(buildLocalSystemPrompt({ tools: [] })).toContain("This page has no tools right now");
  });

  it("adds the site's own instructions, and the step-by-step method", () => {
    const prompt = buildLocalSystemPrompt({ tools: [search], instructions: "  To buy: search, open_product, add_to_cart.  " });
    expect(prompt).toContain("About this site:\nTo buy: search, open_product, add_to_cart.");
    expect(prompt).toContain('search with the key word only ("bag", not "I want a beautiful bag")');
    expect(buildLocalSystemPrompt({ tools: [search] })).not.toContain("About this site");
  });
});
