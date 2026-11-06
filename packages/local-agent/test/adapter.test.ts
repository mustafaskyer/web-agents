import type { AdapterStatus, AgentStreamPart } from "@web-agents/chat";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalAdapter } from "../src/index";
import type { LocalProvider, ProviderAvailability } from "../src/types";

beforeEach(() => vi.stubGlobal("window", {}));
afterEach(() => vi.unstubAllGlobals());

function provider(id: string, availability: ProviderAvailability, over: Partial<LocalProvider> = {}): LocalProvider {
  return {
    id,
    label: id,
    availability: async () => availability,
    prepare: async (onProgress) => {
      onProgress(0.5);
      onProgress(1);
    },
    generate: async () => ({ text: "Hi from the device." }),
    ...over,
  };
}

/** Wait for the adapter to settle its status. */
async function settled(adapter: ReturnType<typeof createLocalAdapter>): Promise<AdapterStatus> {
  adapter.status!();
  for (let i = 0; i < 20 && adapter.status!().state === "loading"; i++) await new Promise((r) => setTimeout(r, 0));
  return adapter.status!();
}

describe("createLocalAdapter", () => {
  it("picks the first available provider, else the first that can download, else explains", async () => {
    const ready = createLocalAdapter({
      providers: [provider("a", { state: "needs-download", bytes: 5 }), provider("b", { state: "available" })],
    });
    expect(await settled(ready)).toEqual({ state: "ready" });
    const download = createLocalAdapter({
      providers: [provider("a", { state: "unavailable", reason: "no" }), provider("b", { state: "needs-download", bytes: 9 })],
    });
    expect(await settled(download)).toEqual({ state: "needs-download", bytes: 9, note: undefined });
    const none = createLocalAdapter({ providers: [provider("a", { state: "unavailable", reason: "No WebGPU." })] });
    expect(await settled(none)).toEqual({ state: "unavailable", reason: "No WebGPU." });
  });

  it("prepare reports progress to subscribers and ends ready; then run answers", async () => {
    const adapter = createLocalAdapter({ providers: [provider("t", { state: "needs-download", bytes: 9 })] });
    await settled(adapter);
    const seen: AdapterStatus[] = [];
    adapter.subscribe!(() => seen.push(adapter.status!()));
    await adapter.prepare!();
    expect(seen).toEqual([
      { state: "downloading", progress: 0 },
      { state: "downloading", progress: 0.5 },
      { state: "downloading", progress: 1 },
      { state: "ready" },
    ]);
    const parts: AgentStreamPart[] = [];
    const req = {
      messages: [{ id: "u", role: "user" as const, parts: [{ type: "text" as const, text: "hi" }] }],
      tools: [],
      signal: new AbortController().signal,
      callTool: vi.fn(),
    };
    for await (const p of adapter.run(req)) parts.push(p);
    expect(parts.find((p) => p.type === "text-delta")).toMatchObject({ delta: "Hi from the device." });
  });

  it("a cancelled download goes back to needs-download; a failed one is an error", async () => {
    const cancelling = createLocalAdapter({
      providers: [
        provider(
          "t",
          { state: "needs-download", bytes: 9 },
          {
            prepare: (_p, signal) =>
              new Promise((_, reject) => signal?.addEventListener("abort", () => reject(new DOMException("x", "AbortError")))),
          },
        ),
      ],
    });
    await settled(cancelling);
    const ctrl = new AbortController();
    const pending = cancelling.prepare!(ctrl.signal);
    ctrl.abort();
    await pending;
    expect(cancelling.status!()).toEqual({ state: "needs-download", bytes: 9, note: undefined });

    const failing = createLocalAdapter({
      providers: [
        provider(
          "t",
          { state: "needs-download" },
          {
            prepare: async () => {
              throw new Error("Quota exceeded");
            },
          },
        ),
      ],
    });
    await settled(failing);
    await expect(failing.prepare!()).rejects.toThrow("Quota exceeded");
    expect(failing.status!()).toEqual({ state: "error", error: "The model couldn't load: Quota exceeded" });
  });

  it("a prepare that had nothing to do doesn't block the next one", async () => {
    let calls = 0;
    const adapter = createLocalAdapter({
      providers: [
        provider(
          "t",
          { state: "needs-download" },
          {
            prepare: async () => {
              calls++;
            },
          },
        ),
      ],
    });
    await settled(adapter);
    const aborted = new AbortController();
    aborted.abort();
    await adapter.prepare!(aborted.signal); // returns early
    await adapter.prepare!();
    expect(calls).toBe(1);
    expect(adapter.status!()).toEqual({ state: "ready" });
  });

  it("a provider that turns out broken hands over to the next one", async () => {
    let brokenReason: string | undefined;
    const flaky: LocalProvider = {
      ...provider("chrome", { state: "available" }),
      get broken() {
        return brokenReason;
      },
      generate: async () => {
        brokenReason = "Chrome's model couldn't start.";
        throw new Error("Chrome's model couldn't start. Switching to the downloadable model.");
      },
    };
    const adapter = createLocalAdapter({ providers: [flaky, provider("transformers", { state: "needs-download", bytes: 5 })] });
    expect(await settled(adapter)).toEqual({ state: "ready" });
    const parts: AgentStreamPart[] = [];
    const req = {
      messages: [{ id: "u", role: "user" as const, parts: [{ type: "text" as const, text: "hi" }] }],
      tools: [],
      signal: new AbortController().signal,
      callTool: vi.fn(),
    };
    for await (const p of adapter.run(req)) parts.push(p);
    expect(parts.at(-1)).toMatchObject({ type: "error", error: expect.stringMatching(/Switching to the downloadable model/) });
    expect(await settled(adapter)).toEqual({ state: "needs-download", bytes: 5, note: undefined });
  });

  it("run before ready is an error part, not a throw", async () => {
    const adapter = createLocalAdapter({ providers: [provider("t", { state: "needs-download" })] });
    await settled(adapter);
    const parts: AgentStreamPart[] = [];
    for await (const p of adapter.run({ messages: [], tools: [], signal: new AbortController().signal, callTool: vi.fn() })) parts.push(p);
    expect(parts).toEqual([{ type: "error", error: "The on-device model isn't ready: download it first." }]);
  });
});
