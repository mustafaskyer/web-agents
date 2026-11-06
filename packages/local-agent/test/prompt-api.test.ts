import { afterEach, describe, expect, it, vi } from "vitest";
import { actionSchema, createPromptApiProvider } from "../src/providers/prompt-api/provider";

afterEach(() => vi.unstubAllGlobals());

function stubLanguageModel(over: Record<string, unknown> = {}) {
  const sessions: { prompts: unknown[]; destroyed: boolean }[] = [];
  const LM = {
    availability: vi.fn(async () => "available"),
    create: vi.fn(async (opts: { monitor?: (m: EventTarget) => void }) => {
      const monitor = new EventTarget();
      opts.monitor?.(monitor);
      const e = new Event("downloadprogress") as Event & { loaded: number };
      Object.defineProperty(e, "loaded", { value: 0.5 });
      monitor.dispatchEvent(e);
      const session = { prompts: [] as unknown[], destroyed: false };
      sessions.push(session);
      return {
        prompt: async (input: unknown, o: unknown) => {
          session.prompts.push([input, o]);
          return '{"type":"tool_call","name":"add_to_cart","arguments":{"qty":2}}';
        },
        destroy: () => {
          session.destroyed = true;
        },
      };
    }),
    ...over,
  };
  vi.stubGlobal("LanguageModel", LM);
  return { LM, sessions };
}

describe("Prompt API provider", () => {
  it("is unavailable without LanguageModel", async () => {
    expect(await createPromptApiProvider().availability()).toMatchObject({ state: "unavailable" });
  });

  it.each([
    ["available", "available"],
    ["downloadable", "needs-download"],
    ["downloading", "needs-download"], // Chrome's own download: the click follows its progress
    ["unavailable", "unavailable"],
  ])("maps %s to %s", async (value, state) => {
    stubLanguageModel({ availability: async () => value });
    expect((await createPromptApiProvider().availability()).state).toBe(state);
  });

  it("a throwing API reads as unavailable", async () => {
    stubLanguageModel({
      availability: async () => {
        throw new Error("boom");
      },
    });
    expect((await createPromptApiProvider().availability()).state).toBe("unavailable");
  });

  it("prepare forwards download progress", async () => {
    stubLanguageModel();
    const progress: number[] = [];
    await createPromptApiProvider().prepare((p) => progress.push(p));
    expect(progress).toEqual([0.5]);
  });

  it("generates with a JSON constraint naming the tools, and cleans up the session", async () => {
    const { sessions } = stubLanguageModel();
    const result = await createPromptApiProvider().generate({
      system: "sys",
      messages: [{ role: "user", content: "add 2" }],
      tools: [{ name: "add_to_cart", description: "Add", parameters: {} }],
      signal: new AbortController().signal,
    });
    expect(result.text).toContain('"tool_call"');
    const [, options] = sessions[0]!.prompts[0] as [unknown, { responseConstraint: unknown }];
    expect(options.responseConstraint).toEqual(actionSchema(["add_to_cart"]));
    expect(sessions[0]!.destroyed).toBe(true);
  });
});
