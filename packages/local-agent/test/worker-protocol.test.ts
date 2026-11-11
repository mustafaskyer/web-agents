import { describe, expect, it } from "vitest";
import { type PipelineKit, TransformersEngine } from "../src/providers/transformers/engine";
import { handleMessage } from "../src/providers/transformers/handle-message";
import type { FromWorker } from "../src/providers/transformers/protocol";

/** A fake transformers.js: progress on load, then a generator that streams words. */
function kit(words = ["Hello", " world"], { failLoad = false, slow = false } = {}): () => Promise<PipelineKit> {
  return async () => ({
    async createPipeline(_model, { progress_callback }) {
      if (failLoad) throw new Error("No network");
      progress_callback({ status: "progress_total", loaded: 50, total: 100 });
      progress_callback({ status: "progress_total", loaded: 100, total: 100 });
      const generator = Object.assign(
        async (_messages: unknown, options: Record<string, unknown>) => {
          const streamer = options.streamer as { onText(t: string): void };
          const stopper = options.stopping_criteria as { interrupted: boolean };
          for (const w of words) {
            if (stopper.interrupted) break;
            if (slow) await new Promise((r) => setTimeout(r, 20));
            streamer.onText(w);
          }
          return [{ generated_text: [{ role: "assistant", content: words.join("") }] }];
        },
        { tokenizer: {} },
      );
      return generator;
    },
    createStreamer: (_t, onText) => ({ onText }),
    createStopper: () => {
      const s = { interrupted: false, interrupt: () => (s.interrupted = true), reset: () => (s.interrupted = false) };
      return s;
    },
  });
}

/** The fake kit, plus a cache answer. */
function kitWithCache(cached: boolean): () => Promise<PipelineKit> {
  const base = kit();
  return async () => ({ ...(await base()), isPipelineCached: async () => cached });
}

const collect = () => {
  const out: FromWorker[] = [];
  return { out, post: (m: FromWorker) => out.push(m) };
};
const req = { system: "s", messages: [{ role: "user" as const, content: "hi" }], tools: [] };

describe("worker protocol", () => {
  it("answers cached? from the kit's cache check, and false when the kit has none or fails", async () => {
    const { out, post } = collect();
    await handleMessage(
      new TransformersEngine(kitWithCache(true)),
      { id: 7, type: "cached?", model: "m", dtype: "q4", device: "wasm" },
      post,
    );
    expect(out).toEqual([{ id: 7, type: "cached", value: true }]);
    out.length = 0;
    await handleMessage(new TransformersEngine(kit()), { id: 8, type: "cached?", model: "m", dtype: "q4", device: "wasm" }, post);
    expect(out).toEqual([{ id: 8, type: "cached", value: false }]);
    out.length = 0;
    const failing = new TransformersEngine(async () => ({
      ...(await kit()()),
      isPipelineCached: async () => Promise.reject(new Error("offline")),
    }));
    await handleMessage(failing, { id: 9, type: "cached?", model: "m", dtype: "q4", device: "wasm" }, post);
    expect(out).toEqual([{ id: 9, type: "cached", value: false }]);
  });

  it("init posts progress then ready; generate posts tokens then done", async () => {
    const engine = new TransformersEngine(kit());
    const { out, post } = collect();
    await handleMessage(engine, { id: 1, type: "init", model: "m", dtype: "q4", device: "wasm" }, post);
    expect(out).toEqual([
      { id: 1, type: "progress", progress: 0.5 },
      { id: 1, type: "progress", progress: 1 },
      { id: 1, type: "ready", device: "wasm" },
    ]);
    out.length = 0;
    await handleMessage(engine, { id: 2, type: "generate", req }, post);
    expect(out).toEqual([
      { id: 2, type: "token", delta: "Hello" },
      { id: 2, type: "token", delta: " world" },
      { id: 2, type: "done", result: { text: "Hello world" } },
    ]);
  });

  it("progress: the further of the running total and the per-file sum (over the known size), never backwards", async () => {
    const files = async (): Promise<PipelineKit> => ({
      ...(await kit()()),
      async createPipeline(_m, { progress_callback }) {
        progress_callback({ status: "progress_total", loaded: 25, total: 100 }); // then stalls
        progress_callback({ status: "progress", file: "a", loaded: 50, total: 50 });
        progress_callback({ status: "progress", file: "b", loaded: 10, total: 50 }); // 60%
        progress_callback({ status: "progress", file: "b", loaded: 50, total: 50 }); // 100%
        return (await kit()()).createPipeline("m", { device: "wasm", dtype: "q4", progress_callback() {} });
      },
    });
    const { out, post } = collect();
    await handleMessage(new TransformersEngine(files), { id: 1, type: "init", model: "m", dtype: "q4", device: "wasm", bytes: 100 }, post);
    // 25% (total, then stalls) → a: 50/100 → b: 60/100 → b done: 100/100
    expect(out.filter((m) => m.type === "progress").map((m) => (m as { progress: number }).progress)).toEqual([0.25, 0.5, 0.6, 1]);
  });

  it("abort mid-generate stops tokens and answers an AbortError", async () => {
    const engine = new TransformersEngine(kit(["a", "b", "c", "d"], { slow: true }));
    await handleMessage(engine, { id: 1, type: "init", model: "m", dtype: "q4", device: "wasm" }, () => {});
    const { out, post } = collect();
    const running = handleMessage(engine, { id: 2, type: "generate", req }, post);
    await new Promise((r) => setTimeout(r, 30));
    await handleMessage(engine, { id: 3, type: "abort" }, post);
    await running;
    expect(out.filter((m) => m.type === "token").length).toBeLessThan(4);
    expect(out.at(-1)).toMatchObject({ id: 2, type: "error", name: "AbortError" });
  });

  it("a new generation waits for an interrupted one to wind down", async () => {
    const engine = new TransformersEngine(kit(["a", "b", "c", "d"], { slow: true }));
    await handleMessage(engine, { id: 1, type: "init", model: "m", dtype: "q4", device: "wasm" }, () => {});
    const { out, post } = collect();
    const first = handleMessage(engine, { id: 2, type: "generate", req }, post);
    await new Promise((r) => setTimeout(r, 30));
    await handleMessage(engine, { id: 3, type: "abort" }, post);
    const second = handleMessage(engine, { id: 4, type: "generate", req }, post);
    await Promise.all([first, second]);
    expect(out.find((m) => m.id === 2 && m.type !== "token")).toMatchObject({ type: "error", name: "AbortError" });
    // the second ran after the first ended: all its tokens, none interleaved with the first's
    const ids = out.filter((m) => m.type === "token").map((m) => m.id);
    expect(ids.lastIndexOf(2)).toBeLessThan(ids.indexOf(4));
    expect(out.at(-1)).toEqual({ id: 4, type: "done", result: { text: "abcd" } });
  });

  it("errors: a failing load, generating before init, an unknown message", async () => {
    const { out, post } = collect();
    await handleMessage(
      new TransformersEngine(kit([], { failLoad: true })),
      { id: 1, type: "init", model: "m", dtype: "q4", device: "wasm" },
      post,
    );
    await handleMessage(new TransformersEngine(kit()), { id: 2, type: "generate", req }, post);
    await handleMessage(new TransformersEngine(kit()), { id: 3, type: "nope" } as never, post);
    expect(out).toEqual([
      { id: 1, type: "error", error: "No network", name: "Error" },
      { id: 2, type: "error", error: "The model isn't loaded: send init first.", name: "Error" },
      { id: 3, type: "error", error: 'Unknown message type "nope"' },
    ]);
  });
});
