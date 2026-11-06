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
      const makeSession = (): unknown => {
        const session = { prompts: [] as unknown[], destroyed: false };
        sessions.push(session);
        return {
          clone: async () => makeSession(),
          prompt: async (input: unknown, o: unknown) => {
            session.prompts.push([input, o]);
            return '{"type":"tool_call","name":"add_to_cart","arguments":{"qty":2}}';
          },
          destroy: () => {
            session.destroyed = true;
          },
        };
      };
      return makeSession();
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
    // sessions[0] is the base; the prompt ran in its clone, with the system prompt on the first turn
    const [input, options] = sessions[1]!.prompts[0] as [Array<{ content: string }>, { responseConstraint: unknown }];
    expect(input[0]!.content).toMatch(/^sys\n\n---\n\nadd 2$/);
    expect(options.responseConstraint).toEqual(actionSchema(["add_to_cart"]));
    expect(sessions[1]!.destroyed).toBe(true);
    expect(sessions[0]!.destroyed).toBe(false);
  });

  it("a device that can't start a session marks the provider broken (and unavailable from then on)", async () => {
    stubLanguageModel({
      create: async () => {
        throw new DOMException("The device is unable to create a session to run the model.", "NotSupportedError");
      },
    });
    const provider = createPromptApiProvider();
    const req = { system: "s", messages: [{ role: "user" as const, content: "hi" }], tools: [], signal: new AbortController().signal };
    await expect(provider.generate(req)).rejects.toThrow(/couldn't start on this device\. Switching to the downloadable model\./);
    expect(provider.broken).toBeTruthy();
    expect(await provider.availability()).toMatchObject({ state: "unavailable" });
  });
});
