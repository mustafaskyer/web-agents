import { afterEach, describe, expect, it, vi } from "vitest";
import { type AgentEvent, emit, onAgentEvent } from "./events";

describe("agent events", () => {
  afterEach(() => vi.restoreAllMocks());

  it("delivers events until unsubscribed", () => {
    const seen: AgentEvent[] = [];
    const off = onAgentEvent((e) => seen.push(e));
    emit({ type: "start", tool: "t", at: 1 });
    off();
    emit({ type: "cancel", tool: "t" });
    expect(seen).toEqual([{ type: "start", tool: "t", at: 1 }]);
  });

  it("keeps delivering when a listener throws", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const seen: string[] = [];
    const offBad = onAgentEvent(() => {
      throw new Error("boom");
    });
    const offGood = onAgentEvent((e) => seen.push(e.type));
    emit({ type: "resume" });
    offBad();
    offGood();
    expect(seen).toEqual(["resume"]);
    expect(error).toHaveBeenCalledOnce();
  });
});
