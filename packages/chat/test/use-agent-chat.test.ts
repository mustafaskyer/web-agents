import { describe, expect, it } from "vitest";
import { toUIMessages } from "../src/adapter/wire";
import type { AgentMessage } from "../src/types";

const out = (text: string) => ({ content: [{ type: "text", text }] });
const history: AgentMessage[] = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "Buy a mug" }] },
  {
    id: "a1",
    role: "assistant",
    parts: [
      { type: "reasoning", text: "thinking", providerMetadata: { anthropic: { signature: "sig" } } },
      { type: "tool", id: "c1", name: "add_to_cart", input: { qty: 1 }, state: "done", output: out("Added.") },
      { type: "tool", id: "c2", name: "checkout", input: {}, state: "awaiting-confirmation", prompt: "Click Place order" },
      { type: "tool", id: "c3", name: "apply_promo", input: {}, state: "cancelled" },
      { type: "text", text: "Working on it" },
    ],
  },
  { id: "a2", role: "assistant", parts: [] },
];

describe("toUIMessages for rendering", () => {
  it("keeps open calls as input-available, marks streaming text, keeps empty messages", () => {
    const ui = toUIMessages(history, { forRendering: true, streaming: true });
    expect(ui).toHaveLength(3);
    const [, assistant] = ui;
    expect(assistant!.parts).toMatchObject([
      { type: "reasoning", text: "thinking", state: "done" },
      { type: "dynamic-tool", toolCallId: "c1", state: "output-available" },
      { type: "dynamic-tool", toolCallId: "c2", state: "input-available" },
      { type: "dynamic-tool", toolCallId: "c3", state: "output-error", errorText: "Error [cancelled]: Cancelled by the user." },
      { type: "text", text: "Working on it", state: "done" },
    ]);
    // the last part of the last message is the one still streaming; here the last message is empty
    expect(toUIMessages(history.slice(0, 2), { forRendering: true, streaming: true })[1]!.parts.at(-1)).toMatchObject({
      state: "streaming",
    });
    expect(toUIMessages(history.slice(0, 2), { forRendering: true, streaming: false })[1]!.parts.at(-1)).toMatchObject({ state: "done" });
  });

  it("for the model, open calls are interrupted and empty messages dropped (unchanged)", () => {
    const ui = toUIMessages(history);
    expect(ui).toHaveLength(2);
    expect(ui[1]!.parts[2]).toMatchObject({ state: "output-error", errorText: expect.stringContaining("Error [interrupted]") });
  });
});
